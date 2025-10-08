# ⚡ GUÍA RÁPIDA: Implementación con Subdominios

## 🎯 RESULTADO FINAL

```
agutidesigns.es
└── Landing WordPress → Botón redirige a ↓

formulario.agutidesigns.es
├── / → Formulario
├── /checkout → Pago
└── /success → Confirmación → Botón redirige a ↓

panel.agutidesigns.es
└── Dashboard de clientes

admin.agutidesigns.es
└── Dashboard de administración
```

---

## ✅ CÓDIGO: YA ESTÁ LISTO

Todo el código está actualizado y pusheado en GitHub. Ahora solo configuración.

---

## 📋 PASO A PASO (25 minutos)

### **PASO 1: WordPress - Cambiar botón (2 min)**

1. Accede a tu WordPress en agutidesigns.es
2. Edita la página principal (landing)
3. Encuentra el botón CTA principal
4. **Cambia el enlace a:**
   ```
   https://formulario.agutidesigns.es
   ```
5. Guarda y publica

---

### **PASO 2: Vercel - Proyecto Formulario (5 min)**

#### **A. Ir a tu proyecto actual**

1. Ve a https://vercel.com
2. Entra en tu proyecto actual (donde está el formulario)

#### **B. Añadir el subdominio**

1. Settings → Domains
2. Click en "Add Domain"
3. Escribe: `formulario.agutidesigns.es`
4. Click en "Add"

#### **C. Vercel te mostrará algo así:**

```
To configure formulario.agutidesigns.es, add the following record to your DNS provider:

Type: CNAME
Name: formulario
Value: cname.vercel-dns.com
```

**Guarda esta información** para el Paso 4.

---

### **PASO 3: Vercel - Dashboard Cliente (8 min)**

#### **A. Crear nuevo proyecto**

1. Ve a https://vercel.com/new
2. Click en "Import Git Repository"
3. Selecciona tu repositorio: `agutidesigns`
4. **IMPORTANTE:** En "Configure Project":
   ```
   Root Directory: client-dashboard
   ```
   (Click en "Edit" al lado de "Root Directory" y escribe `client-dashboard`)
5. Framework Preset: Other
6. Build Command: (dejar vacío)
7. Output Directory: (dejar vacío)
8. Click en "Deploy"

#### **B. Esperar el deploy** (1-2 min)

Vercel desplegará el proyecto. Verás un mensaje "Congratulations!" cuando termine.

#### **C. Añadir el subdominio**

1. En el proyecto recién creado → Settings → Domains
2. Click en "Add Domain"
3. Escribe: `panel.agutidesigns.es`
4. Click en "Add"

**Guarda la información DNS** que te muestre.

#### **D. Añadir variables de entorno**

1. Settings → Environment Variables
2. Click en "Add New"
3. **Añadir:**
   ```
   Key: API_URL
   Value: https://agutidesigns-production.up.railway.app
   ```
4. Click en "Save"
5. **Redeploy** el proyecto (Deployments → Latest → "Redeploy")

---

### **PASO 4: Vercel - Dashboard Admin (8 min)**

#### **A. Crear nuevo proyecto**

1. Ve a https://vercel.com/new
2. Click en "Import Git Repository"
3. Selecciona tu repositorio: `agutidesigns`
4. **IMPORTANTE:** En "Configure Project":
   ```
   Root Directory: admin-dashboard
   ```
5. Framework Preset: Other
6. Build Command: (dejar vacío)
7. Output Directory: (dejar vacío)
8. Click en "Deploy"

#### **B. Esperar el deploy** (1-2 min)

#### **C. Añadir el subdominio**

1. Settings → Domains
2. Click en "Add Domain"
3. Escribe: `admin.agutidesigns.es`
4. Click en "Add"

**Guarda la información DNS** que te muestre.

#### **D. Añadir variables de entorno**

1. Settings → Environment Variables
2. **Añadir:**
   ```
   Key: API_URL
   Value: https://agutidesigns-production.up.railway.app
   ```
3. Click en "Save"
4. **Redeploy** el proyecto

---

### **PASO 5: IONOS - Configurar DNS (3 min)**

#### **A. Acceder al panel DNS**

1. Ve a https://www.ionos.es
2. Inicia sesión
3. Ve a "Dominios y SSL"
4. Click en `agutidesigns.es`
5. Click en "DNS" o "Configuración DNS"

#### **B. Añadir 3 registros CNAME**

**IMPORTANTE:** NO toques ningún registro existente (A, MX, TXT). Solo AÑADE estos 3 nuevos:

**Registro 1:**
```
Tipo: CNAME
Nombre: formulario
Destino: cname.vercel-dns.com
TTL: 3600 (o automático)
```

**Registro 2:**
```
Tipo: CNAME
Nombre: panel
Destino: cname.vercel-dns.com
TTL: 3600
```

**Registro 3:**
```
Tipo: CNAME
Nombre: admin
Destino: cname.vercel-dns.com
TTL: 3600
```

#### **C. Guardar cambios**

Click en "Guardar" o "Aplicar cambios"

**⏱️ Propagación DNS:** 5 minutos a 4 horas (normalmente 15-30 min)

---

### **PASO 6: Railway - Variables de entorno (2 min)**

#### **A. Acceder a Railway**

1. Ve a https://railway.app
2. Selecciona tu proyecto (backend)
3. Click en "Variables"

#### **B. Añadir/Actualizar variables**

Busca estas variables y actualízalas (si no existen, créalas):

```
FRONTEND_URL=https://formulario.agutidesigns.es
CLIENT_DASHBOARD_URL=https://panel.agutidesigns.es
ADMIN_DASHBOARD_URL=https://admin.agutidesigns.es
```

#### **C. Verificar CORS**

Busca la variable `ALLOWED_ORIGINS` y asegúrate de que incluya:

```
ALLOWED_ORIGINS=https://agutidesigns.es,https://formulario.agutidesigns.es,https://panel.agutidesigns.es,https://admin.agutidesigns.es
```

Si no existe, créala con ese valor.

#### **D. Guardar**

Railway se redesplegará automáticamente con las nuevas variables.

---

## ⏱️ ESPERANDO PROPAGACIÓN DNS

Después de configurar IONOS, espera **15-30 minutos** para que el DNS se propague.

Mientras tanto, puedes verificar el estado en:
- https://dnschecker.org

Escribe tu subdominio (ej: `formulario.agutidesigns.es`) y verifica que apunte a Vercel.

---

## ✅ VERIFICAR QUE TODO FUNCIONA

### **Paso 1: Verificar subdominios (después de propagación DNS)**

Abre estas URLs en tu navegador:

1. **Formulario:**
   ```
   https://formulario.agutidesigns.es
   ```
   Deberías ver el formulario de membresía.

2. **Panel cliente:**
   ```
   https://panel.agutidesigns.es
   ```
   Deberías ver la página de login del cliente.

3. **Admin:**
   ```
   https://admin.agutidesigns.es
   ```
   Deberías ver la página de login del admin.

---

### **Paso 2: Probar el flujo completo**

1. ✅ Ve a `agutidesigns.es` (tu WordPress)
2. ✅ Click en el botón CTA
3. ✅ Deberías ir a `formulario.agutidesigns.es`
4. ✅ Rellena el formulario (puedes usar datos de prueba)
5. ✅ Click en "Ir al pago"
6. ✅ Deberías ir a `formulario.agutidesigns.es/checkout`
7. ✅ Usa una tarjeta de prueba de Stripe:
   ```
   Número: 4242 4242 4242 4242
   Fecha: 12/34
   CVC: 123
   ```
8. ✅ Después del pago, deberías ir a `formulario.agutidesigns.es/success`
9. ✅ Click en "Acceder a Mi Dashboard"
10. ✅ Deberías ir a `panel.agutidesigns.es`
11. ✅ Inicia sesión con el email que usaste en el formulario
12. ✅ Verifica que el dashboard cargue correctamente

---

### **Paso 3: Verificar admin**

1. ✅ Ve a `admin.agutidesigns.es`
2. ✅ Inicia sesión con tu cuenta de admin
3. ✅ Verifica que veas el nuevo cliente en "Clientes"
4. ✅ Verifica que veas el nuevo proyecto en el Kanban
5. ✅ Verifica que las estadísticas se actualicen

---

## 🚨 TROUBLESHOOTING

### **"DNS_PROBE_FINISHED_NXDOMAIN"**
**Causa:** DNS aún no ha propagado
**Solución:** Espera 15-30 minutos más y recarga

### **"This site can't provide a secure connection" (ERR_SSL_VERSION_OR_CIPHER_MISMATCH)**
**Causa:** SSL aún no se ha generado en Vercel
**Solución:** Espera 10-15 minutos después de que DNS propague

### **"404 - File Not Found"**
**Causa:** Vercel no encuentra el archivo
**Solución:** Verifica el "Root Directory" en Vercel (debe ser `client-dashboard` o `admin-dashboard`)

### **"Access to fetch... has been blocked by CORS policy"**
**Causa:** Railway no permite el dominio
**Solución:** Verifica `ALLOWED_ORIGINS` en Railway

### **El formulario muestra error al enviar**
**Causa:** Variables de entorno no configuradas
**Solución:** Verifica `API_URL` en las variables de entorno de Vercel

### **El botón de WordPress no redirige**
**Causa:** Caché de WordPress
**Solución:** Limpia caché de WordPress y del navegador (Ctrl+Shift+R)

---

## 📞 SI NECESITAS AYUDA

Si algo no funciona:

1. **Verifica los logs de Railway:**
   - Railway → tu proyecto → "View Logs"
   - Busca errores de CORS o conexión

2. **Verifica los logs de Vercel:**
   - Vercel → tu proyecto → "Logs"
   - Busca errores 404 o 500

3. **Verifica DNS:**
   - https://dnschecker.org
   - Comprueba que apunte a Vercel

4. **Verifica SSL:**
   - Vercel → Settings → Domains
   - Cada dominio debe tener "SSL: Valid"

---

## 🎉 ¡LISTO!

Una vez que todo funcione:

✅ WordPress en `agutidesigns.es`
✅ Formulario en `formulario.agutidesigns.es`
✅ Dashboard cliente en `panel.agutidesigns.es`
✅ Dashboard admin en `admin.agutidesigns.es`
✅ Todos los flujos conectados y funcionando

**¡Tu sistema está completo y profesional!** 🚀

---

## 📝 RESUMEN DE URLS

```
🌐 PRODUCCIÓN:
Landing:     https://agutidesigns.es
Formulario:  https://formulario.agutidesigns.es
Checkout:    https://formulario.agutidesigns.es/checkout
Success:     https://formulario.agutidesigns.es/success
Panel:       https://panel.agutidesigns.es
Admin:       https://admin.agutidesigns.es

🔧 BACKEND:
API:         https://agutidesigns-production.up.railway.app
```

---

**¿Listo para empezar con el Paso 1?** 💪

