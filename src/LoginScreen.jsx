import { useState } from 'react'
import { ADMINS, ADMIN_PIN } from './constants'
import { C, FONT_DISPLAY, FONT_BODY } from './theme'

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
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:FONT_BODY }}>
      <div style={{ background: C.bgHeader, padding:'26px 20px', borderBottom:`1px solid ${C.divider}` }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700, color:C.text, fontSize:26, letterSpacing:-0.5 }}>
          {store ? store.fullName : 'Che Che Café'}
        </div>
        <div style={{ color:C.textDim, fontSize:13, marginTop:4 }}>
          {store ? store.address : 'Dashboard de Faltantes'}
        </div>
      </div>

      <div style={{ padding:'28px 20px' }}>
        {/* Tab switcher */}
        <div style={{ display:'flex', gap:8, marginBottom:26 }}>
          {['employee','admin'].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr('') }}
              style={{ flex:1, padding:'12px', borderRadius:10, border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT_BODY,
                background: tab===t ? C.text : C.card,
                color: tab===t ? '#000' : C.textDim }}>
              {t === 'employee' ? '👤 Empleado' : '🔑 Admin'}
            </button>
          ))}
        </div>

        <div style={{ fontWeight:700, fontSize:15, marginBottom:8, color:C.text, fontFamily:FONT_DISPLAY }}>Tu nombre</div>
        {tab === 'admin' ? (
          <select value={name} onChange={e => setName(e.target.value)}
            style={{ width:'100%', padding:'14px', borderRadius:12, border:`1.5px solid ${C.cardBorder}`, fontSize:16, background:C.card, color:C.text, marginBottom:16, fontFamily:FONT_BODY }}>
            <option value=''>Selecciona...</option>
            {ADMINS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        ) : (
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Tu nombre..."
            style={{ width:'100%', padding:'14px', borderRadius:12, border:`1.5px solid ${C.cardBorder}`, fontSize:16, marginBottom:16,
              background:C.card, color:C.text, fontFamily:FONT_BODY, boxSizing:'border-box' }}
            onKeyDown={e => e.key==='Enter' && handleEmployee()}
          />
        )}

        {tab === 'admin' && (
          <>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:8, color:C.text, fontFamily:FONT_DISPLAY }}>PIN de Admin</div>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)}
              placeholder="●●●●"
              style={{ width:'100%', padding:'14px', borderRadius:12, border:`1.5px solid ${C.cardBorder}`, fontSize:24, letterSpacing:10, marginBottom:16,
                background:C.card, color:C.text, fontFamily:FONT_BODY, boxSizing:'border-box' }}
              onKeyDown={e => e.key==='Enter' && handleAdmin()}
            />
          </>
        )}

        {err && <div style={{ color:C.out, fontSize:13, marginBottom:12, fontWeight:600 }}>⚠️ {err}</div>}

        <button
          onClick={tab === 'admin' ? handleAdmin : handleEmployee}
          style={{ width:'100%', background: C.text, color:'#000', border:'none',
            borderRadius:12, padding:'16px', fontSize:16, fontWeight:800, cursor:'pointer', fontFamily:FONT_DISPLAY }}>
          Entrar →
        </button>
      </div>
    </div>
  )
}
