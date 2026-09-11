import React, { useState, useEffect, useRef } from 'react';
import { Flame, TrendingUp, Star, Clock } from 'lucide-react';
import { banners, infiniteCategories } from '../data';
import ProductModal from './ProductModal';

export default function HomeView({ setSearchQuery, navigate, addToCart, suggestedDishes, featuredRestaurants, allRestaurants, loading, bcvRate }) {
  const bannerRef = useRef(null);
  const suggestedRef = useRef(null);
  const categoryRef = useRef(null);
  const [isCategoryPaused, setIsCategoryPaused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Carruseles automáticos
  useEffect(() => {
    const jumpInterval = setInterval(() => {
      [bannerRef, suggestedRef].forEach(ref => {
        if (ref.current) {
          const { scrollLeft, scrollWidth, clientWidth } = ref.current;
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            ref.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            ref.current.scrollTo({ left: scrollLeft + clientWidth, behavior: 'smooth' });
          }
        }
      });
    }, 4000);

    const slowInterval = setInterval(() => {
      if (categoryRef.current && !isCategoryPaused) {
        const { scrollWidth } = categoryRef.current;
        categoryRef.current.scrollLeft += 1;
        
        if (categoryRef.current.scrollLeft >= scrollWidth / 2) {
          categoryRef.current.scrollLeft -= scrollWidth / 2;
        }
      }
    }, 35); 

    return () => {
      clearInterval(jumpInterval);
      clearInterval(slowInterval);
    };
  }, [isCategoryPaused]);

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh'}}>
        <h3 style={{color: '#10b981'}}>Cargando comercios y menú en vivo...</h3>
      </div>
    );
  }

  return (
    <>
      {/* BANNERS */}
      <section className="banners-section">
        <div className="banners-container hide-scrollbar" ref={bannerRef}>
          {banners.map(banner => (
            <div key={banner.id} className="promo-card">
              <img src={banner.img} alt={banner.alt} className="promo-img" />
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="categories-section">
        <div 
          className="categories-container hide-scrollbar" 
          ref={categoryRef}
          onMouseEnter={() => setIsCategoryPaused(true)}
          onMouseLeave={() => setIsCategoryPaused(false)}
          onTouchStart={() => setIsCategoryPaused(true)}
          onTouchEnd={() => setIsCategoryPaused(false)}
        >
          {infiniteCategories.map((cat, index) => (
            <div key={`${cat.id}-${index}`} className="category-item" onClick={() => {
              setSearchQuery(cat.name);
              navigate('/buscar');
            }}>
              <div className="category-icon-wrapper">
                <div className="category-svg">{cat.icon}</div>
              </div>
              <span className="category-name">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SUGERENCIAS DEL DÍA (PLATILLOS) */}
      <section className="suggested-section">
        <div className="section-header">
          <h2 className="section-title"><Flame size={20} color="#10b981" /> Sugerencias del Día</h2>
          <button className="view-all-btn" onClick={() => navigate('/buscar')}>Ver todos</button>
        </div>
        <div className="dishes-container hide-scrollbar" ref={suggestedRef}>
          {suggestedDishes.map(dish => {
            const bsPrice = bcvRate > 0 ? (dish.price * bcvRate) : 0;
            return (
              <div key={dish.id} className="dish-card" onClick={() => setSelectedProduct(dish)}>
                <div className="dish-img-container">
                  <img src={dish.img} alt={dish.name} />
                </div>
                <div className="dish-info">
                  <h4>{dish.name}</h4>
                  <p>{dish.restaurant}</p>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      {dish.originalPrice && (
                        <span style={{textDecoration: 'line-through', color: '#94a3b8', fontSize: '10px'}}>
                          ${dish.originalPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="dish-price">${dish.price.toFixed(2)}</span>
                      {bsPrice > 0 && (
                        <span style={{fontSize: '11px', color: '#64748b', fontWeight: 'bold'}}>
                          Bs. {bsPrice.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <button style={{background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'}}>+ Agregar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMERCIOS DESTACADOS */}
      <section className="featured-restaurants-section">
        <div className="section-header">
          <h2 className="section-title"><TrendingUp size={20} color="#10b981" /> Destacados</h2>
        </div>
        <div className="restaurant-grid">
          {featuredRestaurants.map(rest => (
            <div key={rest.id} className="restaurant-card featured" onClick={() => { navigate(`/tienda/${rest.id}`); }}>
              <div className="restaurant-image-container">
                <img src={rest.img} alt={rest.name} className="restaurant-img" />
                <div className="promoted-badge">AD</div>
                {rest.is_fiskal && <div className="fiskal-badge">TASA OFICIAL BCV</div>}
              </div>
              <div className="restaurant-info">
                <div className="restaurant-header">
                  <h3 className="restaurant-name">{rest.name}</h3>
                  <div className="rating">
                    <Star size={14} className="star-icon" fill="#10b981" color="#10b981" />
                    <span>{rest.rating || '4.8'}</span>
                  </div>
                </div>
                <p className="restaurant-category">{rest.category || 'Comida Rápida'}</p>
                <div className="restaurant-meta">
                  <div className="meta-item"><Clock size={14} /><span>{rest.time || '30-40 min'}</span></div>
                  <span className="meta-dot">•</span>
                  <div className="meta-item"><span>Envío ${Number(rest.delivery || 3).toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TODOS LOS COMERCIOS */}
      <section className="all-restaurants-section">
        <h2 className="section-title">Todos los Comercios</h2>
        <div className="restaurant-grid">
          {allRestaurants.map(rest => (
            <div key={rest.id} className="restaurant-card" onClick={() => { navigate(`/tienda/${rest.id}`); }}>
              <div className="restaurant-image-container">
                <img src={rest.img} alt={rest.name} className="restaurant-img" />
                {rest.is_fiskal && <div className="fiskal-badge">TASA OFICIAL BCV</div>}
              </div>
              <div className="restaurant-info">
                <div className="restaurant-header">
                  <h3 className="restaurant-name">{rest.name}</h3>
                  <div className="rating">
                    <Star size={14} className="star-icon" fill="#10b981" color="#10b981" />
                    <span>{rest.rating || '4.5'}</span>
                  </div>
                </div>
                <p className="restaurant-category">{rest.category || 'Restaurante'}</p>
                <div className="restaurant-meta">
                  <div className="meta-item"><Clock size={14} /><span>{rest.time || '35-45 min'}</span></div>
                  <span className="meta-dot">•</span>
                  <div className="meta-item"><span>Envío ${Number(rest.delivery || 3).toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {selectedProduct && (
     <ProductModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        addToCart={addToCart}
        bcvRate={bcvRate}
      />
   )}
    </>
  );
}