# 🚀 GUÍA COMPLETA DE CONFIGURACIÓN - agutidesigns

## ✅ Archivos Creados

### Backend (Node.js + Express)
- ✅ `backend/package.json` - Dependencias
- ✅ `backend/server.js` - Servidor principal
- ✅ `backend/database.js` - Base de datos SQLite
- ✅ `backend/email-service.js` - Envío de emails
- ✅ `backend/env.example` - Plantilla de configuración
- ✅ `backend/README.md` - Documentación

### Frontend
- ✅ `formulario-membresia.html` - Formulario de registro (YA FUNCIONAL)
- ✅ `success.html` - Página de éxito después del pago
- ✅ `admin-dashboard/index.html` - Dashboard de administrador

---

## 📋 PASO 1: Configurar Stripe (20 minutos)

### A) Crear cuenta en Stripe
1. Ve a: https://dashboard.stripe.com/register
2. Completa el registro (usa tu email de agutidesigns)
3. **Mantente en modo TEST** (no actives pagos reales aún)

### B) Obtener claves de API
1. Ve a: https://dashboard.stripe.com/test/apikeys
2. Verás 2 claves:
   ```
   Publishable key: pk_test_51...
   Secret key: sk_test_51...
   ```
3. **GUÁRDALAS** (las necesitarás en el paso 2)

### C) Crear productos de suscripción
1. Ve a: https://dashboard.stripe.com/test/products
2. Clic en **"+ Add product"**
3. Crea estos 3 productos:

**Producto 1: Plan Básico**
- Name: `Plan Básico Agutidesigns`
- Description: `5 páginas, entrega en 5 días`
- Pricing:
  - Model: `Recurring`
  - Price: `35 EUR`
  - Billing period: `Monthly`
- Clic en **Save product**
- **COPIA EL PRICE ID** (empieza con `price_...`)

**Producto 2: Plan Avanzado**
- Name: `Plan Avanzado Agutidesigns`
- Description: `10 páginas, entrega en 7 días`
- Pricing:
  - Model: `Recurring`
  - Price: `49 EUR`
  - Billing period: `Monthly`
- Clic en **Save product**
- **COPIA EL PRICE ID**

**Producto 3: Plan Premium**
- Name: `Plan Premium Agutidesigns`
- Description: `15 páginas, entrega en 10 días`
- Pricing:
  - Model: `Recurring`
  - Price: `65 EUR`
  - Billing period: `Monthly`
- Clic en **Save product**
- **COPIA EL PRICE ID**

### D) Configurar Webhook (IMPORTANTE)
1. Ve a: https://dashboard.stripe.com/test/webhooks
2. Clic en **"Add endpoint"**
3. Endpoint URL: `http://localhost:3000/webhook` (cambiarás esto después)
4. Events to send:
   - Selecciona: `checkout.session.completed`
   - Selecciona: `customer.subscription.updated`
   - Selecciona: `customer.subscription.deleted`
5. Clic en **Add endpoint**
6. **COPIA EL "Signing secret"** (empieza con `whsec_...`)

---

## 📋 PASO 2: Instalar Backend (10 minutos)

### A) Instalar Node.js (si no lo tienes)
```bash
# Verificar si ya lo tienes
node --version

# Si no lo tienes, descarga de:
# https://nodejs.org/ (versión LTS)
```

### B) Instalar dependencias
```bash
cd backend
npm install
```

### C) Configurar variables de entorno
```bash
# Copiar plantilla
cp env.example .env

# Editar con tus datos
nano .env
```

**Reemplaza en el archivo .env:**
```bash
# STRIPE KEYS
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_SECRETA_AQUI
STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_PUBLICA_AQUI
STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET_AQUI

# STRIPE PRICE IDs
STRIPE_PRICE_BASICO=price_BASICO_ID_AQUI
STRIPE_PRICE_AVANZADO=price_AVANZADO_ID_AQUI
STRIPE_PRICE_PREMIUM=price_PREMIUM_ID_AQUI

# EMAIL (configura tu Gmail)
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=contraseña_app_gmail
ADMIN_EMAIL=tu_email@gmail.com

# ADMIN CREDENTIALS
ADMIN_USERNAME=admin
ADMIN_PASSWORD=TuPasswordSegura123
```

### D) Configurar Gmail para emails
1. Ve a: https://myaccount.google.com/security
2. Activa **"Verificación en 2 pasos"**
3. Ve a: https://myaccount.google.com/apppasswords
4. Crea una contraseña de aplicación
5. Cópiala en `EMAIL_PASS` del archivo `.env`

---

## 📋 PASO 3: Iniciar Todo (5 minutos)

### A) Iniciar el backend
```bash
cd backend
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3000
📊 Dashboard admin: http://localhost:3000/admin
💳 Webhook URL: http://localhost:3000/webhook
```

### B) Abrir el formulario
```bash
# En otra terminal
open formulario-membresia.html
```

O simplemente abre el archivo con Live Server de VS Code.

### C) Probar el dashboard
Ve a: http://localhost:3000/admin

Credenciales:
- Usuario: `admin`
- Contraseña: (la que pusiste en `.env`)

---

## 🧪 PASO 4: Probar el Sistema

### Tarjetas de prueba de Stripe:
- ✅ **Exitosa**: `4242 4242 4242 4242`
- ❌ **Fallida**: `4000 0000 0000 0002`
- Fecha: cualquier fecha futura
- CVV: cualquier 3 dígitos

### Flujo completo:
1. Abre `formulario-membresia.html`
2. Completa todos los campos
3. Clic en "Enviar y Proceder al Pago"
4. Usa la tarjeta `4242 4242 4242 4242`
5. Completa el pago en Stripe
6. Serás redirigido a `success.html`
7. Recibirás un email de confirmación
8. Ve al dashboard: http://localhost:3000/admin
9. Verás la solicitud pagada

---

## 🚨 PROBLEMAS COMUNES

### "Cannot find module"
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### "ECONNREFUSED" en el formulario
- Asegúrate de que el backend esté corriendo
- Verifica que sea http://localhost:3000

### Webhook no funciona
- En desarrollo local, usa ngrok:
```bash
brew install ngrok
ngrok http 3000
```
- Copia la URL https://xxxx.ngrok.io
- Actualízala en Stripe Dashboard Webhooks

### Emails no se envían
- Verifica que EMAIL_USER y EMAIL_PASS sean correctos
- Usa una contraseña de aplicación de Gmail, no tu contraseña normal

---

## 🎉 ¡TODO LISTO!

Cuando todo funcione en local, el siguiente paso será:
1. Desplegar a producción (Railway/Render)
2. Cambiar Stripe a modo "Live"
3. Configurar dominio real

¿Alguna duda? Revisa los logs del servidor o contacta.
