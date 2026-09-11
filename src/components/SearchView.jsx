import React, { useState } from 'react';
import { Search, Star, Clock, ShoppingBag, Store } from 'lucide-react';
import ProductModal from './ProductModal';

export default function SearchView({ filteredRestaurants, filteredDishes, addToCart, bcvRate }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const hasResults = filteredRestaurants.length > 0 || filteredDishes.length > 0;

  return (
    <section className="search-results-section">
      <h2 className="section-title">Resultados de Búsqueda</h2>
      
      {!hasResults ? (
        <div style={{textAlign: 'center', padding: '40px 20px', color: '#64748b'}}>
          <Search size={48} style={{opacity: 0.2, marginBottom: '16px'}} />
          <h3>No encontramos resultados</h3>
          <p>Intenta buscar con otras palabras, comercios o productos.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* 1. SECCIÓN DE PRODUCTOS ENCONTRADOS */}
          {filteredDishes.length > 0 && (
            <div>
              <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <ShoppingBag size={18} color="#10b981" /> Productos
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {filteredDishes.map(dish => {
                  const bsPrice = bcvRate > 0 ? (dish.price * bcvRate) : 0;
                  return (
                    <div key={`search-dish-${dish.id}`} className="dish-card" onClick={() => setSelectedProduct(dish)}>
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
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedProduct(dish); }}
                            style={{background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'}}
                          >
                            + Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SECCIÓN DE COMERCIOS ENCONTRADOS */}
          {filteredRestaurants.length > 0 && (
            <div>
              <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <Store size={18} color="#10b981" /> Comercios
              </h3>
              <div className="restaurant-grid">
                {filteredRestaurants.map(rest => (
                  <div key={`search-rest-${rest.id}`} className="restaurant-card">
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
                      <p className="restaurant-category">{rest.category}</p>
                      <div className="restaurant-meta">
                        <div className="meta-item"><Clock size={14} /><span>{rest.time || '30 min'}</span></div>
                        <span className="meta-dot">•</span>
                        <div className="meta-item"><span>Envío ${Number(rest.delivery || 3).toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL DE PERSONALIZACIÓN DEL PRODUCTO */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          addToCart={addToCart} 
          bcvRate={bcvRate} 
        />
      )}
    </section>
  );
}