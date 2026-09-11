import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, MapPin, Clock, Star, ChevronRight, Menu, Home, User, TrendingUp, Flame, X } from 'lucide-react';
import { banners, infiniteCategories } from './data';
import { supabase } from './supabase';
import './App.css';

import HomeView from './components/HomeView';
import CartView from './components/CartView';
import ProfileView from './components/ProfileView';
import SearchView from './components/SearchView';
import MerchantPortalView from './components/MerchantPortalView';
import KronoRegisterView from './components/KronoRegisterView';
import RestaurantView from './components/RestaurantView';

// =========================================================================
// 1. COMPONENTES DE ESTRUCTURA Y NAVEGACIÓN
// =========================================================================

const Header = ({ cartCount, searchQuery, setSearchQuery, bcvRate, user, savedAddresses, selectedAddress, setSelectedAddress }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddressModal, setShowAddressModal] = useState(false);

  const handleSearchInput = (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length > 0 && location.pathname !== '/buscar') {
      navigate('/buscar');
    } else if (e.target.value.length === 0 && location.pathname === '/buscar') {
      navigate('/');
    }
  };

  return (
    <header className="market-header">
      <div className="header-content-wrapper">
        <div className="header-top">
          <button className="icon-btn mobile-menu-btn"><Menu size={24} color="#0f172a" /></button>
          <img src="/krono-market-logo.svg" alt="Krono Market" className="desktop-brand-logo" onClick={() => navigate('/')} style={{cursor: 'pointer'}} />
          
          {/* SELECTOR DE DIRECCIÓN INTERACTIVO */}
          <div className="location-selector" onClick={() => user ? setShowAddressModal(true) : navigate('/perfil')} style={{cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s'}} onMouseOver={e => e.currentTarget.style.background='#f1f5f9'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
            <span className="location-label">Entregar en</span>
            <div className="location-current">
              <MapPin size={16} color="#10b981" />
              <span style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>
                {selectedAddress ? selectedAddress.direccion : (user ? 'Seleccionar dirección' : 'Inicia sesión')}
              </span>
              <ChevronRight size={16} color="#0f172a" />
            </div>
          </div>

          <nav className="desktop-nav">
            <button className={`desktop-nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}><Home size={18} /> Inicio</button>
            <button className={`desktop-nav-item ${location.pathname === '/perfil' ? 'active' : ''}`} onClick={() => navigate('/perfil')}><User size={18} /> Perfil</button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {bcvRate > 0 && (
              <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                BCV: Bs. {bcvRate.toFixed(2)}
              </span>
            )}
            <button className="icon-btn cart-btn" onClick={() => navigate('/carrito')}>
              <ShoppingBag size={24} color="#0f172a" />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>

        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar comercios, pizzas, hamburguesas..." 
            className="search-input" 
            value={searchQuery}
            onChange={handleSearchInput}
          />
        </div>
      </div>

      {/* MODAL DE DIRECCIONES */}
      {showAddressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAddressModal(false)}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>Elige tu dirección de entrega</h3>
              <button onClick={() => setShowAddressModal(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex' }}><X size={18} color="#64748b" /></button>
            </div>
            
            {savedAddresses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <MapPin size={40} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>No tienes direcciones guardadas.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {savedAddresses.map(addr => (
                  <div 
                    key={addr.id} 
                    onClick={() => { setSelectedAddress(addr); setShowAddressModal(false); }}
                    style={{ 
                      padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                      border: selectedAddress?.id === addr.id ? '2px solid #10b981' : '1px solid #e2e8f0', 
                      background: selectedAddress?.id === addr.id ? '#f0fdf4' : '#f8fafc',
                      transition: 'all 0.2s'
                    }}
                  >
                    <MapPin size={20} color={selectedAddress?.id === addr.id ? '#10b981' : '#94a3b8'} />
                    <span style={{ fontSize: '14px', fontWeight: selectedAddress?.id === addr.id ? '800' : '600', color: selectedAddress?.id === addr.id ? '#065f46' : '#334155' }}>
                      {addr.direccion}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={() => { setShowAddressModal(false); navigate('/perfil'); }}
              style={{ width: '100%', padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' }}
            >
              + Agregar / Gestionar Direcciones
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

const BottomNav = ({ cartCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="bottom-nav">
      <button className={`nav-btn ${currentPath === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
        <Home size={24} /><span>Inicio</span>
      </button>
      <button className={`nav-btn ${currentPath === '/buscar' ? 'active' : ''}`} onClick={() => navigate('/buscar')}>
        <Search size={24} /><span>Buscar</span>
      </button>
      <button className={`nav-btn ${currentPath === '/carrito' ? 'active' : ''}`} onClick={() => navigate('/carrito')}>
        <div style={{position: 'relative'}}>
          <ShoppingBag size={24} />
          {cartCount > 0 && <span style={{position: 'absolute', top: '-6px', right: '-10px', background: '#10b981', color: 'white', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{cartCount}</span>}
        </div>
        <span>Pedidos</span>
      </button>
      <button className={`nav-btn ${currentPath === '/perfil' ? 'active' : ''}`} onClick={() => navigate('/perfil')}>
        <User size={24} /><span>Perfil</span>
      </button>
    </nav>
  );
};

const Footer = () => (
  <footer className="market-footer">
    <div className="footer-content">
      <div className="footer-brand">
        <img src="/krono-market-logo.svg" alt="Krono Market" className="footer-brand-logo" />
        <p>Delivery rápido, tecnología local conectada con Fiskal.</p>
      </div>
      <div className="footer-links">
        <a href="#">Términos y Condiciones</a>
        <a href="#">Soporte</a>
        <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = '/comercio'; }}>Portal de Comercios</a>
        <a href="/registro-comercio">Asocia tu Comercio</a>      
      </div>
    </div>
    <div className="footer-bottom">
      <p>&copy; 2026 Krono Ecosystem. Desarrollado e integrado con Fiskal POS.</p>
    </div>
  </footer>
);


// =========================================================================
// 3. ENRUTADOR PRINCIPAL CON ESTADOS CENTRALES (CART Y DIRECCIONES)
// =========================================================================

function MainApp() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [savedCarts, setSavedCarts] = useState({});
  
  const [restaurants, setRestaurants] = useState([]);
  const [suggestedDishes, setSuggestedDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [bcvRate, setBcvRate] = useState(0);

  // ESTADOS DE DIRECCIÓN
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);

  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (res.ok) {
          const data = await res.json();
          const rate = parseFloat(data.promedio || data.price);
          if (rate && !isNaN(rate)) setBcvRate(rate);
        }
      } catch (err) {
        console.log("Usando tasa de respaldo o caché:", err);
      }
    }
    fetchRate();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    async function fetchData() {
      try {
        const { data: rests } = await supabase
          .from('stores')
          .select('*')
          .eq('krono_enabled', true)
          .eq('is_active', true);
          
        if (rests) {
          const fallbackRestaurantImg = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
          const formattedRests = rests.map(r => ({
            ...r,
            img: r.image_url || r.logo_url || fallbackRestaurantImg
          }));
          setRestaurants(formattedRests);
        }

        const { data: dishes } = await supabase
          .from('products')
          .select('*, stores!inner(id, name, krono_enabled, is_active)') 
          .eq('show_in_krono', true)
          .eq('stores.krono_enabled', true)
          .eq('stores.is_active', true);

        if (dishes) {
          const formattedDishes = dishes.map(d => ({
            id: d.id,
            name: d.name,
            price: d.krono_preferential_price ? Number(d.krono_preferential_price) : Number(d.price),
            originalPrice: d.krono_preferential_price ? Number(d.price) : null,
            img: d.image_url || d.img, 
          restaurant: d.stores?.name || 'Krono Market',
          store_id: d.stores?.id,
          modifiers: d.modifiers,
          extras: d.extras,
          description: d.description
        }));
          setSuggestedDishes(formattedDishes);
        }
      } catch (error) {
        console.error("Error cargando comercios:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();

    return () => subscription.unsubscribe();
  }, []);

  // CARGAR DIRECCIONES CUANDO EL USUARIO INICIA SESIÓN
  useEffect(() => {
    if (user) {
      const fetchAddresses = async () => {
        const { data } = await supabase.from('saved_addresses').select('*').eq('user_id', user.id);
        if (data && data.length > 0) {
          setSavedAddresses(data);
          setSelectedAddress(data[0]); // Selecciona la primera por defecto
        } else {
          setSavedAddresses([]);
          setSelectedAddress(null);
        }
      };
      fetchAddresses();
    } else {
      setSavedAddresses([]);
      setSelectedAddress(null);
    }
  }, [user]);

  const featuredRestaurants = restaurants.filter(r => r.is_featured);
  const allRestaurants = restaurants.filter(r => !r.is_featured);
  
  const filteredRestaurants = restaurants.filter(rest => 
    rest.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (rest.category && rest.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDishes = suggestedDishes.filter(dish => 
    dish.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // LOGICA DEL CARRITO (1 SOLO COMERCIO A LA VEZ CON GUARDADO)
  const addToCart = (dish) => {
    if (cart.length > 0) {
      const currentStoreId = cart[0].store_id;
      const incomingStoreId = dish.store_id;

      if (currentStoreId && incomingStoreId && String(currentStoreId) !== String(incomingStoreId)) {
        const currentStoreName = cart[0].restaurant || 'otro comercio';
        const incomingStoreName = dish.restaurant || 'este comercio';

        const confirmSave = window.confirm(
          `Ya tienes productos de "${currentStoreName}" en tu carrito.\n\n¿Deseas GUARDAR ese pedido para más tarde y empezar uno nuevo en "${incomingStoreName}"?`
        );

        if (!confirmSave) return; 

        setSavedCarts(prev => ({
          ...prev,
          [currentStoreId]: { storeName: currentStoreName, items: [...cart] }
        }));

        setCart([{ ...dish, quantity: 1, cartId: `${dish.id}_${Date.now()}` }]);
        return;
      }
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.id === dish.id);
      if (existingIndex > -1) {
        return prevCart.map((item, idx) => 
          idx === existingIndex ? { ...item, quantity: (item.quantity || 1) + 1 } : item
        );
      }
      return [...prevCart, { ...dish, quantity: 1, cartId: `${dish.id}_${Date.now()}` }];
    });
  };

  const updateQuantity = (cartId, delta) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.cartId === cartId) {
        const newQty = (item.quantity || 1) + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (cartId) => setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  const clearCart = () => setCart([]);

  const restoreSavedCart = (storeId) => {
    const cartToRestore = savedCarts[storeId];
    if (!cartToRestore) return;
    if (cart.length > 0) {
      const currentStoreId = cart[0].store_id;
      setSavedCarts(prev => {
        const newSaved = { ...prev, [currentStoreId]: { storeName: cart[0].restaurant, items: [...cart] } };
        delete newSaved[storeId];
        return newSaved;
      });
    } else {
      setSavedCarts(prev => {
        const newSaved = { ...prev };
        delete newSaved[storeId];
        return newSaved;
      });
    }
    setCart(cartToRestore.items);
  };

  const deleteSavedCart = (storeId) => {
    if (window.confirm("¿Seguro que deseas descartar este pedido guardado?")) {
      setSavedCarts(prev => {
        const newSaved = { ...prev };
        delete newSaved[storeId];
        return newSaved;
      });
    }
  };

  const cartTotal = cart.reduce((total, item) => total + (Number(item.price) * (item.quantity || 1)), 0);
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="market-layout">
      <Header 
        cartCount={cartCount} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        bcvRate={bcvRate}
        user={user}
        savedAddresses={savedAddresses}
        selectedAddress={selectedAddress}
        setSelectedAddress={setSelectedAddress}
      />
      
      <main className="market-main">
        <Routes>
          <Route path="/" element={
            <HomeView 
              setSearchQuery={setSearchQuery} 
              navigate={navigate}
              addToCart={addToCart}
              suggestedDishes={suggestedDishes}
              featuredRestaurants={featuredRestaurants}
              allRestaurants={allRestaurants}
              loading={loading}
              bcvRate={bcvRate}
            />
          } />
          <Route path="/buscar" element={
            <SearchView 
              filteredRestaurants={filteredRestaurants} 
              filteredDishes={filteredDishes}
              addToCart={addToCart}
              bcvRate={bcvRate}
            />
          } />
          <Route path="/carrito" element={
            <CartView 
              cart={cart} 
              removeFromCart={removeFromCart} 
              updateQuantity={updateQuantity} 
              cartTotal={cartTotal} 
              user={user} 
              clearCart={clearCart} 
              bcvRate={bcvRate} 
              savedCarts={savedCarts}
              restoreSavedCart={restoreSavedCart}
              deleteSavedCart={deleteSavedCart}
            />
          } />
          <Route path="/perfil" element={<ProfileView user={user} />} />
          <Route path="/comercio" element={<MerchantPortalView />} />
          <Route path="/tienda/:id" element={<RestaurantView addToCart={addToCart} bcvRate={bcvRate} />} />
          {/* AQUÍ ESTÁ LA RUTA QUE FALTABA */}
          <Route path="/registro-comercio" element={<KronoRegisterView />} />
        </Routes>
      </main>

      <Footer />
      <BottomNav cartCount={cartCount} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}