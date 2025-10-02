# 🚀 Backend Agutidesigns - Guía de Configuración

## 📋 Requisitos Previos
- Node.js instalado (v16 o superior)
- Cuenta de Stripe
- Gmail o proveedor de email

## ⚡ Instalación Rápida

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Configurar variables de entorno
Copia `env.example` a `.env` y configura:

```bash
cp env.example .env
nano .env
```

### 3. Configurar Stripe

#### A) Obtener claves de API
1. Ve a: https://dashboard.stripe.com/apikeys
2. Copia las claves (modo Test para empezar):
   - `Publishable key` → STRIPE_PUBLISHABLE_KEY
   - `Secret key` → STRIPE_SECRET_KEY

#### B) Crear productos de suscripción
1. Ve a: https://dashboard.stripe.com/products
2. Crea 3 productos:
   - **Plan Básico**: 35€/mes recurrente
   - **Plan Avanzado**: 49€/mes recurrente
   - **Plan Premium**: 65€/mes recurrente
3. Copia los `Price ID` (empiezan con `price_...`) de cada uno
4. Pégalos en tu `.env`:
   ```
   STRIPE_PRICE_BASICO=price_xxx
   STRIPE_PRICE_AVANZADO=price_yyy
   STRIPE_PRICE_PREMIUM=price_zzz
   ```

#### C) Configurar Webhook
1. Ve a: https://dashboard.stripe.com/webhooks
2. Clic en "Add endpoint"
3. URL: `https://tu-dominio.com/webhook` (por ahora usa ngrok para testing)
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copia el `Signing secret` → STRIPE_WEBHOOK_SECRET

### 4. Configurar Email (Gmail)
1. Activa verificación en 2 pasos en tu Gmail
2. Ve a: https://myaccount.google.com/apppasswords
3. Crea una contraseña de aplicación
4. Configura en `.env`:
   ```
   EMAIL_USER=tu_email@gmail.com
   EMAIL_PASS=contraseña_app_generada
   ADMIN_EMAIL=tu_email@gmail.com
   ```

### 5. Iniciar servidor
```bash
npm run dev
```

El servidor estará en: http://localhost:3000

## 🧪 Testing Local con Stripe

### Usar ngrok para webhook
```bash
# Instalar ngrok
brew install ngrok

# Exponer puerto 3000
ngrok http 3000

# Copiar la URL https://xxxx.ngrok.io
# Usarla en Stripe Webhook configuration
```

### Tarjetas de prueba de Stripe
- ✅ Exitosa: `4242 4242 4242 4242`
- ❌ Fallida: `4000 0000 0000 0002`
- Fecha: cualquier fecha futura
- CVV: cualquier 3 dígitos

## 📊 Dashboard Admin

Accede a: http://localhost:3000/admin

Credenciales (configurables en `.env`):
- Usuario: `admin`
- Contraseña: (la que pongas en ADMIN_PASSWORD)

## 🚀 Despliegue a Producción

### Opción 1: Railway (Recomendado)
1. Cuenta gratuita en railway.app
2. Conecta tu repo de GitHub
3. Railway detecta Node.js automáticamente
4. Añade variables de entorno en dashboard
5. Deploy automático

### Opción 2: Render
Similar a Railway, con plan gratuito

### Cambios para producción:
1. Cambia Stripe a modo "Live"
2. Actualiza URLs en `.env`
3. Configura webhook con URL real
4. ¡Listo!

## 📧 Soporte
Si tienes dudas, revisa la documentación de Stripe o contacta.
