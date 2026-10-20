export const STORES = [
  { id:'smr',   name:'SMR',    fullName:'Santa María la Ribera', address:'Dr. Mariano Azuela 162',      priority:1, lat:19.4481714, lng:-99.1542853, color:'#4a7c59' },
  { id:'taba',  name:'Taba',   fullName:'Tabacalera',            address:'Insurgentes Centro 16',        priority:2, lat:19.4389001, lng:-99.1558311, color:'#7c5c4a' },
  { id:'jardin',name:'Jardín', fullName:'Jardín',                address:'C. del Fresno 168',            priority:3, lat:19.4501148, lng:-99.1610219, color:'#4a5f7c' },
  { id:'centro',name:'Centro', fullName:'Centro Histórico',      address:'República de Guatemala 20',    priority:4, lat:19.4351227, lng:-99.1327956, color:'#7c4a6a' },
  { id:'studio',name:'Studio', fullName:'Cheché Studio',         address:'Av. Cuauhtémoc 1233',          priority:5, lat:19.3734283, lng:-99.1607971, color:'#5f4a7c' },
]

// Cocina Central: no es una tienda de venta, es el centro de producción y abasto.
// Va aparte de STORES a propósito — así no entra en rutas, alerta de silencio ni
// stock/pan por tienda. Reporta sus propios faltantes (mismo catálogo y estados).
export const CENTRAL_KITCHEN = {
  id:'cocina', name:'Cocina Central', fullName:'Cocina Central', address:'Producción y abasto',
  priority:0, color:'#b45f3c', isCentral:true,
}

// Todas las ubicaciones que pueden reportar (tiendas + cocina central) — úsalo
// para buscar por id; usa STORES solo cuando sea exclusivo de las tiendas.
export const ALL_LOCATIONS = [...STORES, CENTRAL_KITCHEN]

export const ADMINS = ['Victoria','Fernanda','Luis']

// Nota: café en grano, las leches y los panes se quitaron de aquí — ya no se
// reportan con los 4 botones de estado, se capturan como cantidad exacta
// (ver QUANTITY_ITEMS) 3 veces al día. Yogurt griego y carnitas se eliminaron
// del catálogo a petición del usuario.
// `scope`: 'stores' = solo las tiendas lo piden; 'central' = solo Cocina Central
// lo reporta; sin scope = lo ven todos.
export const CATEGORIES = {
  servicios:   { label:'Servicios',       icon:'⚡', critical:true,  items:['Agua','Luz','Internet'] },
  cafeteria:   { label:'Cafetería',       icon:'☕', critical:true,  items:['Agua mineral','Chocolate','Matcha','Chai','Azúcar','Agua tónica','Jugo naranja','Sirope mango','Limones','Crema batida','Crema para batir','Coffee Mate','Sobres azúcar','Sobres splenda','Servilletas','Bolsas pan','Rinza','Cafiza'] },
  desechables: { label:'Desechables',     icon:'🥤', critical:true,  items:['Vaso cartón 12oz','Vaso cartón 16oz','Vaso cristal 16oz','Tapa 12-16oz','Vaso espresso 4oz','Vaso flat white 8oz','Tapa espresso 4oz','Tapa flat white 8oz'] },
  cocina:      { label:'Cocina',          icon:'🍳', critical:true,  items:['Jamón','Queso fresco','Queso de cabra','Queso manchego','Frutos rojos','Granola','Mantequilla','Aceite'] },
  verduras:    { label:'Verduras/Frutas', icon:'🥑', critical:false, items:['Plátano','Jitomate','Naranja','Limones','Aguacates','Chiles secos','Arúgula','Espinaca','Cebolla','Ajo','Chiles verdes'] },
  // Lo que Cocina Central produce y las tiendas solicitan. Misma lista que
  // READY_ITEMS: el nombre debe coincidir para cruzar "lo que pide la tienda"
  // con "lo que la cocina ya tiene listo".
  semiterminados: { label:'Semiterminados', icon:'🥪', critical:true, scope:'stores', items:['Sándwich de tocino','Molletes','Sándwich Barcelona','Sándwich Montecristo','Chilaquiles','Cochinita','Pollo','Horchata','Sirope curaçao','Sirope vainilla'] },
  // Insumos de pan de Cocina Central (arma los sándwiches). Es faltante, no stock.
  pan_insumo:  { label:'Pan', icon:'🥖', critical:true, scope:'central', items:['Pan de hogaza','Pan brioche','Chapatas','Croissants'] },
  limpieza:    { label:'Limpieza',        icon:'🧹', critical:false, items:['Pinol','Cloro','Jabón manos','Jabón trastes','Papel baño','Jergas','Guantes trastes','Fibras','Desengrasante','Bolsas basura'] },
}

// Categorías que puede ver cada ubicación (la cocina no pide semiterminados:
// los produce; las tiendas no ven el pan-insumo de la cocina).
export function categoriesFor(location) {
  return Object.entries(CATEGORIES).filter(([, c]) =>
    !c.scope || (c.scope === 'central') === !!location?.isCentral)
}

// ── Stock "listo para entregar" de Cocina Central ───────────────────────
// Cantidad exacta que la cocina ya tiene preparada para repartir a tiendas.
export const READY_ITEMS = {
  'Sándwich de tocino':  { unit:'pz',   label:'Piezas',    step:1,   max:60 },
  'Molletes':            { unit:'pz',   label:'Piezas',    step:1,   max:60 },
  'Sándwich Barcelona':  { unit:'pz',   label:'Piezas',    step:1,   max:60 },
  'Sándwich Montecristo':{ unit:'pz',   label:'Piezas',    step:1,   max:60 },
  'Chilaquiles':         { unit:'porc', label:'Porciones', step:1,   max:80 },
  'Cochinita':           { unit:'kg',   label:'Kilos',     step:0.5, max:30 },
  'Pollo':               { unit:'kg',   label:'Kilos',     step:0.5, max:30 },
  'Horchata':            { unit:'L',    label:'Litros',    step:1,   max:60 },
  'Sirope curaçao':      { unit:'L',    label:'Litros',    step:0.5, max:20 },
  'Sirope vainilla':     { unit:'L',    label:'Litros',    step:0.5, max:20 },
}

export const CRITICAL_ITEMS = [
  'Agua','Luz','Internet',
  'Matcha','Chai',
  'Cochinita','Pollo',
  'Vaso cartón 12oz','Tapa 12-16oz','Vaso cristal 16oz',
]

// ── Ítems de cantidad exacta ─────────────────────────────────────────────
// Leche (litros), café (kilos), pan (piezas/rebanadas) y totopos: en vez de
// OK/Poco/Urgente/Agotado, el personal captura el número exacto 3 veces al
// día (ver SHIFTS). Café va primero en el objeto a propósito: es el ítem
// prioritario dentro de este grupo (ver PRIORITY_ITEMS) y así aparece
// primero en la lista.
// `group` separa estos ítems en dos pestañas dentro de la tienda (ver
// StoreScreen/StockTab): 'stock' = café/leches/totopos (pestaña 📦 Stock),
// 'pan' = panadería (pestaña 🥖 Pan, con botones de números redondos para
// reportar más rápido — ver ROUND_STEPS).
// Cada ítem define: unidad base fija (`unit`, nadie la escribe a mano),
// `max` = tope plausible (arriba de esto se pide confirmar la captura),
// `min` = nivel bajo (debajo de esto el estado "bajo mínimo" se calcula solo),
// `step` = paso de los controles de captura. Los topes salen del p95 del
// histórico (sep-2026); ajusta `min` por ítem cuando haya consumo real.
export const QUANTITY_ITEMS = {
  'Café en grano':      { unit:'g',  label:'Gramos',          group:'stock', max:15000, min:2000, step:100, warnBelow:50 },
  'Leche entera':       { unit:'L',  label:'Litros',          group:'stock', max:40,    min:5,    step:1 },
  'Leche deslactosada': { unit:'L',  label:'Litros',          group:'stock', max:45,    min:6,    step:1 },
  'Leche almendra':     { unit:'L',  label:'Litros',          group:'stock', max:20,    min:3,    step:1 },
  'Leche avena':        { unit:'L',  label:'Litros',          group:'stock', max:15,    min:2,    step:1 },
  'Totopos':            { unit:'pz', label:'Piezas/bolsas',   group:'stock', max:10,    min:2,    step:1 },
  'Chapatas':           { unit:'pz', label:'Piezas',          group:'pan',   max:40,    min:6,    step:1 },
  'Hogaza':             { unit:'rb', label:'Rebanadas',       group:'pan',   max:60,    min:10,   step:1 },
  'Pan brioche':        { unit:'rb', label:'Rebanadas',       group:'pan',   max:80,    min:10,   step:1 },
  'Pan dulce':          { unit:'pz', label:'Piezas',          group:'pan',   max:40,    min:5,    step:1 },
}

// Ítems de cantidad exacta que se destacan como los más importantes a
// vigilar (aparecen primero + etiqueta ★ PRIORITARIO en la pestaña Stock).
export const PRIORITY_ITEMS = ['Café en grano']

// Botones de número redondo para reportar pan más rápido (tocar en vez de
// teclear) — cubren los rangos típicos de piezas/rebanadas por turno.
export const ROUND_STEPS = [0, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100]

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
