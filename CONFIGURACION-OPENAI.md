# 🤖 Configuración de OpenAI para Generación de Textos

## 📋 Resumen

Esta guía te ayudará a configurar la API de OpenAI para que los usuarios puedan generar textos automáticamente en el formulario de membresía.

---

## 🔑 Paso 1: Obtener API Key de OpenAI

### 1. Crear cuenta en OpenAI
1. Ve a [platform.openai.com](https://platform.openai.com)
2. Regístrate o inicia sesión
3. Verifica tu email

### 2. Generar API Key
1. Click en tu perfil (arriba derecha)
2. Ve a **"API keys"**
3. Click en **"Create new secret key"**
4. Dale un nombre: `agutidesigns-form`
5. **¡IMPORTANTE!** Copia la key inmediatamente (solo se muestra una vez)

---

## 💳 Paso 2: Configurar Método de Pago

### Agregar tarjeta
1. Ve a **"Settings"** → **"Billing"**
2. Click en **"Add payment method"**
3. Agrega tu tarjeta de crédito/débito
4. Configura límites de gasto (recomendado: $10-20/mes)

### Límites recomendados
```
- Límite mensual: $20
- Alertas en: $15
- Modelo: gpt-3.5-turbo (más económico)
```

**💡 Costo estimado:** ~$0.002 por generación = 10,000 generaciones por $20

---

## ⚙️ Paso 3: Configurar en Railway

### 1. Ir a Railway
1. Abre [railway.app](https://railway.app)
2. Selecciona tu proyecto `agutidesigns-backend`
3. Click en **"Variables"**

### 2. Agregar Variable
```
Variable name:  OPENAI_API_KEY
Value:          sk-proj-xxxxxxxxxxxxxxxxxxxx (tu API key)
```

### 3. Instalar dependencia
La dependencia ya está en `package.json`:
```json
"openai": "^4.77.0"
```

Railway instalará automáticamente al hacer deploy.

### 4. Deploy
1. Railway desplegará automáticamente
2. Espera 2-3 minutos
3. Verifica logs: `✅ OpenAI configurado correctamente`

---

## 🧪 Paso 4: Probar la Funcionalidad

**⚠️ IMPORTANTE:** La funcionalidad de IA **NO funcionará** hasta que configures la `OPENAI_API_KEY` en Railway (Paso 3). Si no está configurada, verás el mensaje: _"Generación de IA no disponible. Contacta al administrador."_

### En el formulario:
1. **Primero:** Asegúrate de haber configurado la API key en Railway
2. Espera 2-3 minutos para que Railway redespliegue
3. Ve a [agutidesigns.es/formulario-membresia.html](https://agutidesigns.es/formulario-membresia.html)
4. Completa **Paso 1** (nombre y descripción del negocio)
5. Ve al **Paso 4** (Contenido Web)
6. Click en **"✨ Generar todos los textos con IA"**
7. Espera 3-5 segundos
8. ¡Los textos aparecerán automáticamente!

### Para menús de restaurante:
1. Selecciona sector "Restaurante/Cafetería"
2. En el campo de menú dinámico
3. Click en **"✨ Generar menú con IA"**
4. Obtendrás un menú completo con platos y precios

---

## 🎯 Funcionalidades Implementadas

### ✅ Generación General
- **Campo:** Textos de tu web
- **Botón:** "✨ Generar todos los textos con IA"
- **Genera:**
  - Título principal (H1)
  - Subtítulo
  - Sección "Sobre Nosotros"
  - Descripción de servicios
  - Llamada a la acción

### ✅ Generación de Descripciones de Servicios
- **Campo:** Textos para cada servicio
- **Botón:** "✨ Generar con IA"
- **Requisito:** Primero completar "Lista tus servicios"
- **Genera:**
  - Descripción profesional de cada servicio
  - 2-3 líneas por servicio
  - Destaca beneficios principales
  - Tono profesional pero cercano

### ✅ Generación de Menú (Restaurantes)
- **Campo:** Menú del restaurante
- **Botón:** "✨ Generar menú con IA"
- **Genera:**
  - Entrantes
  - Principales
  - Postres
  - Bebidas
  - Con precios sugeridos

---

## 🔧 Configuración Técnica

### Endpoint Backend
```javascript
POST /api/generate-text

Body:
{
    "prompt": "Genera textos para...",
    "businessName": "Mi Empresa",
    "sector": "abogados",
    "tone": "profesional"
}

Response:
{
    "success": true,
    "text": "Textos generados..."
}
```

### Modelo Usado
- **Modelo:** `gpt-3.5-turbo`
- **Max tokens:** 300
- **Temperature:** 0.7 (balance creatividad/precisión)
- **Idioma:** Español
- **Tono:** Profesional

---

## 📊 Monitoreo y Uso

### Ver uso en OpenAI
1. Ve a [platform.openai.com/usage](https://platform.openai.com/usage)
2. Revisa:
   - Requests realizados
   - Tokens consumidos
   - Costo total

### Costos aproximados
```
1 generación = ~300 tokens = $0.0006
100 generaciones = $0.06
1000 generaciones = $0.60
```

### Logs en Railway
```bash
🤖 [OPENAI] Generando texto para: Mi Empresa
✅ [OPENAI] Texto generado exitosamente
```

---

## ❌ Solución de Problemas

### Error: "Error de configuración de OpenAI"
**Causa:** API Key no configurada
**Solución:**
1. Verifica que `OPENAI_API_KEY` está en Railway
2. Verifica que la key es correcta (empieza con `sk-`)
3. Redeploy el proyecto

### Error: "Error al generar texto"
**Causa:** Límite de uso excedido o método de pago
**Solución:**
1. Verifica tu saldo en OpenAI
2. Agrega método de pago
3. Aumenta límites de gasto

### Error: "Completa primero el nombre y descripción"
**Causa:** Campos del Paso 1 vacíos
**Solución:**
1. Ve al Paso 1
2. Completa nombre del negocio
3. Completa descripción
4. Vuelve al Paso 4 y genera

---

## 🚀 Variables de Railway

### Variables necesarias:
```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe Price IDs
STRIPE_PRICE_BASIC_MONTHLY=price_xxx
STRIPE_PRICE_ADVANCED_MONTHLY=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
STRIPE_PRICE_BASIC_ANNUAL=price_xxx
STRIPE_PRICE_ADVANCED_ANNUAL=price_xxx
STRIPE_PRICE_PREMIUM_ANNUAL=price_xxx

# SendGrid
SENDGRID_API_KEY=SG.xxx
SENDER_EMAIL=noreply@agutidesigns.es
ADMIN_EMAIL=info@agutidesigns.es

# URLs
FRONTEND_URL=https://agutidesigns.vercel.app

# Database
DATABASE_URL=(auto-generada por Railway)

# Google Analytics
GA_PROPERTY_ID=xxx
GA_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n"

# 🆕 OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
```

---

## ✅ Checklist de Configuración

- [ ] Cuenta de OpenAI creada
- [ ] API Key generada y copiada
- [ ] Método de pago agregado en OpenAI
- [ ] Límites de gasto configurados
- [ ] Variable `OPENAI_API_KEY` agregada en Railway
- [ ] Railway desplegado correctamente
- [ ] Logs verificados (sin errores)
- [ ] Prueba realizada en el formulario
- [ ] Textos generados exitosamente

---

## 📞 Soporte

Si necesitas ayuda:
1. Revisa los logs de Railway
2. Verifica el uso en OpenAI
3. Comprueba que todos los pasos están completos

---

**¡Configuración completada! 🎉**

Los usuarios ahora pueden generar textos profesionales automáticamente con IA.

