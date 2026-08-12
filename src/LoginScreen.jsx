import { useState } from 'react'
import { ADMINS, ADMIN_PIN } from './constants'

export default function LoginScreen({ store, onLogin, onAdmin }) {
  const [name, setName] = useState('')
  const [pin, setPin]   = useState('')
  const [tab, setTab]   = useState('employee') // 'employee' | 'admin'
  const [err, setErr]   = useState('')

  const handleEmployee = () => {
    if (!name.trim()) { setErr('Ingresa tu nombre'); return }
    onLogin(name.trim(), false)
  }

  const handleAdmin = () => {
    if (!name.trim()) { setErr('Ingresa tu nombre'); return }
    if (pin !== ADMIN_PIN) { setErr('PIN incorrecto'); setPin(''); return }
    onLogin(name.trim(), true)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f7f5f0' }}>
      <div style={{ background: store ? store.color : '#2d2d2a', padding:'20px' }}>
        <div style={{ fontFamily:"'DM Serif Display'", color:'#fff', fontSize:22 }}>
          {store ? store.fullName : 'Che Che Café'}
        </div>
        <div style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginTop:2 }}>
          {store ? store.address : 'Dashboard de Faltantes'}
        </div>
      </div>

      <div style={{ padding:'28px 20px' }}>
        {/* Tab switcher */}
        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {['employee','admin'].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr('') }}
              style={{ flex:1, padding:'9px', borderRadius:9, border:'none', fontSize:13, fontWeight:600, cursor:'pointer',
                background: tab===t ? '#2d2d2a' : '#e8e4dc',
                color: tab===t ? '#fff' : '#666' }}>
              {t === 'employee' ? '👤 Empleado' : '🔑 Admin'}
            </button>
          ))}
        </div>

        <div style={{ fontWeight:600, fontSize:15, marginBottom:6, color:'#1a1a1a' }}>Tu nombre</div>
        {tab === 'admin' ? (
          <select value={name} onChange={e => setName(e.target.value)}
            style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1.5px solid #ddd', fontSize:15, background:'#fff', marginBottom:14 }}>
            <option value=''>Selecciona...</option>
            {ADMINS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        ) : (
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Tu nombre..."
            style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1.5px solid #ddd', fontSize:15, marginBottom:14 }}
            onKeyDown={e => e.key==='Enter' && handleEmployee()}
          />
        )}

        {tab === 'admin' && (
          <>
            <div style={{ fontWeight:600, fontSize:15, marginBottom:6, color:'#1a1a1a' }}>PIN de Admin</div>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)}
              placeholder="●●●●"
              style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1.5px solid #ddd', fontSize:22, letterSpacing:10, marginBottom:14 }}
              onKeyDown={e => e.key==='Enter' && handleAdmin()}
            />
          </>
        )}

        {err && <div style={{ color:'#c1121f', fontSize:13, marginBottom:10, fontWeight:500 }}>⚠️ {err}</div>}

        <button
          onClick={tab === 'admin' ? handleAdmin : handleEmployee}
          style={{ width:'100%', background: store ? store.color : '#2d2d2a', color:'#fff', border:'none',
            borderRadius:10, padding:'14px', fontSize:15, fontWeight:600, cursor:'pointer' }}>
          Entrar →
        </button>
      </div>
    </div>
  )
}
