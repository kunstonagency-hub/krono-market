import React, { useState, useEffect } from 'react';
import { ShoppingBag, MapPin, User, LogOut, History, Key, ChefHat, Truck, CheckCircle, Clock, Trash2, X, LocateFixed } from 'lucide-react';
import { supabase } from '../supabase';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ícono de Leaflet personalizado
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { 
    map.flyTo(center, map.getZoom()); 
  }, [center, map]);
  return null;
}

export default function ProfileView({ user }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');

  const [profileData, setProfileData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    telefono: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [newAddressText, setNewAddressText] = useState('');
  
  // Estados del Mapa
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newCoords, setNewCoords] = useState({ lat: 10.4806, lng: -66.9036 });
  const [mapCenter, setMapCenter] = useState({ lat: 10.4806, lng: -66.9036 });
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (ordersData) setMyOrders(ordersData);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (prof) {
        setProfileData({
          nombre: prof.nombre || '',
          apellido: prof.apellido || '',
          cedula: prof.cedula || '',
          telefono: prof.telefono || ''
        });
      }

      const { data: addrs } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('user_id', user.id);
      if (addrs) setAddresses(addrs);
    };

    fetchUserData();

    const ordersSubscription = supabase
      .channel('krono-orders-live')
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setMyOrders(currentOrders => 
            currentOrders.map(order => order.id === payload.new.id ? payload.new : order)
          );
        } else if (payload.eventType === 'INSERT') {
          setMyOrders(currentOrders => [payload.new, ...currentOrders]);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(ordersSubscription);
  }, [user]);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...profileData, updated_at: new Date() });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("¡Datos personales guardados con éxito!");
    }
    setSavingProfile(false);
  };

  const handleGetLocationForAddress = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta geolocalización.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setNewCoords(coords);
        setMapCenter(coords);
        setIsLocating(false);
      },
      (error) => {
        alert("Error obteniendo GPS. Asegúrate de tener la ubicación encendida.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!newAddressText.trim()) return alert("Escribe una descripción para la dirección.");

    const { data, error } = await supabase
      .from('saved_addresses')
      .insert([{
        user_id: user.id,
        direccion: newAddressText,
        lat: newCoords.lat,
        lng: newCoords.lng
      }])
      .select();

    if (!error && data) {
      setAddresses([...addresses, data[0]]);
      setNewAddressText('');
      setShowAddAddressModal(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if(!window.confirm("¿Deseas eliminar esta dirección?")) return;
    const { error } = await supabase.from('saved_addresses').delete().eq('id', id);
    if (!error) setAddresses(addresses.filter(a => a.id !== id));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('¡Registro exitoso! Ya puedes iniciar sesión.');
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 1. Etiqueta pequeña superior de estatus
  const getStatusBadge = (status) => {
    const st = String(status || '').toLowerCase();
    if (st === 'pendiente') return { bg: '#fff3bf', text: '#d97706', label: '1. Pedido Recibido', icon: <Clock size={15} /> };
    if (st === 'preparando') return { bg: '#e7f5ff', text: '#1864ab', label: '2. En Cocina', icon: <ChefHat size={15} /> };
    if (st === 'en_comercio') return { bg: '#ede9fe', text: '#7c3aed', label: '3. Rider en Local', icon: <ChefHat size={15} /> };
    if (st === 'en camino') return { bg: '#f3d9fa', text: '#862e9c', label: '4. En Camino 🛵', icon: <Truck size={15} /> };
    if (st === 'entregado') return { bg: '#ebfbee', text: '#16a34a', label: '✓ Entregado', icon: <CheckCircle size={15} /> };
    return { bg: '#fff5f5', text: '#e05d5d', label: 'Rechazado', icon: <Clock size={15} /> };
  };

  // 2. Barra visual interactiva con los 4 pasos y el PIN
  // Barra de progreso minimalista, monocromática y animada
  // Barra de progreso minimalista, monocromática con íconos limpios
  const renderOrderProgress = (status, deliveryPin) => {
    const st = String(status || '').toLowerCase();
    
    // Identificamos en qué paso va el pedido
    const isRecibido = true;
    const isCocina = ['preparando', 'en_comercio', 'en camino', 'entregado'].includes(st);
    const isRiderLocal = ['en_comercio', 'en camino', 'entregado'].includes(st);
    const isEnCamino = ['en camino', 'entregado'].includes(st);

    if (st === 'rechazado') {
      return (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', color: '#b91c1c', fontWeight: '700', fontSize: '13px', margin: '12px 0' }}>
          ❌ Pedido Rechazado o Cancelado por el comercio.
        </div>
      );
    }

    if (st === 'entregado') {
      return (
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', color: '#0f172a', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0' }}>
          <CheckCircle size={18} color="#111827" /> ¡Pedido Entregado! ¡Buen provecho!
        </div>
      );
    }

    return (
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', margin: '12px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* LÍNEA DE PROGRESO MONOCROMÁTICA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '16px' }}>
          <div style={{ position: 'absolute', top: '16px', left: '20px', right: '20px', height: '2px', background: '#e5e7eb', zIndex: 1 }} />
          
          {/* PASO 1: RECIBIDO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, flex: 1 }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: isRecibido ? '#111827' : '#ffffff',
              border: '2px solid #111827',
              color: isRecibido ? '#ffffff' : '#111827',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isRecibido ? '0 4px 12px rgba(17, 24, 39, 0.2)' : 'none'
            }}>
              <Clock size={16} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: isRecibido ? '800' : '500', color: isRecibido ? '#111827' : '#9ca3af', marginTop: '8px', textAlign: 'center' }}>
              Recibido
            </span>
          </div>

          {/* PASO 2: EN COCINA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, flex: 1 }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: isCocina ? '#111827' : '#ffffff',
              border: '2px solid #111827',
              color: isCocina ? '#ffffff' : '#111827',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isCocina ? '0 4px 12px rgba(17, 24, 39, 0.2)' : 'none'
            }}>
              <ChefHat size={16} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: isCocina ? '800' : '500', color: isCocina ? '#111827' : '#9ca3af', marginTop: '8px', textAlign: 'center' }}>
              En Cocina
            </span>
          </div>

          {/* PASO 3: RIDER EN LOCAL */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, flex: 1 }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: isRiderLocal ? '#111827' : '#ffffff',
              border: '2px solid #111827',
              color: isRiderLocal ? '#ffffff' : '#111827',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isRiderLocal ? '0 4px 12px rgba(17, 24, 39, 0.2)' : 'none'
            }}>
              <MapPin size={16} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: isRiderLocal ? '800' : '500', color: isRiderLocal ? '#111827' : '#9ca3af', marginTop: '8px', textAlign: 'center' }}>
              Rider en Local
            </span>
          </div>

          {/* PASO 4: EN CAMINO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, flex: 1 }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: isEnCamino ? '#111827' : '#ffffff',
              border: '2px solid #111827',
              color: isEnCamino ? '#ffffff' : '#111827',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isEnCamino ? '0 4px 12px rgba(17, 24, 39, 0.2)' : 'none'
            }}>
              <Truck size={16} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: isEnCamino ? '800' : '500', color: isEnCamino ? '#111827' : '#9ca3af', marginTop: '8px', textAlign: 'center' }}>
              En Camino
            </span>
          </div>
        </div>

        {/* PIN DE SEGURIDAD */}
        <div style={{ background: '#f8f9fa', border: '1px dashed #9ca3af', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} color="#111827" />
            <div>
              <span style={{ fontSize: '10px', color: '#111827', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>PIN DE SEGURIDAD DE ENTREGA</span>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Muéstraselo al motorizado al recibir</span>
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '4px', color: '#111827', background: '#ffffff', padding: '4px 14px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
            {deliveryPin || '----'}
          </div>
        </div>

      </div>
    );
  };

  // VISTA LOGIN
  if (!user) {
    return (
      <section className="profile-section" style={{maxWidth: '400px', margin: '0 auto', paddingTop: '40px'}}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '24px', color: '#111827', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Acceso a Krono
        </h2>
        <div style={{ background: '#fff', padding: '32px 24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <form onSubmit={handleLogin}>
            <input 
              type="email" 
              placeholder="Correo electrónico" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '16px', fontSize: '14px', outline: 'none'}}
              required
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '24px', fontSize: '14px', outline: 'none'}}
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{width: '100%', background: '#111827', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', marginBottom: '12px', textTransform: 'uppercase'}}
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
            <button 
              type="button" 
              onClick={handleRegister}
              disabled={loading}
              style={{width: '100%', background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer'}}
            >
              Crear una cuenta nueva
            </button>
          </form>
        </div>
      </section>
    );
  }

  // VISTA PERFIL LOGUEADO
  return (
    <section className="profile-section" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* CABECERA PERFIL */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb'}}>
        <h2 style={{margin: 0, fontSize: '20px', fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: '1px'}}>
          MI PERFIL
        </h2>
        <button onClick={handleLogout} style={{background: 'none', border: 'none', color: '#e05d5d', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px'}}>
          <LogOut size={16} /> Salir
        </button>
      </div>
      
      <div style={{background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center', marginBottom: '24px'}}>
        <div style={{width: '64px', height: '64px', background: '#16a34a', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>
          <User size={32} />
        </div>
        <h3 style={{fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: '#111827'}}>Cliente Krono</h3>
        <p style={{color: '#6b7280', fontSize: '13px', margin: 0}}>{user.email}</p>
      </div>

      {/* FORMULARIO DE DATOS PERSONALES */}
      <div style={{background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px'}}>
        <h3 style={{fontSize: '14px', marginBottom: '16px', color: '#111827', fontWeight: '800'}}>Mis Datos Personales (Facturación)</h3>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{display: 'flex', gap: '12px'}}>
            <input type="text" name="nombre" placeholder="Nombre" value={profileData.nombre} onChange={handleProfileChange} style={{flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '13px'}} required />
            <input type="text" name="apellido" placeholder="Apellido" value={profileData.apellido} onChange={handleProfileChange} style={{flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '13px'}} required />
          </div>
          <input type="text" name="cedula" placeholder="Cédula (Ej. V-12345678)" value={profileData.cedula} onChange={handleProfileChange} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '13px'}} required />
          <input type="tel" name="telefono" placeholder="Teléfono" value={profileData.telefono} onChange={handleProfileChange} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '13px'}} required />
          
          <button type="submit" disabled={savingProfile} style={{width: '100%', background: '#111827', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '4px'}}>
            {savingProfile ? 'Guardando...' : 'Guardar Datos Personales'}
          </button>
        </form>
      </div>

      {/* SELECTOR DE PESTAÑAS */}
      <div style={{display: 'flex', gap: '8px', marginBottom: '20px'}}>
        <button 
          onClick={() => setActiveTab('orders')}
          style={{
            flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            border: activeTab === 'orders' ? '1px solid #16a34a' : '1px solid #e5e7eb',
            background: activeTab === 'orders' ? '#16a34a' : '#f9fafb',
            color: activeTab === 'orders' ? '#fff' : '#6b7280'
          }}
        >
          <History size={16} /> Pedidos
        </button>
        <button 
          onClick={() => setActiveTab('addresses')}
          style={{
            flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            border: activeTab === 'addresses' ? '1px solid #16a34a' : '1px solid #e5e7eb',
            background: activeTab === 'addresses' ? '#16a34a' : '#f9fafb',
            color: activeTab === 'addresses' ? '#fff' : '#6b7280'
          }}
        >
          <MapPin size={16} /> Direcciones Guardadas
        </button>
      </div>

      {/* LISTA DE PEDIDOS CON BARRA VISUAL */}
      {activeTab === 'orders' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          {myOrders.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px 20px', color: '#6b7280', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb'}}>
              <ShoppingBag size={40} style={{opacity: 0.3, marginBottom: '16px'}} />
              <p style={{fontSize: '14px'}}>Aún no tienes pedidos registrados.</p>
            </div>
          ) : (
            myOrders.map(order => {
              const status = getStatusBadge(order.status);

              return (
                <div key={order.id} style={{background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb'}}>
                  
                  {/* Encabezado */}
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #f1f3f5', paddingBottom: '12px'}}>
                    <div>
                      <p style={{fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: 'bold'}}>
                        {new Date(order.created_at).toLocaleDateString()} - {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                      <h4 style={{fontSize: '18px', fontWeight: 900, color: '#111827', margin: 0}}>
                        ${Number(order.total_amount).toFixed(2)}
                        {order.total_bs > 0 && <span style={{fontSize: '12px', color: '#6b7280', fontWeight: 'bold', marginLeft: '6px'}}>(Bs. {Number(order.total_bs).toLocaleString('es-VE', {minimumFractionDigits: 2})})</span>}
                      </h4>
                    </div>
                    <span style={{background: status.bg, color: status.text, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', border: `1px solid ${status.text}40`}}>
                      {status.icon} {status.label}
                    </span>
                  </div>

                  {/* BARRA DE PROGRESO INTERACTIVA CON PIN */}
                  {renderOrderProgress(order.status, order.delivery_pin)}

                  {/* Lista de productos */}
                  <div style={{display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px'}}>
                    {Array.isArray(order.items) && order.items.map((item, idx) => (
                      <div key={idx} style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}>
                        <span><span style={{color: '#16a34a', fontWeight: '800'}}>{item.quantity || 1}x</span> <span style={{color: '#374151', fontWeight: '600'}}>{item.name}</span></span>
                        <span style={{color: '#6b7280'}}>${Number(item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* LIBRETA DE DIRECCIONES CON MAPA */}
      {activeTab === 'addresses' && (
        <div style={{background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h4 style={{margin: 0, fontSize: '15px', fontWeight: '800', color: '#111827'}}>Mis Direcciones Guardadas</h4>
            <button onClick={() => setShowAddAddressModal(true)} style={{background: '#111827', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'}}>
              + Nueva Dirección
            </button>
          </div>

          {addresses.length === 0 ? (
            <p style={{color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '20px 0'}}>No tienes direcciones registradas.</p>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {addresses.map(addr => (
                <div key={addr.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb'}}>
                  <div>
                    <p style={{fontSize: '13px', fontWeight: '700', margin: '0 0 4px 0', color: '#111827'}}>{addr.direccion}</p>
                    {addr.lat && <span style={{fontSize: '11px', color: '#16a34a', fontWeight: '600'}}>📍 Coordenadas Exactas Guardadas</span>}
                  </div>
                  <button onClick={() => handleDeleteAddress(addr.id)} style={{background: '#fff5f5', border: '1px solid #ffc9c9', color: '#e05d5d', padding: '6px', borderRadius: '6px', cursor: 'pointer'}}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* MODAL DEL MAPA */}
          {showAddAddressModal && (
            <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
              <div style={{background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '450px', border: '1px solid #e5e7eb', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
                
                <div style={{ borderBottom: '1px solid #f1f3f5', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#111827' }}>Fijar Dirección Exacta</h4>
                  <button onClick={() => setShowAddAddressModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                    Arrastra el marcador hasta la puerta de tu casa o edificio.
                  </p>
                  
                  <div style={{ position: 'relative', width: '100%', height: '240px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '12px', zIndex: 1 }}>
                    <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapUpdater center={[mapCenter.lat, mapCenter.lng]} />
                      <Marker 
                        position={[newCoords.lat, newCoords.lng]} 
                        icon={customIcon}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const marker = e.target;
                            const pos = marker.getLatLng();
                            setNewCoords({ lat: pos.lat, lng: pos.lng });
                          }
                        }}
                      />
                    </MapContainer>

                    <button 
                      type="button"
                      onClick={handleGetLocationForAddress}
                      disabled={isLocating}
                      style={{
                        position: 'absolute', bottom: '10px', right: '10px', zIndex: 1000,
                        background: '#111827', color: '#fff', border: 'none', padding: '8px 12px',
                        borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                      }}
                    >
                      <LocateFixed size={14} /> {isLocating ? 'Buscando...' : 'Mi GPS'}
                    </button>
                  </div>

                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                    Detalles de la dirección:
                  </p>
                  <textarea 
                    placeholder="Ej. Casa blanca, rejas negras, frente a la panadería..." 
                    value={newAddressText} 
                    onChange={(e) => setNewAddressText(e.target.value)} 
                    style={{width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '16px', minHeight: '60px', fontSize: '13px', outline: 'none', resize: 'none'}}
                  />

                  <div style={{display: 'flex', gap: '8px'}}>
                    <button type="button" onClick={() => setShowAddAddressModal(false)} style={{flex: 1, padding: '10px', background: '#f9fafb', border: '1px solid #d1d5db', color: '#374151', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px'}}>Cancelar</button>
                    <button type="button" onClick={handleSaveAddress} style={{flex: 1, padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px'}}>Guardar Dirección</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}