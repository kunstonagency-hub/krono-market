import React, { useState, useEffect } from 'react';
import { Store, Package, Bell, Settings, LogOut, Check, XCircle, Image as ImageIcon, Trash2, Plus, Edit2, Tag, Percent, Phone, MessageCircle, Clock, CheckCircle, Power } from 'lucide-react';
import { supabase } from '../supabase';

export default function MerchantPortalView() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [store, setStore] = useState(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('products'); // 'orders', 'products', 'settings'
  
  // Datos
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // ==========================================
  // ESTADOS DEL FORMULARIO DE PRODUCTOS / MENÚ
  // ==========================================
  const [editingProd, setEditingProd] = useState(null);
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('Hamburguesas');
  
  // Modificador de Oferta
  const [isPromoActive, setIsPromoActive] = useState(false);
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodDiscountPercent, setProdDiscountPercent] = useState('');

  // Ingredientes Base ("Con todo")
  const [prodModifiers, setProdModifiers] = useState(['Cebolla', 'Papa', 'Queso', 'Salsas']);
  const [newModText, setNewModText] = useState('');

  // Extras / Adicionales con Precio
  const [prodExtras, setProdExtras] = useState([]); // [{ name: 'Huevo', price: 1.0 }]
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('');

  // Imagen
  const [prodImage, setProdImage] = useState(null);
  const [prodImagePreview, setProdImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Estados de configuración de tienda
  const [storeIsOpen, setStoreIsOpen] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Logo del comercio
  const [storeLogoPreview, setStoreLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = React.useRef(null);

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file || !store) return;
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `store_logo_${store.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      const newLogoUrl = data.publicUrl;

      const { error: dbError } = await supabase.from('stores').update({ image_url: newLogoUrl }).eq('id', store.id);
      if (dbError) throw dbError;

      setStore(prev => ({ ...prev, image_url: newLogoUrl }));
      setStoreLogoPreview(newLogoUrl);
      alert("¡Logo del comercio actualizado con éxito!");
    } catch(err) {
      alert("Error subiendo logo: " + err.message);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  // 1. Verificar sesión activa
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadMerchantData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadMerchantData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Cargar datos del comercio, productos y pedidos
  const loadMerchantData = async (userId) => {
    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (prof) setProfile(prof);

      if (prof?.store_id) {
        const { data: st } = await supabase.from('stores').select('*').eq('id', prof.store_id).single();
        if (st) {
          setStore(st);
          setStoreIsOpen(st.krono_enabled && st.is_active);
          setStoreLogoPreview(st.image_url || null);
        }

        // Cargar productos del menú
        const { data: prods } = await supabase.from('products').select('*').eq('store_id', prof.store_id).order('id', { ascending: false });
        if (prods) setProducts(prods);

        // Cargar pedidos activos
        const { data: ords } = await supabase.from('orders').select('*').eq('store_id', prof.store_id).not('status', 'in', '("Entregado","Rechazado")').order('created_at', { ascending: false });
        if (ords) setOrders(ords);

        // WebSockets en tiempo real para pedidos nuevos
        supabase.channel(`merchant-portal-${prof.store_id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${prof.store_id}` }, (payload) => {
            if (payload.eventType === 'INSERT') {
              setOrders(prev => [payload.new, ...prev]);
              try { new Audio('https://upload.wikimedia.org/wikipedia/commons/3/34/Sound_Effect_-_Door_Bell.ogg').play(); } catch(e){}
            } else if (payload.eventType === 'UPDATE') {
              setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
            }
          }).subscribe();
      }
    } catch (err) {
      console.log("Error cargando datos:", err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Credenciales incorrectas: " + error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setStore(null); setProfile(null); setOrders([]); setProducts([]);
  };

  // =========================================================================
  // GESTIÓN DE PEDIDOS: CAMBIAR ESTATUS Y DISPARAR ALERTA A LOS MOTORIZADOS
  // =========================================================================
  const handleUpdateOrderStatus = async (order, newStatus) => {
    try {
      // 1. Actualizar estatus del pedido en la tabla orders
      const { error: ordErr } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (ordErr) throw ordErr;

      // 2. CUANDO EL COMERCIO KRONO ACEPTA EL PEDIDO (PREPARANDO): Llamar al motorizado de inmediato
      if (newStatus === 'Preparando') {
        const { data: freshOrder } = await supabase
          .from('orders')
          .select('delivery_pin, customer_info, store_id')
          .eq('id', order.id)
          .single();

        const realDeliveryPin = freshOrder?.delivery_pin || order?.delivery_pin || '1234';

        const pLat = parseFloat(store?.lat) || 10.3755;
        const pLng = parseFloat(store?.lng) || -66.9587;
        const dropoffCoords = order.customer_info?.coordenadas || { lat: 10.3700, lng: -66.9600 };
        const customerFullName = `${order.customer_info?.nombre || ''} ${order.customer_info?.apellido || ''}`.trim() || 'Cliente Krono';

        const { error: riderErr } = await supabase
          .from('krono_deliveries')
          .insert([{
            order_id: order.id,
            store_id: store.id,
            pickup_name: store.name,
            pickup_address: store.address || 'Local del comercio',
            pickup_lat: pLat,
            pickup_lng: pLng,
            customer_name: customerFullName,
            customer_phone: order.customer_info?.telefono || '',
            customer_address: order.customer_info?.direccion || 'Dirección de entrega',
            dropoff_lat: parseFloat(dropoffCoords.lat) || 10.3700,
            dropoff_lng: parseFloat(dropoffCoords.lng) || -66.9600,
            delivery_pin: realDeliveryPin,
            delivery_fee: 3.00,
            status: 'buscando_motorizado' // ¡ESTO ENCIENDE EL RADAR EN EL RIDER!
          }]);

        if (riderErr) {
          console.error("Error alertando al rider:", riderErr);
          alert("Aviso motorizado: " + riderErr.message);
        } else {
          alert(`¡Pedido aceptado! Se ha llamado al motorizado con éxito (PIN: ${realDeliveryPin})`);
        }
      }

      // 3. Actualizar lista local de pedidos
      if (newStatus === 'Rechazado') {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
      }

    } catch (err) {
      alert("Error actualizando pedido: " + err.message);
    }
  };

  // ==========================================
  // MANEJADORES DE INGREDIENTES Y EXTRAS
  // ==========================================
  const addModifierTag = () => {
    if (!newModText.trim()) return;
    if (prodModifiers.includes(newModText.trim())) return;
    setProdModifiers([...prodModifiers, newModText.trim()]);
    setNewModText('');
  };

  const removeModifierTag = (tag) => {
    setProdModifiers(prodModifiers.filter(m => m !== tag));
  };

  const addExtraTag = () => {
    if (!newExtraName.trim() || !newExtraPrice) return;
    const p = parseFloat(newExtraPrice);
    if (isNaN(p) || p <= 0) return alert("Ingresa un precio válido para el adicional");

    setProdExtras([...prodExtras, { name: newExtraName.trim(), price: p }]);
    setNewExtraName('');
    setNewExtraPrice('');
  };

  const removeExtraTag = (extraName) => {
    setProdExtras(prodExtras.filter(e => e.name !== extraName));
  };

  const handleOriginalPriceChange = (val) => {
    setProdOriginalPrice(val);
    const orig = parseFloat(val);
    const current = parseFloat(prodPrice);
    if (orig > current && current > 0) {
      const discount = Math.round(((orig - current) / orig) * 100);
      setProdDiscountPercent(discount.toString());
    }
  };

  const handleDiscountPercentChange = (val) => {
    setProdDiscountPercent(val);
    const disc = parseFloat(val);
    const current = parseFloat(prodPrice);
    if (disc > 0 && disc < 100 && current > 0) {
      const orig = (current / (1 - (disc / 100))).toFixed(2);
      setProdOriginalPrice(orig);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProdImage(file);
      setProdImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async () => {
    if (!prodImage) return null;
    const fileExt = prodImage.name.split('.').pop();
    const fileName = `krono_menu_${store.id}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, prodImage);
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !store) return;
    setIsUploading(true);

    try {
      let imageUrl = prodImagePreview;
      if (prodImage) {
        imageUrl = await uploadImage();
      }

      const payload = {
        store_id: store.id,
        name: prodName.trim(),
        description: prodDescription.trim(),
        price: parseFloat(prodPrice),
        category: prodCategory.trim() || 'General',
        image_url: imageUrl,
        show_in_krono: true,
        stock: 999,
        modifiers: prodModifiers.join(', '),
        extras: prodExtras,
        original_price: (isPromoActive && prodOriginalPrice) ? parseFloat(prodOriginalPrice) : null,
        discount_percent: (isPromoActive && prodDiscountPercent) ? parseFloat(prodDiscountPercent) : 0,
        krono_preferential_price: (isPromoActive && prodOriginalPrice) ? parseFloat(prodPrice) : null
      };

      if (editingProd) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProd.id);
        if (error) throw error;
        alert("¡Platillo actualizado exitosamente!");
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        alert("¡Platillo agregado al menú!");
      }

      const { data } = await supabase.from('products').select('*').eq('store_id', store.id).order('id', { ascending: false });
      setProducts(data || []);
      resetProdForm();
    } catch (err) {
      alert("Error guardando platillo: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const startEditProduct = (prod) => {
    setEditingProd(prod);
    setProdName(prod.name || '');
    setProdDescription(prod.description || '');
    setProdPrice(prod.price ? prod.price.toString() : '');
    setProdCategory(prod.category || 'General');
    setProdImagePreview(prod.image_url || null);
    setProdImage(null);

    if (prod.original_price || prod.krono_preferential_price) {
      setIsPromoActive(true);
      setProdOriginalPrice(prod.original_price ? prod.original_price.toString() : '');
      setProdDiscountPercent(prod.discount_percent ? prod.discount_percent.toString() : '');
    } else {
      setIsPromoActive(false);
      setProdOriginalPrice('');
      setProdDiscountPercent('');
    }

    if (prod.modifiers) {
      const arr = typeof prod.modifiers === 'string' ? prod.modifiers.split(',').map(s => s.trim()).filter(Boolean) : prod.modifiers;
      setProdModifiers(arr);
    } else {
      setProdModifiers(['Cebolla', 'Papa', 'Queso', 'Salsas']);
    }

    if (prod.extras) {
      try {
        setProdExtras(typeof prod.extras === 'string' ? JSON.parse(prod.extras) : prod.extras);
      } catch(e) { setProdExtras([]); }
    } else {
      setProdExtras([]);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetProdForm = () => {
    setEditingProd(null);
    setProdName('');
    setProdDescription('');
    setProdPrice('');
    setProdCategory('Hamburguesas');
    setProdImage(null);
    setProdImagePreview(null);
    setIsPromoActive(false);
    setProdOriginalPrice('');
    setProdDiscountPercent('');
    setProdModifiers(['Cebolla', 'Papa', 'Queso', 'Salsas']);
    setProdExtras([]);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este platillo del menú?")) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts(products.filter(p => p.id !== id));
  };

  const handleToggleStoreOpen = async () => {
    setSavingSettings(true);
    const nextStatus = !storeIsOpen;
    try {
      const { error } = await supabase.from('stores').update({ 
        krono_enabled: nextStatus,
        is_active: nextStatus 
      }).eq('id', store.id);
      if (error) throw error;
      setStoreIsOpen(nextStatus);
      alert(nextStatus ? "¡Tienda ABIERTA! Ya estás visible para recibir pedidos." : "Tienda CERRADA temporalmente en Krono Market.");
    } catch(err) {
      alert("Error cambiando estado de tienda: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // ==========================================
  // VISTA: LOGIN
  // ==========================================
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1d', padding: '20px' }}>
        <div style={{ background: '#fff', padding: '40px 32px', borderRadius: '16px', width: '100%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
          <div style={{ width: '64px', height: '64px', background: '#10b981', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff' }}>
            <Store size={36} />
          </div>
          <h2 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: '900', fontSize: '24px' }}>Krono.Merchant</h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '28px' }}>Portal de Autogestión de Restaurantes</p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input type="email" placeholder="Correo del comercio" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
              {loading ? 'Entrando al portal...' : 'Iniciar Sesión'}
            </button>
          </form>
          <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <a href="/registro-comercio" style={{ color: '#10b981', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>¿No tienes cuenta? Registra tu comercio aquí</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '260px', background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', padding: '24px 0', borderRight: '1px solid #1e293b' }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <span style={{ fontSize: '10px', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '800', letterSpacing: '1px' }}>PORTAL COMERCIO</span>
          <h2 style={{ margin: '8px 0 2px 0', fontSize: '20px', fontWeight: '900', color: '#fff' }}>Krono.Merchant</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store?.name}</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 12px' }}>
          <button onClick={() => setActiveTab('orders')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeTab === 'orders' ? '#1e293b' : 'transparent', color: activeTab === 'orders' ? '#10b981' : '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', textAlign: 'left' }}>
            <Bell size={18} /> Pedidos en Vivo
            {orders.length > 0 && <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>{orders.length}</span>}
          </button>
          <button onClick={() => setActiveTab('products')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeTab === 'products' ? '#1e293b' : 'transparent', color: activeTab === 'products' ? '#10b981' : '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', textAlign: 'left' }}>
            <Package size={18} /> Gestión de Menú
          </button>
          <button onClick={() => setActiveTab('settings')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeTab === 'settings' ? '#1e293b' : 'transparent', color: activeTab === 'settings' ? '#10b981' : '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', textAlign: 'left' }}>
            <Settings size={18} /> Mi Tienda
          </button>
        </nav>

        <div style={{ marginTop: 'auto', padding: '0 16px' }}>
          <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: storeIsOpen ? '#10b981' : '#ef4444' }}></span>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{storeIsOpen ? 'Abierto' : 'Cerrado'}</span>
            </div>
            <button onClick={handleToggleStoreOpen} disabled={savingSettings} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Cambiar estado abierto/cerrado">
              <Power size={16} />
            </button>
          </div>

          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', color: '#e05d5d', border: 'none', width: '100%', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        
        {/* PESTAÑA: MENÚ */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontWeight: '900', fontSize: '24px' }}>Gestión de Menú y Platillos</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Configura tus ingredientes, adicionales y promociones con precio tachado.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '32px', alignItems: 'start' }}>
              
              {/* FORMULARIO */}
              <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  {editingProd ? `✏️ Editando: ${editingProd.name}` : '+ Nuevo Platillo / Producto'}
                </h3>

                <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Foto */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Fotografía</label>
                    <div style={{ border: '2px dashed #cbd5e1', padding: '16px', textAlign: 'center', borderRadius: '12px', background: '#f8fafc' }}>
                      {prodImagePreview ? (
                        <img src={prodImagePreview} alt="Preview" style={{ maxHeight: '120px', borderRadius: '8px', marginBottom: '8px', objectFit: 'cover' }} />
                      ) : (
                        <ImageIcon size={32} color="#94a3b8" style={{ margin: '0 auto 6px', display: 'block' }} />
                      )}
                      <input type="file" accept="image/*" onChange={handleImageSelect} style={{ fontSize: '12px', width: '100%' }} />
                    </div>
                  </div>

                  {/* Nombre y Categoría */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Nombre del Platillo</label>
                    <input type="text" placeholder="Ej. Hamburguesa Doble Queso" value={prodName} onChange={e => setProdName(e.target.value)} required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Categoría</label>
                    <input type="text" placeholder="Ej. Hamburguesas, Pizzas, Bebidas" value={prodCategory} onChange={e => setProdCategory(e.target.value)} required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
                  </div>

                  {/* Descripción */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Descripción Apetitosa (Para el cliente)</label>
                    <textarea 
                      placeholder="Ej. Doble carne de 150g a la parrilla, queso cheddar fundido, tocineta crocante y salsa especial de la casa..."
                      rows="3"
                      value={prodDescription}
                      onChange={e => setProdDescription(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  {/* Precios y Oferta */}
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>Precios y Descuento</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#d97706', cursor: 'pointer' }}>
                        <input type="checkbox" checked={isPromoActive} onChange={e => setIsPromoActive(e.target.checked)} />
                        🔥 Activar Oferta
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isPromoActive ? '1fr 1fr 1fr' : '1fr', gap: '8px' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>PRECIO FINAL ($)</span>
                        <input type="number" step="0.01" placeholder="0.00" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '14px' }} />
                      </div>

                      {isPromoActive && (
                        <>
                          <div>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>PRECIO ANTES ($)</span>
                            <input type="number" step="0.01" placeholder="Tachado" value={prodOriginalPrice} onChange={e => handleOriginalPriceChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                          </div>
                          <div>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>DESCUENTO (%)</span>
                            <input type="number" step="1" placeholder="Ej. 20" value={prodDiscountPercent} onChange={e => handleDiscountPercentChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#d97706', fontWeight: 'bold' }} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ingredientes Base */}
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      1. Ingredientes Base (Vienen incluidos "Con todo")
                    </label>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px' }}>El cliente podrá desmarcarlos para pedir "Sin cebolla", etc.</span>
                    
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <input type="text" placeholder="Ej. Cebolla, Papa, Salsas" value={newModText} onChange={e => setNewModText(e.target.value)} onKeyDown={e => { if(e.key === 'Enter'){ e.preventDefault(); addModifierTag(); } }} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                      <button type="button" onClick={addModifierTag} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '0 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>+ Añadir</button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {prodModifiers.map((mod, idx) => (
                        <span key={idx} style={{ background: '#e2e8f0', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#0f172a' }}>
                          {mod}
                          <button type="button" onClick={() => removeModifierTag(mod)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Extras con Precio */}
                  <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      ⭐ 2. Extras / Adicionales con Costo
                    </label>
                    <span style={{ fontSize: '11px', color: '#059669', display: 'block', marginBottom: '8px' }}>Opcionales con costo que sumarán al total del pedido.</span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '6px', marginBottom: '8px' }}>
                      <input type="text" placeholder="Nombre (Huevo)" value={newExtraName} onChange={e => setNewExtraName(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                      <input type="number" step="0.01" placeholder="$1.00" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                      <button type="button" onClick={addExtraTag} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>+ Agregar</button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {prodExtras.map((ex, idx) => (
                        <span key={idx} style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 'bold' }}>
                          {ex.name} (+${Number(ex.price).toFixed(2)})
                          <button type="button" onClick={() => removeExtraTag(ex.name)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Botones */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {editingProd && (
                      <button type="button" onClick={resetProdForm} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    )}
                    <button type="submit" disabled={isUploading} style={{ flex: 2, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
                      {isUploading ? 'Guardando...' : editingProd ? 'Actualizar Platillo' : '+ Guardar en mi Menú'}
                    </button>
                  </div>

                </form>
              </div>

              {/* LISTA DE PLATILLOS */}
              <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  Mi Menú Activo ({products.length})
                </h3>

                {products.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No tienes platillos cargados aún.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '750px', overflowY: 'auto' }}>
                    {products.map(p => {
                      const hasDiscount = p.original_price && Number(p.original_price) > Number(p.price);

                      return (
                        <div key={p.id} style={{ display: 'flex', gap: '16px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                          <img src={p.image_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=150&q=80'} alt={p.name} style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover' }} />
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{p.name}</h4>
                              {hasDiscount && (
                                <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                  OFERTA
                                </span>
                              )}
                            </div>

                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>{p.category}</span>
                            
                            {p.description && (
                              <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {p.description}
                              </p>
                            )}

                            <div style={{ marginTop: '4px' }}>
                              {hasDiscount && (
                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '12px', marginRight: '6px' }}>
                                  ${Number(p.original_price).toFixed(2)}
                                </span>
                              )}
                              <strong style={{ color: '#10b981', fontSize: '15px' }}>${Number(p.price).toFixed(2)}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => startEditProduct(p)} style={{ background: '#e0f2fe', border: 'none', color: '#0284c7', padding: '8px', borderRadius: '6px', cursor: 'pointer' }} title="Editar">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteProduct(p.id)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }} title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* PESTAÑA: PEDIDOS EN VIVO */}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '24px', fontWeight: '900' }}>
              <Bell color="#10b981" /> Pedidos Entrantes en Tiempo Real
            </h2>

            {orders.length === 0 ? (
              <div style={{ background: '#fff', padding: '60px', textAlign: 'center', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                <Clock size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
                <h3 style={{ color: '#0f172a', margin: '0 0 6px 0' }}>Bandeja al día</h3>
                <p style={{ color: '#64748b', margin: 0 }}>No hay pedidos pendientes en este momento.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {orders.map(o => (
                  <div key={o.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ background: o.status === 'Pendiente' ? '#fee2e2' : o.status === 'Preparando' ? '#fef3c7' : '#dcfce7', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: o.status === 'Pendiente' ? '#ef4444' : o.status === 'Preparando' ? '#d97706' : '#16a34a', fontSize: '15px' }}>
                        #{String(o.id).slice(-4)} - {o.status.toUpperCase()}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#475569' }}>{new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>

                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '15px', color: '#0f172a' }}>{o.customer_info?.nombre} {o.customer_info?.apellido}</strong>
                          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>{o.customer_info?.direccion || 'Sin dirección escrita'}</span>
                        </div>
                        {o.customer_info?.telefono && (
                          <a href={`https://wa.me/58${o.customer_info.telefono.replace(/\D/g,'').slice(-10)}`} target="_blank" rel="noreferrer" style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageCircle size={14} /> WhatsApp
                          </a>
                        )}
                      </div>

                      {/* Items con notas */}
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
                        {Array.isArray(o.items) && o.items.map((item, idx) => (
                          <div key={idx} style={{ marginBottom: '8px', borderBottom: idx === o.items.length - 1 ? 'none' : '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                              <span><strong style={{ color: '#10b981' }}>{item.quantity}x</strong> {item.name}</span>
                              <strong>${(Number(item.price) * item.quantity).toFixed(2)}</strong>
                            </div>
                            {item.customization && (
                              <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
                                📌 {item.customization}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Total Pedido:</span>
                        <strong style={{ fontSize: '18px', color: '#10b981', fontWeight: '900' }}>${Number(o.total_amount).toFixed(2)}</strong>
                      </div>

                      {/* BOTONES DE ACCIÓN */}
                      {o.status === 'Pendiente' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleUpdateOrderStatus(o, 'Rechazado')} 
                            style={{ flex: 1, padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Rechazar
                          </button>
                          <button 
                            onClick={() => handleUpdateOrderStatus(o, 'Preparando')} 
                            style={{ flex: 2, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Aceptar y Cocinar
                          </button>
                        </div>
                      )}

                      {o.status === 'Preparando' && (
                        <button 
                          onClick={() => handleUpdateOrderStatus(o, 'En camino')} 
                          style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Despachar al Motorizado
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: CONFIGURACIÓN */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ color: '#0f172a', marginBottom: '24px', fontSize: '24px', fontWeight: '900' }}>
              Configuración de mi Restaurante
            </h2>

            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* LOGO */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Foto de Portada o Logo del Comercio
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '100px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#e2e8f0', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {storeLogoPreview || store?.image_url ? (
                      <img src={storeLogoPreview || store?.image_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Store size={32} color="#94a3b8" />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <input 
                      type="file" 
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={handleUploadLogo}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current && logoInputRef.current.click()}
                      disabled={uploadingLogo}
                      style={{
                        padding: '10px 16px', background: '#111827', color: '#fff',
                        border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <ImageIcon size={16} /> {uploadingLogo ? 'Subiendo imagen...' : 'Cambiar Foto / Logo'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nombre del Negocio</label>
                <input type="text" value={store?.name || ''} readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 'bold' }} />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Estado Operativo (Abierto / Cerrado)</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: storeIsOpen ? '#f0fdf4' : '#fff5f5', borderRadius: '12px', border: storeIsOpen ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                  <div>
                    <strong style={{ display: 'block', color: storeIsOpen ? '#16a34a' : '#e05d5d', fontSize: '15px' }}>
                      {storeIsOpen ? '🟢 Tienda Abierta en Krono Market' : '🔴 Tienda Cerrada Temporalmente'}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {storeIsOpen ? 'Estás visible en la app y recibiendo pedidos.' : 'Tus platos no se mostrarán a clientes hasta que abras.'}
                    </span>
                  </div>

                  <button 
                    onClick={handleToggleStoreOpen}
                    disabled={savingSettings}
                    style={{
                      padding: '10px 18px', background: storeIsOpen ? '#e05d5d' : '#16a34a', color: '#fff',
                      border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
                    }}
                  >
                    {storeIsOpen ? 'Cerrar Tienda' : 'Abrir Tienda'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}