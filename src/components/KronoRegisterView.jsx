import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, User, Mail, Phone, Lock, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '../supabase';

export default function KronoRegisterView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Formulario de Registro
  const [storeName, setStoreName] = useState('');
  const [storeType, setStoreType] = useState('restaurant'); // restaurant | standard
  const [rif, setRif] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Crear la tienda en la tabla stores (krono_enabled = true por defecto)
        const { data: newStore, error: storeError } = await supabase
          .from('stores')
          .insert([{
            name: storeName.trim(),
            store_type: storeType,
            rif: rif.trim(),
            owner_name: ownerName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            country: 'venezuela',
            krono_enabled: true,
            is_active: true,
            is_demo: true // Lo marcamos como demo inicial por seguridad contable
          }])
          .select()
          .single();

        if (storeError) throw storeError;

        // 3. Crear el perfil de dueño y enlazarlo con la tienda
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([{
            id: authData.user.id,
            store_id: newStore.id,
            role: 'owner',
            nombre: ownerName.trim(),
            telefono: phone.trim()
          }]);

        if (profileError) throw profileError;

        setSuccess(true);
      }
    } catch (err) {
      alert("Error al registrar el comercio: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '450px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '80px', height: '80px', background: '#d1fae5', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={40} />
          </div>
          <h2 style={{ color: '#0f172a', marginBottom: '12px' }}>¡Registro Exitoso!</h2>
          <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>
            Tu comercio <strong>{storeName}</strong> ha sido creado en Krono Market. Hemos iniciado tu sesión automáticamente.
          </p>
          <button 
            onClick={() => window.location.href = '/comercio'}
            style={{ background: '#10b981', color: '#fff', border: 'none', width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Entrar a mi Panel de Comercio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ color: '#0f172a', fontSize: '28px', fontWeight: '900', marginBottom: '8px' }}>Asocia tu Comercio</h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>Comienza a recibir pedidos por delivery en Krono Market hoy mismo.</p>
      </div>

      <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase' }}>Datos del Negocio</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Store size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input type="text" placeholder="Nombre de tu Comercio" value={storeName} onChange={(e) => setStoreName(e.target.value)} required style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <FileText size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input type="text" placeholder="RIF (Opcional)" value={rif} onChange={(e) => setRif(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
                </div>
                <select value={storeType} onChange={(e) => setStoreType(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#0f172a', background: '#f8fafc' }}>
                  <option value="restaurant">Restaurante / Comida Rápida</option>
                  <option value="standard">Tienda / Bodegón</option>
                </select>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed #e2e8f0' }} />

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase' }}>Datos del Propietario</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input type="text" placeholder="Tu Nombre Completo" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <Phone size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input type="tel" placeholder="Teléfono / WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed #e2e8f0' }} />

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase' }}>Acceso al Portal</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input type="email" placeholder="Correo Electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input type="password" placeholder="Crea una contraseña segura" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }}
          >
            {loading ? 'Procesando registro...' : 'Crear mi Comercio Gratis'}
          </button>
        </form>
      </div>
    </div>
  );
}