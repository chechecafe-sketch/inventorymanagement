import { STORES } from './constants'
import { fmtAge, getAgeColor } from './utils'

export default function HomeScreen({ alerts, onSelectStore, onMaster }) {
  const critAlerts = alerts.filter(a => a.isCritical)
  
  return (
    <div style={{ minHeight:'100vh', background:'#f7f5f0', paddingBottom:24 }}>
      {/* Header */}
      <div style={{ background:'#2d2d2a', padding:'18px 20px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'DM Serif Display'", color:'#e8e0d0', fontSize:22 }}>Che Che Café</div>
            <div style={{ color:'#666', fontSize:12, marginTop:1 }}>Sistema de Faltantes</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {critAlerts.length > 0 && (
              <div style={{ background:'#c1121f', color:'#fff', borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:600 }}>
                🔴 {critAlerts.length}
              </div>
            )}
            <button onClick={onMaster}
              style={{ background:'#4a7c59', color:'#fff', border:'none', borderRadius:8, padding:'7px 13px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              Admin ›
            </button>
          </div>
        </div>
      </div>

      {/* Critical banner */}
      {critAlerts.length > 0 && (
        <div style={{ background:'#fff0ee', borderBottom:'2px solid #c1121f', padding:'10px 20px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#c1121f', marginBottom:4, letterSpacing:0.5 }}>⚠️ ALERTAS CRÍTICAS</div>
          {critAlerts.slice(0,5).map((a,i) => (
            <div key={i} style={{ fontSize:12, color:'#7a1a1a', marginTop:3, display:'flex', justifyContent:'space-between' }}>
              <span>{a.status==='out'?'🔴':'🟠'} <b>{a.storeName}</b> — {a.item}</span>
              <span style={{ color: getAgeColor(a.reported_at), fontSize:11 }}>{fmtAge(a.reported_at)}</span>
            </div>
          ))}
          {critAlerts.length > 5 && <div style={{ fontSize:11, color:'#aaa', marginTop:3 }}>+{critAlerts.length-5} más</div>}
        </div>
      )}

      <div style={{ padding:'16px 14px 0' }}>
        <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>Selecciona tu tienda</div>
        {STORES.map(store => {
          const sa = alerts.filter(a => a.store_id === store.id)
          const cr = sa.filter(a => a.isCritical).length
          const oldest = sa.length ? Math.min(...sa.map(a => new Date(a.reported_at).getTime())) : null
          return (
            <button key={store.id} onClick={() => onSelectStore(store)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'#fff', border:`1.5px solid ${cr>0?'#e76f51':'#e8e4dc'}`,
                borderRadius:12, padding:'14px 16px', marginBottom:10, cursor:'pointer', textAlign:'left' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:store.color,
                  display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>
                  P{store.priority}
                </div>
                <div>
                  <div style={{ fontWeight:600, color:'#1a1a1a', fontSize:15 }}>{store.fullName}</div>
                  <div style={{ color:'#888', fontSize:12 }}>{store.address}</div>
                  {oldest && <div style={{ fontSize:11, color:getAgeColor(oldest), marginTop:2 }}>Alerta más vieja: {fmtAge(oldest)}</div>}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                {cr>0 && <div style={{ color:'#c1121f', fontWeight:700, fontSize:13 }}>🔴 {cr}</div>}
                {sa.length>0 && <div style={{ color:'#e76f51', fontSize:11 }}>{sa.length} alerta{sa.length>1?'s':''}</div>}
                {sa.length===0 && <div style={{ color:'#4a7c59', fontSize:11 }}>✓ OK</div>}
                <div style={{ color:'#ccc', fontSize:22 }}>›</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
