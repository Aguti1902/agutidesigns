# 🌐 MIGRACIÓN A DOMINIOS Y SUBDOMINIOS

## 📍 ESTRUCTURA FINAL

```
agutidesigns.es (Proyecto principal - Vercel)
├── / (landing page - index.html)
├── /formulario (formulario-membresia.html)
├── /checkout (checkout.html)
├── /success (success.html)
└── /reset-password (reset-password.html)

panel.agutidesigns.es (Dashboard Cliente - Vercel separado)
└── / (client-dashboard/index.html)

admin.agutidesigns.es (Dashboard Admin - Vercel separado)
├── / (admin-dashboard/index.html)
└── /pedido-detalle (pedido-detalle.html)
```

---

## 🎯 PARTE 1: CONFIGURACIÓN EN VERCEL

### **1. Proyecto Principal (agutidesigns.es)**

Este ya está configurado. Solo debes:

1. Ir a tu proyecto en Vercel
2. Settings → Domains
3. Añadir: `agutidesigns.es`
4. Vercel te dará instrucciones específicas para IONOS

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

#### **1. Dominio Principal (agutidesigns.es)**

Vercel te proporcionará estos registros cuando añadas el dominio. Típicamente serán:

```
Tipo: A
Nombre: @ (o dejar vacío)
Valor: [IP de Vercel] (ejemplo: 76.76.21.21)
TTL: 3600
```

```
Tipo: CNAME
Nombre: www
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
FRONTEND_URL=https://agutidesigns.es

# CORS (ya debería estar, pero verifica)
ALLOWED_ORIGINS=https://agutidesigns.es,https://panel.agutidesigns.es,https://admin.agutidesigns.es
```

---

## ✅ PARTE 4: VERIFICACIÓN

### **1. Dominio Principal**

Verifica estas URLs (después de la propagación DNS):

- ✅ https://agutidesigns.es → Landing page
- ✅ https://agutidesigns.es/formulario → Formulario
- ✅ https://agutidesigns.es/checkout → Checkout
- ✅ https://agutidesigns.es/success → Success page

### **2. Dashboard Cliente**

- ✅ https://panel.agutidesigns.es → Login cliente
- ✅ Probar login con cuenta de prueba
- ✅ Verificar que carga datos del backend

### **3. Dashboard Admin**

- ✅ https://admin.agutidesigns.es → Login admin
- ✅ Probar login con cuenta admin
- ✅ Verificar que carga datos del backend

### **4. Flujo Completo**

1. ✅ Llenar formulario en `/formulario`
2. ✅ Redirige a `/checkout`
3. ✅ Hacer pago de prueba
4. ✅ Redirige a `/success`
5. ✅ Botón redirige a `panel.agutidesigns.es`
6. ✅ Login funciona correctamente
7. ✅ Dashboard carga datos

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

1. **Commit y push del código:**
   ```bash
   git add .
   git commit -m "feat: migración a dominios y subdominios

   - agutidesigns.es: landing + formulario
   - panel.agutidesigns.es: dashboard cliente
   - admin.agutidesigns.es: dashboard admin
   - Rutas limpias (slugs) configuradas
   - URLs actualizadas en backend y emails"
   git push origin main
   ```

2. **Crear proyectos en Vercel** (siguiendo Parte 1)

3. **Configurar DNS en IONOS** (siguiendo Parte 2)

4. **Actualizar variables en Railway** (siguiendo Parte 3)

5. **Verificar todo** (siguiendo Parte 4)

---

## 📞 SOPORTE

Si tienes problemas:

1. Verifica los logs de Railway
2. Verifica los logs de Vercel (cada proyecto)
3. Usa las herramientas de debugging de tu navegador
4. Verifica el estado de propagación DNS: https://dnschecker.org

---

**¡Listo! Una vez hecho todo esto, tendrás tu estructura de dominios completamente profesional.** 🚀

