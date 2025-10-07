# ✅ RESUMEN: ESTRUCTURA CON WORDPRESS

## 🎯 ESTRUCTURA FINAL

```
┌─────────────────────────────────────────────────┐
│ agutidesigns.es (WordPress en IONOS)           │
│ Landing Page                                     │
│                                                  │
│  [Botón CTA] → formulario.agutidesigns.es      │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│ formulario.agutidesigns.es (Vercel)            │
│ Formulario → /checkout → /success              │
│                                                  │
│  [Acceder Dashboard] → panel.agutidesigns.es   │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│ panel.agutidesigns.es (Vercel)                 │
│ Dashboard Cliente                               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ admin.agutidesigns.es (Vercel)                 │
│ Dashboard Admin                                 │
└─────────────────────────────────────────────────┘
```

---

## 📋 CHECKLIST DE TAREAS

### ✅ **YA HECHO (Código)**
- [x] Código actualizado y pusheado
- [x] URLs en backend actualizadas
- [x] Emails con URLs correctas
- [x] vercel.json configurado

---

### 🔲 **TU TAREA (5 pasos)**

#### **1️⃣ WORDPRESS (2 minutos)**

En tu landing de WordPress:

1. Accede al editor de tu página
2. Encuentra el botón de CTA principal
3. **Cambia el enlace a:**
   ```
   https://formulario.agutidesigns.es
   ```
4. Guarda y publica

---

#### **2️⃣ VERCEL - Proyecto Formulario (5 minutos)**

Tu proyecto actual en Vercel:

1. Ve a tu proyecto en Vercel
2. Settings → Domains
3. **Añadir:** `formulario.agutidesigns.es`
4. Copia los registros DNS que te muestra Vercel

---

#### **3️⃣ VERCEL - Dashboard Cliente (5 minutos)**

Crear nuevo proyecto:

1. https://vercel.com/new
2. Selecciona tu repo
3. **Root Directory:** `client-dashboard`
4. Deploy
5. Settings → Domains
6. **Añadir:** `panel.agutidesigns.es`
7. Settings → Environment Variables
8. **Añadir:**
   ```
   API_URL=https://agutidesigns-production.up.railway.app
   ```

---

#### **4️⃣ VERCEL - Dashboard Admin (5 minutos)**

Crear nuevo proyecto:

1. https://vercel.com/new
2. Selecciona tu repo
3. **Root Directory:** `admin-dashboard`
4. Deploy
5. Settings → Domains
6. **Añadir:** `admin.agutidesigns.es`
7. Settings → Environment Variables
8. **Añadir:**
   ```
   API_URL=https://agutidesigns-production.up.railway.app
   ```

---

#### **5️⃣ IONOS - DNS (3 minutos)**

En tu panel de IONOS:

1. Dominios → `agutidesigns.es`
2. Configuración DNS
3. **Añadir estos 3 registros CNAME:**

```
Tipo: CNAME
Nombre: formulario
Valor: cname.vercel-dns.com
TTL: 3600
```

```
Tipo: CNAME
Nombre: panel
Valor: cname.vercel-dns.com
TTL: 3600
```

```
Tipo: CNAME
Nombre: admin
Valor: cname.vercel-dns.com
TTL: 3600
```

**⚠️ IMPORTANTE:** NO toques los registros A o MX de tu dominio principal.

---

#### **6️⃣ RAILWAY - Variables (2 minutos)**

En Railway → tu proyecto → Variables:

**Actualizar:**
```
FRONTEND_URL=https://formulario.agutidesigns.es
```

**Verificar que incluya:**
```
ALLOWED_ORIGINS=https://agutidesigns.es,https://formulario.agutidesigns.es,https://panel.agutidesigns.es,https://admin.agutidesigns.es
```

---

## ⏱️ TIEMPO TOTAL: ~25 minutos + 2-4h de propagación DNS

---

## 🧪 VERIFICAR (Después de propagación DNS)

### **Flujo completo:**

1. ✅ `agutidesigns.es` → Muestra tu landing de WordPress
2. ✅ Click en botón → Redirige a `formulario.agutidesigns.es`
3. ✅ Rellenar formulario → Redirige a `/checkout`
4. ✅ Pagar (modo test) → Redirige a `/success`
5. ✅ Click "Acceder a Mi Dashboard" → Redirige a `panel.agutidesigns.es`
6. ✅ Login funciona
7. ✅ Dashboard carga datos

### **Acceso admin:**

8. ✅ `admin.agutidesigns.es` → Login admin
9. ✅ Dashboard admin carga datos

---

## 🚨 SI ALGO FALLA

### **"DNS_PROBE_FINISHED_NXDOMAIN"**
→ DNS aún no ha propagado. Espera 2-4 horas más.

### **"CORS policy error"**
→ Verifica ALLOWED_ORIGINS en Railway.

### **"404 Not Found" en subdominios**
→ Verifica que los proyectos de Vercel estén desplegados y con el dominio añadido.

### **Botón de WordPress no funciona**
→ Limpia caché de WordPress y del navegador.

---

## 📄 GUÍA COMPLETA

Para más detalles: **MIGRACION-DOMINIOS-COMPLETA.md**

---

**¡Todo listo! Empieza con el paso 1 (WordPress) y continúa en orden.** 🚀

