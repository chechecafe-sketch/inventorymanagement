# Che Che Café · Sistema de Faltantes

App mobile-first para reportar faltantes en las 5 tiendas. Stack: React + Vite + Supabase.

## Deploy en Vercel

### 1. Sube el proyecto a GitHub

```bash
git init
git add .
git commit -m "init: cheche-faltantes"
gh repo create cheche-faltantes --private --push
```

### 2. Conecta en Vercel

1. Entra a vercel.com → "Add New Project"
2. Importa el repo `cheche-faltantes`
3. Framework: **Vite** (se detecta automático)
4. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = `https://flundjmctddrlnzndbvm.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (la key del .env.example)
5. Deploy → queda en `cheche-faltantes.vercel.app`

### 3. Comparte la URL con cada tienda

Cada tienda accede desde su celular, selecciona su sucursal y entra con su nombre.
El Dashboard Admin está en el mismo URL → botón "Admin ›" → PIN: `1234`.

## Estructura de Supabase

Tablas creadas en proyecto `flundjmctddrlnzndbvm`:
- `faltantes` — estado actual por tienda+ítem
- `faltantes_log` — historial de cada cambio
- `consumo_historico` — ciclos de consumo para predicción
- `faltantes_items_custom` — ítems agregados por empleados

## Cambiar el PIN de Admin

En `src/constants.js`, cambia `ADMIN_PIN = '1234'` por el PIN que quieras.

## Admins registrados

En `src/constants.js`, `ADMINS = ['Victoria','Fernanda','Luis']`
