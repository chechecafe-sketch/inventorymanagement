export const STORES = [
  { id:'smr',   name:'SMR',    fullName:'Santa María la Ribera', address:'Dr. Mariano Azuela 162',      priority:1, lat:19.4481714, lng:-99.1542853, color:'#4a7c59' },
  { id:'taba',  name:'Taba',   fullName:'Tabacalera',            address:'Insurgentes Centro 16',        priority:2, lat:19.4389001, lng:-99.1558311, color:'#7c5c4a' },
  { id:'jardin',name:'Jardín', fullName:'Jardín',                address:'C. del Fresno 168',            priority:3, lat:19.4501148, lng:-99.1610219, color:'#4a5f7c' },
  { id:'centro',name:'Centro', fullName:'Centro Histórico',      address:'República de Guatemala 20',    priority:4, lat:19.4351227, lng:-99.1327956, color:'#7c4a6a' },
  { id:'studio',name:'Studio', fullName:'Cheché Studio',         address:'Av. Cuauhtémoc 1233',          priority:5, lat:19.3734283, lng:-99.1607971, color:'#5f4a7c' },
]

export const ADMINS = ['Victoria','Fernanda','Luis']

// Nota: café en grano, las leches y los panes se quitaron de aquí — ya no se
// reportan con los 4 botones de estado, se capturan como cantidad exacta
// (ver QUANTITY_ITEMS) 3 veces al día. Yogurt griego y carnitas se eliminaron
// del catálogo a petición del usuario.
export const CATEGORIES = {
  servicios:   { label:'Servicios',       icon:'⚡', critical:true,  items:['Agua','Luz','Internet'] },
  cafeteria:   { label:'Cafetería',       icon:'☕', critical:true,  items:['Agua mineral','Chocolate','Matcha','Horchata','Chai','Azúcar','Sirope vainilla','Sirope curaçao','Agua tónica','Jugo naranja','Sirope mango','Limones','Crema batida','Crema para batir','Coffee Mate','Sobres azúcar','Sobres splenda','Servilletas','Bolsas pan','Rinza','Cafiza'] },
  desechables: { label:'Desechables',     icon:'🥤', critical:true,  items:['Vaso cartón 12oz','Vaso cartón 16oz','Vaso cristal 16oz','Tapa 12-16oz','Vaso espresso 4oz','Vaso flat white 8oz','Tapa espresso 4oz','Tapa flat white 8oz'] },
  cocina:      { label:'Cocina',          icon:'🍳', critical:true,  items:['Cochinita','Jamón','Queso fresco','Queso de cabra','Queso manchego','Frutos rojos','Granola','Pollo','Mantequilla','Aceite'] },
  verduras:    { label:'Verduras/Frutas', icon:'🥑', critical:false, items:['Plátano','Jitomate','Naranja','Limones','Aguacates','Chiles secos','Arúgula','Espinaca','Cebolla','Ajo','Chiles verdes'] },
  limpieza:    { label:'Limpieza',        icon:'🧹', critical:false, items:['Pinol','Cloro','Jabón manos','Jabón trastes','Papel baño','Jergas','Guantes trastes','Fibras','Desengrasante','Bolsas basura'] },
}

export const CRITICAL_ITEMS = [
  'Agua','Luz','Internet',
  'Matcha','Chai',
  'Cochinita','Pollo',
  'Vaso cartón 12oz','Tapa 12-16oz','Vaso cristal 16oz',
]

// ── Ítems de cantidad exacta ─────────────────────────────────────────────
// Leche (litros), café (kilos) y pan (piezas): en vez de OK/Poco/Urgente/
// Agotado, el personal captura el número exacto 3 veces al día (ver SHIFTS).
// Café va primero en el objeto a propósito: es el ítem prioritario dentro
// de este grupo (ver PRIORITY_ITEMS) y así aparece primero en la lista.
export const QUANTITY_ITEMS = {
  'Café en grano':      { unit:'kg', label:'Kilos' },
  'Leche entera':       { unit:'L',  label:'Litros' },
  'Leche deslactosada': { unit:'L',  label:'Litros' },
  'Leche almendra':     { unit:'L',  label:'Litros' },
  'Leche avena':        { unit:'L',  label:'Litros' },
  'Chapatas':           { unit:'pz', label:'Piezas' },
  'Pan masa madre':     { unit:'pz', label:'Piezas' },
  'Pan brioche':        { unit:'pz', label:'Piezas' },
}

// Ítems de cantidad exacta que se destacan como los más importantes a
// vigilar (aparecen primero + etiqueta ★ PRIORITARIO en la pestaña Stock).
export const PRIORITY_ITEMS = ['Café en grano']

export const SHIFTS = [
  { key:'apertura', label:'Apertura' },
  { key:'medio',    label:'Turno medio' },
  { key:'cierre',   label:'Cierre' },
]

// Emoji de cantidad en vez de símbolos — más claros de un vistazo y al tocar:
// feliz = hay bastante, serio = va quedando poco, preocupado = urgente, cara roja = ya no hay.
export const STATUS_CFG = {
  ok:     { bg:'#34d399', txt:'#0d1f16',  label:'OK',      short:'😊', weight:0 },
  low:    { bg:'#fbbf24', txt:'#241a04',  label:'Poco',    short:'😐', weight:1 },
  urgent: { bg:'#fb923c', txt:'#241202',  label:'Urgente', short:'😟', weight:2 },
  out:    { bg:'#f87171', txt:'#240707',  label:'Agotado', short:'😡', weight:3 },
}

export const STATUS_ORDER = ['ok','low','urgent','out']

export const ADMIN_PIN = '1234'
