import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, ArrowLeft, Store, ShoppingBag } from 'lucide-react';
import { supabase } from '../supabase';
import ProductModal from './ProductModal';

export default function RestaurantView({ addToCart, bcvRate }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    async function loadStoreMenu() {
      setLoading(true);
      try {
        // 1. Cargar datos del restaurante
        const { data: storeData } = await supabase
          .from('stores')
          .select('*')
          .eq('id', id)
          .single();

        if (storeData) {
          const fallbackImg = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80';
          setRestaurant({
            ...storeData,
            img: storeData.image_url || storeData.logo_url || fallbackImg
          });
        }

        // 2. Cargar exclusivamente los productos de este restaurante
        const { data: prodsData } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', id)
          .eq('show_in_krono', true)
          .order('id', { ascending: false });

        if (prodsData) {
          const formatted = prodsData.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: p.krono_preferential_price ? Number(p.krono_preferential_price) : Number(p.price),
            originalPrice: p.original_price ? Number(p.original_price) : (p.krono_preferential_price ? Number(p.price) : null),
            img: p.image_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
            restaurant: storeData?.name || 'Comercio',
            store_id: storeData?.id,
            category: p.category || 'General',
            modifiers: p.modifiers,
            extras: p.extras
          }));
          setProducts(formatted);
        }
      } catch (err) {
        console.error("Error cargando restaurante:", err);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadStoreMenu();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <h3 style={{ color: '#10b981' }}>Cargando menú del restaurante...</h3>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Store size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
        <h2>Comercio no encontrado</h2>
        <button onClick={() => navigate('/')} style={{ marginTop: '16px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          Volver al Inicio
        </button>
      </div>
    );
  }

  // Filtrar categorías disponibles de este restaurante
  const categories = ['Todas', ...new Set(products.map(p => p.category))];
  const filteredProducts = selectedCategory === 'Todas' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      {/* BOTÓN VOLVER */}
      <button 
        onClick={() => navigate('/')} 
        style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px', fontSize: '14px' }}
      >
        <ArrowLeft size={18} /> Volver a comercios
      </button>

      {/* PORTADA / BANNER DEL RESTAURANTE */}
      <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '32px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <div style={{ width: '100%', height: '240px', position: 'relative', background: '#f1f5f9' }}>
          <img src={restaurant.img} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>{restaurant.name}</h1>
              <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }}>{restaurant.category || restaurant.store_type || 'Restaurante'}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#16a34a', padding: '6px 12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', border: '1px solid #bbf7d0' }}>
              <Star size={16} fill="#16a34a" /> {restaurant.rating || '4.8'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#475569', fontWeight: '600', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> {restaurant.time || '35-45 min'}
            </span>
            <span>•</span>
            <span>Envío: ${Number(restaurant.delivery || 3).toFixed(2)}</span>
            {restaurant.address && (
              <>
                <span>•</span>
                <span style={{ color: '#64748b' }}>📍 {restaurant.address}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FILTRO DE CATEGORÍAS */}
      {categories.length > 2 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
                background: selectedCategory === cat ? '#0f172a' : '#f1f5f9',
                color: selectedCategory === cat ? '#fff' : '#475569'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* CUADRÍCULA DE PLATILLOS DE ESTE RESTAURANTE */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '16px' }}>
          Menú de {restaurant.name} ({filteredProducts.length})
        </h2>

        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <ShoppingBag size={40} color="#cbd5e1" style={{ marginBottom: '12px' }} />
            <p style={{ color: '#64748b', margin: 0 }}>Este comercio no tiene platillos disponibles en esta categoría.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredProducts.map(dish => {
              const bsPrice = (bcvRate && bcvRate > 0) ? (dish.price * bcvRate) : 0;
              const hasDiscount = dish.originalPrice && dish.originalPrice > dish.price;

              return (
                <div 
                  key={dish.id} 
                  className="dish-card" 
                  onClick={() => setSelectedProduct(dish)}
                  style={{ cursor: 'pointer', background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
                >
                  <div style={{ height: '160px', width: '100%', background: '#f8fafc', position: 'relative' }}>
                    <img src={dish.img} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {hasDiscount && (
                      <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#fef3c7', color: '#d97706', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px' }}>
                        OFERTA
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{dish.name}</h4>
                    
                    {dish.description && (
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {dish.description}
                      </p>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                      <div>
                        {hasDiscount && (
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '11px', display: 'block' }}>
                            ${Number(dish.originalPrice).toFixed(2)}
                          </span>
                        )}
                        <strong style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>
                          ${dish.price.toFixed(2)}
                        </strong>
                        {bsPrice > 0 && (
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 'bold' }}>
                            Bs. {bsPrice.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedProduct(dish); }}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA PERSONALIZAR INGREDIENTES Y EXTRAS */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          addToCart={addToCart} 
          bcvRate={bcvRate} 
        />
      )}

    </div>
  );
}