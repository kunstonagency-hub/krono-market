import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';

export default function ProductModal({ product, onClose, addToCart, bcvRate }) {
  const [qty, setQty] = useState(1);
  
  // 1. Ingredientes Base (marcados con casillas por defecto)
  const [modifiers, setModifiers] = useState(() => {
    let baseList = ['Cebolla', 'Papa', 'Queso', 'Salsas'];
    if (product.modifiers) {
      if (Array.isArray(product.modifiers)) {
        baseList = product.modifiers;
      } else if (typeof product.modifiers === 'string') {
        const arr = product.modifiers.split(',').map(s => s.trim()).filter(Boolean);
        if (arr.length > 0) baseList = arr;
      }
    }
    return baseList.map(name => ({ name, active: true }));
  });

  // 2. Adicionales con Cantidad (inician en 0)
  const [extras, setExtras] = useState(() => {
    let extraList = [];
    if (product.extras) {
      if (Array.isArray(product.extras)) {
        extraList = product.extras;
      } else if (typeof product.extras === 'string') {
        try { extraList = JSON.parse(product.extras); } catch(e) { extraList = []; }
      }
    }
    return extraList.map(e => ({ ...e, qty: 0 }));
  });

  const toggleModifier = (name) => {
    setModifiers(prev => prev.map(m => m.name === name ? { ...m, active: !m.active } : m));
  };

  // Sumar o restar cantidad de un extra individual (x1, x2, x3...)
  const updateExtraQty = (name, delta) => {
    setExtras(prev => prev.map(e => {
      if (e.name === name) {
        const newQty = Math.max(0, (e.qty || 0) + delta);
        return { ...e, qty: newQty };
      }
      return e;
    }));
  };

  // Cálculo en vivo del precio unitario y total
  const extrasTotal = extras.reduce((sum, e) => sum + (Number(e.price || 0) * (e.qty || 0)), 0);
  const unitPriceWithExtras = Number(product.price || 0) + extrasTotal;
  const finalPrice = unitPriceWithExtras * qty;
  const finalPriceBs = (bcvRate && bcvRate > 0) ? (finalPrice * bcvRate) : 0;

  const handleAdd = () => {
    const excluded = modifiers.filter(m => !m.active).map(m => `Sin ${m.name}`);
    const activeExtras = extras.filter(e => e.qty > 0).map(e => {
      const label = e.qty > 1 ? `+ ${e.qty}x ${e.name}` : `+ ${e.name}`;
      return `${label} (+$${(Number(e.price) * e.qty).toFixed(2)})`;
    });
    
    let customizationText = excluded.length > 0 ? excluded.join(', ') : "Con todo";
    if (activeExtras.length > 0) {
      customizationText += ` | ${activeExtras.join(', ')}`;
    }

    addToCart({
      ...product,
      price: unitPriceWithExtras,
      basePrice: product.price,
      quantity: qty,
      customization: customizationText
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* BOTÓN CERRAR CON X FLOTANTE */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'rgba(15, 23, 42, 0.75)', color: '#fff', border: 'none',
            width: '32px', height: '32px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 20, backdropFilter: 'blur(4px)'
          }}
          title="Cerrar"
        >
          <X size={18} />
        </button>

        {/* FOTO DEL PRODUCTO */}
        <div style={{ width: '100%', height: '200px', position: 'relative', background: '#f1f5f9' }}>
          <img 
            src={product.img || 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80'} 
            alt={product.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{product.name}</h2>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#10b981' }}>${Number(product.price).toFixed(2)}</span>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>{product.restaurant}</p>

          {/* INGREDIENTES INCLUIDOS (DESMARCAR LO QUE NO QUIERAS) */}
          {modifiers.length > 0 && (
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                ✓ Ingredientes incluidos (Desmarca lo que no quieras)
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {modifiers.map(m => (
                  <label key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: m.active ? '#0f172a' : '#94a3b8', fontWeight: m.active ? '600' : 'normal' }}>
                    <input 
                      type="checkbox" 
                      checked={m.active} 
                      onChange={() => toggleModifier(m.name)} 
                      style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                    />
                    <span style={{ textDecoration: m.active ? 'none' : 'line-through' }}>{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ADICIONALES CON CONTADOR DE CANTIDAD (x1, x2, x3...) */}
          {extras.length > 0 && (
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                ⭐ Adicionales con costo (Opcional)
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {extras.map(ex => {
                  const hasQty = (ex.qty || 0) > 0;
                  const extraSubtotal = Number(ex.price) * (ex.qty || 0);

                  return (
                    <div key={ex.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: hasQty ? '700' : '500', color: hasQty ? '#0f172a' : '#334155', display: 'block' }}>
                          + {ex.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          ${Number(ex.price).toFixed(2)} c/u
                        </span>
                      </div>

                      {/* CONTROLES (-) [ x1 ] (+) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {hasQty && (
                          <strong style={{ fontSize: '13px', color: '#10b981', marginRight: '4px' }}>
                            +${extraSubtotal.toFixed(2)}
                          </strong>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', border: hasQty ? '2px solid #10b981' : '1px solid #cbd5e1', borderRadius: '8px', padding: '2px', background: hasQty ? '#f0fdf4' : '#fff' }}>
                          <button
                            type="button"
                            onClick={() => updateExtraQty(ex.name, -1)}
                            disabled={!hasQty}
                            style={{ border: 'none', background: 'none', padding: '4px 8px', cursor: hasQty ? 'pointer' : 'default', opacity: hasQty ? 1 : 0.2, display: 'flex', alignItems: 'center' }}
                          >
                            <Minus size={13} color="#0f172a" />
                          </button>

                          <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '13px', fontWeight: '800', color: hasQty ? '#10b981' : '#64748b' }}>
                            {hasQty ? `x${ex.qty}` : '0'}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateExtraQty(ex.name, 1)}
                            style={{ border: 'none', background: 'none', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Plus size={13} color="#0f172a" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER: CANTIDAD GENERAL Y BOTÓN AGREGAR */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '4px', background: '#f8fafc' }}>
            <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ border: 'none', background: 'none', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Minus size={16} color="#0f172a" />
            </button>
            <span style={{ fontWeight: '800', minWidth: '24px', textAlign: 'center', fontSize: '15px', color: '#0f172a' }}>{qty}</span>
            <button onClick={() => setQty(qty + 1)} style={{ border: 'none', background: 'none', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Plus size={16} color="#0f172a" />
            </button>
          </div>

          <button 
            onClick={handleAdd}
            style={{
              flex: 1, padding: '14px', background: '#10b981', color: '#fff',
              border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '15px',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <span>Agregar al Pedido</span>
            <div style={{ textAlign: 'right' }}>
              <div>${finalPrice.toFixed(2)}</div>
              {finalPriceBs > 0 && <span style={{ fontSize: '10px', opacity: 0.9 }}>Bs. {finalPriceBs.toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>}
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}