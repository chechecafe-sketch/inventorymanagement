import { STORES, CENTRAL_KITCHEN } from './constants'
import { fmtAge, getAgeColor } from './utils'
import { C, FONT_DISPLAY, FONT_BODY } from './theme'

export default function HomeScreen({ alerts, onSelectStore, onMaster }) {
  const critAlerts = alerts.filter(a => a.isCritical)

  const renderLocation = store => {
          const sa = alerts.filter(a => a.store_id === store.id)
          const cr = sa.filter(a => a.isCritical).length
          const oldest = sa.length ? Math.min(...sa.map(a => new Date(a.reported_at).getTime())) : null
          return (
            <button key={store.id} onClick={() => onSelectStore(store)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                background:C.card, border:`1px solid ${cr>0?C.out:C.cardBorder}`,
                borderRadius:16, padding:'16px 18px', marginBottom:12, cursor:'pointer', textAlign:'left', fontFamily:FONT_BODY }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:store.color,
                  display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:14, fontFamily:FONT_DISPLAY, flexShrink:0 }}>
                  {store.isCentral ? '🍳' : `P${store.priority}`}
                </div>
                <div>
                  <div style={{ fontWeight:700, color:C.text, fontSize:18, fontFamily:FONT_DISPLAY }}>{store.fullName}</div>
                  <div style={{ color:C.textDim, fontSize:13, marginTop:2 }}>{store.address}</div>
                  {oldest && <div style={{ fontSize:11, color:getAgeColor(oldest), marginTop:4, fontWeight:600 }}>Alerta más vieja: {fmtAge(oldest)}</div>}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                {cr>0 && <div style={{ color:C.out, fontWeight:800, fontSize:15 }}>{cr}</div>}
                {sa.length>0 && <div style={{ color:C.urgent, fontSize:12, fontWeight:600 }}>{sa.length} alerta{sa.length>1?'s':''}</div>}
                {sa.length===0 && <div style={{ color:C.ok, fontSize:12, fontWeight:700 }}>OK</div>}
                <div style={{ color:C.textFaint, fontSize:24, marginTop:2 }}>›</div>
              </div>
            </button>
          )
        }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:24, fontFamily:FONT_BODY }}>
      {/* Header */}
      <div style={{ background:C.bgHeader, padding:'22px 20px', position:'sticky', top:0, zIndex:100, borderBottom:`1px solid ${C.divider}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <img src="/che-che-logo-white.png" alt="Che Che Café" style={{ height:30, display:'block' }} />
            <div style={{ color:C.textDim, fontSize:12, marginTop:6, textTransform:'uppercase', letterSpacing:1.2, fontWeight:600 }}>Sistema de Faltantes</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {critAlerts.length > 0 && (
              <div style={{ background:C.out, color:'#240707', borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:800 }}>
                {critAlerts.length}
              </div>
            )}
            <button onClick={onMaster}
              style={{ background:C.text, color:'#000', border:'none', borderRadius:10, padding:'9px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT_BODY }}>
              Admin ›
            </button>
          </div>
        </div>
      </div>

      {/* Critical banner */}
      {critAlerts.length > 0 && (
        <div style={{ background:C.critBg, borderBottom:`1px solid ${C.out}`, padding:'12px 20px' }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.critTxt, marginBottom:6, letterSpacing:1, textTransform:'uppercase' }}>Alertas críticas</div>
          {critAlerts.slice(0,5).map((a,i) => (
            <div key={i} style={{ fontSize:13, color:C.text, marginTop:5, display:'flex', justifyContent:'space-between', gap:8 }}>
              <span><b>{a.storeName}</b> — {a.item}</span>
              <span style={{ color: getAgeColor(a.reported_at), fontSize:12, fontWeight:600, flexShrink:0 }}>{fmtAge(a.reported_at)}</span>
            </div>
          ))}
          {critAlerts.length > 5 && <div style={{ fontSize:12, color:C.textFaint, marginTop:5 }}>+{critAlerts.length-5} más</div>}
        </div>
      )}

      <div style={{ padding:'20px 14px 0' }}>
        <div style={{ fontSize:12, color:C.textFaint, marginBottom:14, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>Selecciona tu tienda</div>
        {STORES.map(renderLocation)}

        <div style={{ fontSize:12, color:C.textFaint, margin:'26px 0 14px', paddingTop:18, borderTop:`1px solid ${C.divider}`, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>Cocina central</div>
        {renderLocation(CENTRAL_KITCHEN)}
      </div>
    </div>
  )
}
