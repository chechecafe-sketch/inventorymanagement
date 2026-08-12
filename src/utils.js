export function fmtTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })
}

export function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' })
}

export function fmtAge(ts) {
  if (!ts) return ''
  const ms = Date.now() - new Date(ts).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

export function getAgeColor(ts) {
  if (!ts) return '#888'
  const h = (Date.now() - new Date(ts).getTime()) / 3600000
  if (h < 1) return '#4a7c59'   // green — fresh
  if (h < 3) return '#e9c46a'   // yellow — a few hours
  if (h < 8) return '#e76f51'   // orange — worrying
  return '#c1121f'               // red — very old
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Compute average resupply time from history
export function avgResupplyHours(statsArr, item) {
  const rows = statsArr.filter(r => r.item === item && r.hours_to_resolve > 0)
  if (!rows.length) return null
  return rows.reduce((s, r) => s + r.hours_to_resolve, 0) / rows.length
}

// Score an alert for "Surtir primero" ranking — determinístico, sin IA:
// severidad del estado + antigüedad del reporte + qué tan rápido se agota
// históricamente ese ítem en esa tienda (entre más rápido, más urgente subirlo).
export function priorityScore(alert, statsForStore) {
  const severityWeight = { low: 1, urgent: 2, out: 3 }[alert.status] || 0
  const ageHours = (Date.now() - new Date(alert.reported_at).getTime()) / 3600000
  const ageScore = Math.min(ageHours / 4, 6) // se satura a las ~24h para no dejar que un solo viejo domine todo
  const avgHours = avgResupplyHours(statsForStore || [], alert.item)
  const speedScore = avgHours ? Math.max(0, 4 - avgHours / 12) : 0 // se acaba rápido históricamente → suma
  const criticalBonus = alert.isCritical ? 2 : 0
  return severityWeight * 3 + ageScore + speedScore + criticalBonus
}
