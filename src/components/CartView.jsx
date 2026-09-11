import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, MapPin, Banknote, CreditCard, Trash2, Plus, Minus } from 'lucide-react';
import { supabase } from '../supabase';
import { Clock } from 'lucide-react';

export default function CartView({ cart, removeFromCart, updateQuantity, cartTotal, user, clearCart, bcvRate, savedCarts, restoreSavedCart, deleteSavedCart }) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pago_movil');
  const [reference, setReference] = useState('');
  
  const [customerData, setCustomerData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    telefono: '',
    direccion: '',
    coordenadas: null
  });
  const [isLocating, setIsLocating] = useState(false);

  const cartTotalBs = bcvRate > 0 ? (cartTotal * bcvRate) : 0;

  useEffect(() => {
    if (showPaymentModal && user) {
      const fetchUserProfileAndAddress = async () => {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          const { data: addressData } = await supabase
            .from('saved_addresses')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);

          setCustomerData(prev => ({
            ...prev,
            nombre: profileData?.nombre || prev.nombre,
            apellido: profileData?.apellido || prev.apellido,
            cedula: profileData?.cedula || prev.cedula,
            telefono: profileData?.telefono || prev.telefono || profileData?.phone || '',
            direccion: addressData?.[0]?.direccion || prev.direccion,
            coordenadas: addressData?.[0]?.lat ? { lat: addressData[0].lat, lng: addressData[0].lng } : prev.coordenadas
          }));
        } catch (err) {
          console.log("Error cargando perfil:", err.message);
        }
      };
      
      fetchUserProfileAndAddress();
    }
  }, [showPaymentModal, user]);

  const initiateCheckout = () => {
    if (!user) {
      alert("Por favor, inicia sesión para confirmar tu pedido.");
      navigate('/perfil');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerData(prev => ({
          ...prev,
          coordenadas: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        }));
        setIsLocating(false);
      },
      (error) => {
        alert("Asegúrate de tener el GPS encendido.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleFinalCheckout = async (e) => {
    e.preventDefault();
    if ((paymentMethod === 'pago_movil' || paymentMethod === 'zelle') && !reference.trim()) {
      alert("Por favor, ingresa el número de referencia del pago.");
      return;
    }

    if (!customerData.nombre || !customerData.apellido || !customerData.cedula || !customerData.telefono || !customerData.direccion) {
      alert("Por favor, completa tus datos personales y dirección de entrega.");
      return;
    }

    const orderStoreId = cart[0]?.store_id;
    if (!orderStoreId) {
      alert("Error con el comercio de origen. Elimina el producto y agrégalo de nuevo.");
      return;
    }

    setIsProcessing(true);
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

    try {
      const { error } = await supabase
        .from('orders')
        .insert([
          { 
            user_id: user.id, 
            total_amount: cartTotal,
            total_bs: parseFloat(cartTotalBs.toFixed(2)),
            bcv_rate: bcvRate,
            delivery_pin: generatedPin,
            items: cart,
            status: 'Pendiente',
            payment_method: paymentMethod,
            payment_reference: reference,
            store_id: orderStoreId,
            customer_info: customerData
          }
        ]);

      if (error) throw error;
      
      alert(`¡Pedido confirmado con éxito! 🎉\n\nTu Código PIN de Entrega es: ${generatedPin}\n\nMuestra este código al motorizado al recibir.`);
      clearCart();
      setShowPaymentModal(false);
      navigate('/perfil'); 
    } catch (error) {
      alert("Error al procesar el pedido: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e) => {
    setCustomerData({
      ...customerData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section className="cart-section">
      <h2 className="section-title">Tu Pedido</h2>
      
      {showPaymentModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto'}}>
          <div style={{background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto'}}>
            <h3 style={{marginBottom: '16px'}}>Confirma tus Datos y Pago</h3>
            <form onSubmit={handleFinalCheckout}>
              
              <div style={{marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <h4 style={{margin: 0, fontSize: '14px', color: '#0f172a'}}>Datos del Cliente</h4>
                  <span style={{fontSize: '11px', background: '#d1fae5', color: '#059669', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold'}}>✨ Auto-cargado</span>
                </div>
                
                <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                  <input type="text" name="nombre" placeholder="Nombre" value={customerData.nombre} onChange={handleInputChange} style={{flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%'}} required />
                  <input type="text" name="apellido" placeholder="Apellido" value={customerData.apellido} onChange={handleInputChange} style={{flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%'}} required />
                </div>
                
                <div style={{marginBottom: '8px'}}>
                  <input type="text" name="cedula" placeholder="Cédula (Ej. V-12345678)" value={customerData.cedula} onChange={handleInputChange} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}} required />
                </div>
                
                <div style={{marginBottom: '16px'}}>
                  <input type="tel" name="telefono" placeholder="Teléfono WhatsApp" value={customerData.telefono} onChange={handleInputChange} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}} required />
                </div>

                <h4 style={{marginBottom: '12px', fontSize: '14px', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '16px'}}>Dirección de Entrega</h4>
                
                <div style={{marginBottom: '8px'}}>
                  <textarea name="direccion" placeholder="Dirección escrita (Ej. Urb. El Picacho, Res. Los Pinos, Apto 4)" value={customerData.direccion} onChange={handleInputChange} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '60px'}} required />
                </div>

                <div style={{marginBottom: '8px'}}>
                  <button 
                    type="button" 
                    onClick={handleGetLocation} 
                    disabled={isLocating} 
                    style={{
                      width: '100%', padding: '10px', 
                      background: customerData.coordenadas ? '#d1fae5' : '#f1f5f9', 
                      color: customerData.coordenadas ? '#059669' : '#475569', 
                      border: `1px solid ${customerData.coordenadas ? '#10b981' : '#cbd5e1'}`, 
                      borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <MapPin size={18} />
                    {isLocating ? 'Buscando satélite...' : (customerData.coordenadas ? '✓ Ubicación GPS sincronizada' : '📍 Usar mi GPS actual')}
                  </button>
                </div>
              </div>

              {/* SELECCIÓN DE MÉTODO DE PAGO */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: paymentMethod === 'pago_movil' ? '2px solid #10b981' : '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'pago_movil' ? '#f0fdf4' : '#fff'}}>
                  <input type="radio" name="payment" value="pago_movil" checked={paymentMethod === 'pago_movil'} onChange={() => setPaymentMethod('pago_movil')} />
                  <Banknote size={20} color="#10b981" />
                  <div>
                    <strong style={{display: 'block', fontSize: '13px'}}>Pago Móvil (Bolívares BCV)</strong>
                    {bcvRate > 0 && (
                      <span style={{fontSize: '12px', color: '#059669', fontWeight: 'bold'}}>
                        Total a transferir: Bs. {cartTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </label>

                <label style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: paymentMethod === 'zelle' ? '2px solid #10b981' : '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'zelle' ? '#f0fdf4' : '#fff'}}>
                  <input type="radio" name="payment" value="zelle" checked={paymentMethod === 'zelle'} onChange={() => setPaymentMethod('zelle')} />
                  <CreditCard size={20} color="#3b82f6" />
                  <div>
                    <strong style={{display: 'block', fontSize: '13px'}}>Zelle ($ USD)</strong>
                    <span style={{fontSize: '12px', color: '#64748b'}}>Total: ${cartTotal.toFixed(2)}</span>
                  </div>
                </label>

                <label style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: paymentMethod === 'efectivo' ? '2px solid #10b981' : '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'efectivo' ? '#f0fdf4' : '#fff'}}>
                  <input type="radio" name="payment" value="efectivo" checked={paymentMethod === 'efectivo'} onChange={() => setPaymentMethod('efectivo')} />
                  <Banknote size={20} color="#0f172a" />
                  <div>
                    <strong style={{display: 'block', fontSize: '13px'}}>Efectivo en Mano (Al recibir)</strong>
                    <span style={{fontSize: '12px', color: '#64748b'}}>Pagas al motorizado</span>
                  </div>
                </label>
              </div>

              {paymentMethod !== 'efectivo' && (
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#475569'}}>Número de Referencia Bancaria</label>
                  <input 
                    type="text" 
                    value={reference} 
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Últimos 4 dígitos o comprobante"
                    style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                    required
                  />
                </div>
              )}

              <div style={{display: 'flex', gap: '12px'}}>
                <button type="button" onClick={() => setShowPaymentModal(false)} style={{flex: 1, padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'}}>
                  Cancelar
                </button>
                <button type="submit" disabled={isProcessing} style={{flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'}}>
                  {isProcessing ? 'Confirmando...' : 'Confirmar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cart.length > 0 ? (
        <div>
          {/* LISTA AGRUPADA DE PRODUCTOS CON CONTROLES (+) Y (-) */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px'}}>
            {cart.map(item => {
              const qty = item.quantity || 1;
              const itemTotal = Number(item.price) * qty;

              return (
                <div key={item.cartId} style={{display: 'flex', alignItems: 'center', background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', gap: '16px'}}>
                  <img src={item.img} alt={item.name} style={{width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover'}} />
                  
                  <div style={{flex: 1}}>
                    <h4 style={{fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0'}}>{item.name}</h4>
                    <p style={{fontSize: '12px', color: '#64748b', margin: '0 0 4px 0'}}>{item.restaurant}</p>
                    <span style={{fontSize: '12px', color: '#94a3b8'}}>${Number(item.price).toFixed(2)} c/u</span>
                  </div>

                  {/* CONTROLES DE CANTIDAD (-) [ CANT ] (+) */}
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 8px', borderRadius: '10px', border: '1px solid #e2e8f0'}}>
                    <button 
                      type="button" 
                      onClick={() => updateQuantity(item.cartId, -1)}
                      style={{background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}
                    >
                      <Minus size={13} color="#0f172a" />
                    </button>
                    
                    <strong style={{fontSize: '14px', minWidth: '20px', textAlign: 'center', color: '#0f172a'}}>
                      {qty}
                    </strong>

                    <button 
                      type="button" 
                      onClick={() => updateQuantity(item.cartId, 1)}
                      style={{background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}
                    >
                      <Plus size={13} color="#0f172a" />
                    </button>
                  </div>

                  {/* PRECIO TOTAL POR LÍNEA */}
                  <div style={{textAlign: 'right', minWidth: '70px'}}>
                    <strong style={{fontSize: '16px', fontWeight: 900, color: '#10b981'}}>
                      ${itemTotal.toFixed(2)}
                    </strong>
                  </div>

                  {/* BOTÓN ELIMINAR */}
                  <button 
                    onClick={() => removeFromCart(item.cartId)} 
                    style={{background: '#fee2e2', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444'}}
                    title="Eliminar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* RESUMEN TOTAL DE LA COMPRA */}
          <div style={{background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#64748b'}}>
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            {bcvRate > 0 && (
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px', color: '#64748b'}}>
                <span>Tasa BCV oficial</span>
                <span>Bs. {bcvRate.toFixed(2)}</span>
              </div>
            )}
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '18px', fontWeight: 900, color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '16px'}}>
              <span>Total a Pagar</span>
              <div style={{textAlign: 'right'}}>
                <div style={{color: '#10b981'}}>${cartTotal.toFixed(2)}</div>
                {bcvRate > 0 && (
                  <div style={{fontSize: '14px', color: '#64748b', fontWeight: 'bold'}}>
                    Bs. {cartTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={initiateCheckout} 
              disabled={isProcessing}
              style={{width: '100%', background: '#10b981', color: '#fff', border: 'none', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', opacity: isProcessing ? 0.7 : 1}}
            >
              Procesar Pedido
            </button>
          </div>
        </div>
      ) : (
        <div style={{textAlign: 'center', padding: '60px 20px', color: '#64748b'}}>
          <ShoppingBag size={64} style={{opacity: 0.2, marginBottom: '16px'}} />
          <h3 style={{fontSize: '18px', color: '#0f172a', marginBottom: '8px'}}>Tu carrito está vacío</h3>
          <p style={{marginBottom: '24px'}}>¡Explora los mejores restaurantes de tu zona!</p>
          <button onClick={() => navigate('/')} style={{background: '#10b981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'}}>Explorar Comercios</button>
        </div>
      )}
      {/* SECCIÓN DE CARRITOS GUARDADOS PARA MÁS TARDE */}
      {Object.keys(savedCarts || {}).length > 0 && (
        <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '2px dashed #e2e8f0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="#10b981" /> Pedidos Guardados para Más Tarde
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {Object.entries(savedCarts).map(([sId, sCart]) => (
              <div key={sId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{sCart.storeName}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>{sCart.items.length} producto(s)</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => deleteSavedCart(sId)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                    Descartar
                  </button>
                  <button onClick={() => restoreSavedCart(sId)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                    Retomar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}