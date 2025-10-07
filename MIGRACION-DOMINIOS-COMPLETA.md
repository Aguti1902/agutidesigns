# 🌐 MIGRACIÓN A DOMINIOS Y SUBDOMINIOS

## 📍 ESTRUCTURA FINAL

```
agutidesigns.es (WordPress - Hosting IONOS)
└── / (Landing page en WordPress)
    └── Botón → https://formulario.agutidesigns.es

formulario.agutidesigns.es (Proyecto Vercel - Formulario)
├── / (formulario-membresia.html)
├── /checkout (checkout.html)
├── /success (success.html)
└── /reset-password (reset-password.html)

panel.agutidesigns.es (Proyecto Vercel - Dashboard Cliente)
└── / (client-dashboard/index.html)

admin.agutidesigns.es (Proyecto Vercel - Dashboard Admin)
├── / (admin-dashboard/index.html)
└── /pedido-detalle (pedido-detalle.html)
```

---

## 🎯 PARTE 1: CONFIGURACIÓN EN VERCEL

### **1. Proyecto Formulario (formulario.agutidesigns.es)**

**Paso 1:** Ir a tu proyecto actual en Vercel (donde está el formulario)

1. Ve a tu proyecto en Vercel
2. Settings → Domains
3. **ELIMINAR** cualquier dominio `agutidesigns.vercel.app` o `agutidesigns.es` si existe
4. **AÑADIR:** `formulario.agutidesigns.es`
5. Vercel te mostrará registros DNS para configurar

**Paso 2:** Variables de entorno

Verifica que el proyecto tenga (si no las tiene, añádelas):

```
API_URL=https://agutidesigns-production.up.railway.app
STRIPE_PUBLIC_KEY=[tu key]
```

---

### **2. Dashboard Cliente (panel.agutidesigns.es)**

**Paso 1:** Crear nuevo proyecto en Vercel

1. Ve a https://vercel.com/new
2. Selecciona tu repositorio de GitHub
3. **Root Directory:** `client-dashboard`
4. **Framework Preset:** Other
5. **Build Command:** (dejar vacío)
6. **Output Directory:** (dejar vacío)
7. Click en "Deploy"

**Paso 2:** Añadir dominio custom

1. En el nuevo proyecto → Settings → Domains
2. Añadir: `panel.agutidesigns.es`
3. Vercel te mostrará registros DNS para configurar

**Paso 3:** Variables de entorno

En el proyecto del dashboard cliente, ve a Settings → Environment Variables y añade:

```
API_URL=https://agutidesigns-production.up.railway.app
```

---

### **3. Dashboard Admin (admin.agutidesigns.es)**

**Paso 1:** Crear nuevo proyecto en Vercel

1. Ve a https://vercel.com/new
2. Selecciona tu repositorio de GitHub
3. **Root Directory:** `admin-dashboard`
4. **Framework Preset:** Other
5. **Build Command:** (dejar vacío)
6. **Output Directory:** (dejar vacío)
7. Click en "Deploy"

**Paso 2:** Añadir dominio custom

1. En el nuevo proyecto → Settings → Domains
2. Añadir: `admin.agutidesigns.es`
3. Vercel te mostrará registros DNS para configurar

**Paso 3:** Variables de entorno

En el proyecto del dashboard admin, ve a Settings → Environment Variables y añade:

```
API_URL=https://agutidesigns-production.up.railway.app
```

---

## 🌐 PARTE 2: CONFIGURACIÓN DNS EN IONOS

### **Acceder al Panel DNS de IONOS**

1. Inicia sesión en https://www.ionos.es
2. Ve a "Dominios y SSL"
3. Selecciona `agutidesigns.es`
4. Click en "Configuración DNS"

---

### **Registros DNS a Añadir**

**IMPORTANTE:** `agutidesigns.es` ya está configurado para tu WordPress en IONOS. **NO TOQUES** los registros principales (A, MX, etc.).

Solo necesitas añadir **3 subdominios CNAME:**

#### **1. Subdominio Formulario (formulario.agutidesigns.es)**

```
Tipo: CNAME
Nombre: formulario
Valor: cname.vercel-dns.com
TTL: 3600
```

#### **2. Subdominio Panel (panel.agutidesigns.es)**

```
Tipo: CNAME
Nombre: panel
Valor: cname.vercel-dns.com
TTL: 3600
```

#### **3. Subdominio Admin (admin.agutidesigns.es)**

```
Tipo: CNAME
Nombre: admin
Valor: cname.vercel-dns.com
TTL: 3600
```

---

## ⏱️ TIEMPOS DE PROPAGACIÓN

- **DNS:** 1-48 horas (normalmente 2-4 horas)
- **SSL:** Se genera automáticamente cuando el DNS esté propagado

---

## 🔧 PARTE 3: CONFIGURACIÓN EN RAILWAY (Backend)

Ve a tu proyecto en Railway → Variables y añade/actualiza:

```
CLIENT_DASHBOARD_URL=https://panel.agutidesigns.es
ADMIN_DASHBOARD_URL=https://admin.agutidesigns.es
FRONTEND_URL=https://formulario.agutidesigns.es

# CORS (IMPORTANTE: incluye todos los subdominios)
ALLOWED_ORIGINS=https://agutidesigns.es,https://formulario.agutidesigns.es,https://panel.agutidesigns.es,https://admin.agutidesigns.es
```

---

## ✅ PARTE 4: VERIFICACIÓN

### **1. Dominio Principal (WordPress)**

- ✅ https://agutidesigns.es → Landing page de WordPress
- ✅ Botón en landing → debe redirigir a `formulario.agutidesigns.es`

### **2. Formulario y Checkout**

Verifica estas URLs (después de la propagación DNS):

- ✅ https://formulario.agutidesigns.es → Formulario
- ✅ https://formulario.agutidesigns.es/checkout → Checkout
- ✅ https://formulario.agutidesigns.es/success → Success page

### **3. Dashboard Cliente**

- ✅ https://panel.agutidesigns.es → Login cliente
- ✅ Probar login con cuenta de prueba
- ✅ Verificar que carga datos del backend

### **3. Dashboard Admin**

- ✅ https://admin.agutidesigns.es → Login admin
- ✅ Probar login con cuenta admin
- ✅ Verificar que carga datos del backend

### **5. Flujo Completo de Usuario**

1. ✅ Usuario visita `agutidesigns.es` (WordPress)
2. ✅ Click en botón → redirige a `formulario.agutidesigns.es`
3. ✅ Llenar formulario en `formulario.agutidesigns.es`
4. ✅ Redirige a `formulario.agutidesigns.es/checkout`
5. ✅ Hacer pago de prueba
6. ✅ Redirige a `formulario.agutidesigns.es/success`
7. ✅ Botón "Acceder a Mi Dashboard" → redirige a `panel.agutidesigns.es`
8. ✅ Login funciona correctamente
9. ✅ Dashboard carga datos del backend

---

## 🚨 TROUBLESHOOTING

### **Error: "DNS_PROBE_FINISHED_NXDOMAIN"**

**Causa:** DNS aún no ha propagado
**Solución:** Esperar 2-4 horas más

### **Error: "ERR_TOO_MANY_REDIRECTS"**

**Causa:** Conflicto en configuración de Vercel
**Solución:** Verificar que solo haya UN dominio principal por proyecto

### **Error: "CORS policy"**

**Causa:** Backend no permite el nuevo dominio
**Solución:** Verificar `ALLOWED_ORIGINS` en Railway

### **Error: SSL Certificate Invalid**

**Causa:** SSL aún no se ha generado
**Solución:** Esperar 10-20 minutos después de la propagación DNS

---

## 📝 RESUMEN DE CAMBIOS EN EL CÓDIGO

### ✅ **Archivos Actualizados:**

1. **vercel.json** (raíz)
   - Añadidas rutas limpias (slugs)

2. **client-dashboard/vercel.json** (nuevo)
   - Configuración para subdominio

3. **admin-dashboard/vercel.json** (nuevo)
   - Configuración para subdominio

4. **backend/server.js**
   - URLs actualizadas a nuevos dominios

5. **success.html**
   - Botón redirige a `panel.agutidesigns.es`

6. **checkout.html**
   - Redirige a `/success` (ruta limpia)

7. **formulario-membresia.html**
   - Redirige a `/checkout` (ruta limpia)

8. **backend/email-service.js**
   - Todos los enlaces actualizados

---

## 🎯 SIGUIENTE PASO

### **✅ CÓDIGO YA ACTUALIZADO Y PUSHEADO**

El código ya está listo y pusheado a GitHub. Ahora debes:

### **1. En tu Landing de WordPress:**

En tu página de WordPress (agutidesigns.es), actualiza el botón/link que redirige al formulario:

```
Antes: https://agutidesigns.vercel.app/formulario-membresia.html
Ahora:  https://formulario.agutidesigns.es
```

**Cómo hacerlo en WordPress:**
1. Edita la página de tu landing
2. Encuentra el botón de CTA (Call to Action)
3. Cambia el enlace a: `https://formulario.agutidesigns.es`
4. Guarda y publica

### **2. Configurar Vercel:**

**A. Proyecto actual (formulario):**
- Settings → Domains
- Cambiar a: `formulario.agutidesigns.es`

**B. Crear 2 nuevos proyectos:**
- `panel.agutidesigns.es` (client-dashboard)
- `admin.agutidesigns.es` (admin-dashboard)

(Ver instrucciones detalladas en **Parte 1** arriba)

### **3. Configurar DNS en IONOS:**

Añadir 3 registros CNAME (Ver **Parte 2** arriba):
- `formulario` → cname.vercel-dns.com
- `panel` → cname.vercel-dns.com
- `admin` → cname.vercel-dns.com

### **4. Actualizar variables en Railway:**

(Ver **Parte 3** arriba)

### **5. Verificar todo:**

(Ver **Parte 4** arriba)

---

## 📞 SOPORTE

Si tienes problemas:

1. Verifica los logs de Railway
2. Verifica los logs de Vercel (cada proyecto)
3. Usa las herramientas de debugging de tu navegador
4. Verifica el estado de propagación DNS: https://dnschecker.org

---

**¡Listo! Una vez hecho todo esto, tendrás tu estructura de dominios completamente profesional.** 🚀

