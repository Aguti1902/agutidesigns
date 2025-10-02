# 🔄 CONFIGURACIÓN TEST vs LIVE

## ✅ VENTAJA DE ESTE SISTEMA:

Puedes tener **ambas configuraciones** (test y producción) al mismo tiempo.
Solo cambiando **UNA variable** (`TEST_MODE`) el sistema usa las claves correctas.

---

## 📋 VARIABLES EN RAILWAY:

### 🧪 MODO TEST (para pruebas):

```
TEST_MODE = true

# Claves de Stripe TEST
STRIPE_SECRET_KEY_TEST = sk_test_TU_CLAVE_TEST_AQUI

STRIPE_PUBLISHABLE_KEY_TEST = pk_test_TU_CLAVE_TEST_AQUI

# Price IDs TEST (crear productos en Stripe Dashboard modo TEST)
STRIPE_PRICE_BASICO_TEST = price_test_xxx
STRIPE_PRICE_AVANZADO_TEST = price_test_yyy
STRIPE_PRICE_PREMIUM_TEST = price_test_zzz

# Webhook TEST
STRIPE_WEBHOOK_SECRET_TEST = whsec_test_xxx
```

### 🚀 MODO LIVE (producción - YA LAS TIENES):

```
# Claves de Stripe LIVE (mantén las que ya tienes)
STRIPE_SECRET_KEY = sk_live_51Otv6p...
STRIPE_PUBLISHABLE_KEY = pk_live_51Otv6p...

# Price IDs LIVE (mantén los que ya tienes)
STRIPE_PRICE_BASICO = price_1SDkyg...
STRIPE_PRICE_AVANZADO = price_1SDkz0...
STRIPE_PRICE_PREMIUM = price_1SDkzC...

# Webhook LIVE (mantén el que ya tienes)
STRIPE_WEBHOOK_SECRET = whsec_xxx
```

---

## 🎯 CÓMO FUNCIONA:

### **Para TESTING:**
1. En Railway → Variables
2. Añade `TEST_MODE = true`
3. El servidor usará automáticamente todas las claves con sufijo `_TEST`

### **Para PRODUCCIÓN:**
1. En Railway → Variables
2. Cambia `TEST_MODE = false` (o bórrala)
3. El servidor usará automáticamente las claves LIVE

---

## 📝 PASOS PARA CONFIGURAR TEST:

### 1. Crear productos en Stripe TEST:
   - Ve a: https://dashboard.stripe.com/test/products
   - Activa modo TEST (toggle arriba a la derecha)
   - Crea 3 productos:
     * Plan Básico: 35€/mes
     * Plan Avanzado: 49€/mes
     * Plan Premium: 65€/mes
   - Copia los Price IDs

### 2. Webhook TEST:
   - Ve a: https://dashboard.stripe.com/test/webhooks
   - Añade endpoint: `https://agutidesigns-production.up.railway.app/webhook`
   - Eventos: checkout.session.completed, customer.subscription.*
   - Copia el Signing secret

### 3. Añadir en Railway:
   - Todas las variables con sufijo `_TEST`
   - `TEST_MODE = true`

---

## 🎉 RESULTADO:

✅ **Modo TEST**: Pagos de prueba, no cobra dinero real  
✅ **Modo LIVE**: Pagos reales, cobra dinero real  
✅ **Cambio rápido**: Solo editar `TEST_MODE`  

---

## 💡 RECOMENDACIÓN:

Mantén `TEST_MODE = true` hasta que:
- ✅ Hayas probado todo el flujo
- ✅ Veas las solicitudes en el dashboard
- ✅ Recibas los emails
- ✅ Todo funcione perfectamente

Luego cambia a `false` para empezar a recibir pagos reales.
