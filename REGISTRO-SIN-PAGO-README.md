# 🎯 SISTEMA DE REGISTRO INDEPENDIENTE DEL PAGO

## ✅ PROBLEMA SOLUCIONADO:

**Antes:** El usuario solo podía crear cuenta SI pagaba.
**Ahora:** El usuario puede registrarse SIN pagar y acceder al dashboard inmediatamente.

---

## 🔄 NUEVO FLUJO:

### **1. REGISTRO (Sin pagar)**
```
Usuario → Formulario (Paso 8) → Crear Cuenta → Acceso al Dashboard
```

### **2. PAGO (Opcional, activa el plan)**
```
Dashboard → Contratar Plan → Pagar → Plan Activo
```

---

## 🛠️ LO QUE SE HA IMPLEMENTADO:

### **A) Base de Datos**
- ✅ Agregada columna `password` a tabla `submissions`
- ✅ Función `createSubmission` ahora guarda la contraseña
- ✅ La contraseña se guarda en texto plano en submissions (temporal)
- ✅ La contraseña se hashea en tabla `clients` (seguro)

### **B) Backend - Nuevo Endpoint**
```javascript
POST /api/client/register
```

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "contraseña123",
  "full_name": "Nombre Completo",
  "business_name": "Mi Empresa" // opcional
  "plan": "basico" // opcional
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "message": "Cuenta creada exitosamente",
  "client": {
    "id": 1,
    "email": "usuario@example.com",
    "full_name": "Nombre Completo",
    "plan": null,
    "status": "active"
  }
}
```

**Response (Error):**
```json
{
  "error": "Ya existe una cuenta con este email"
}
```

### **C) Formulario**
- ✅ Al completar el **Paso 8** (Crea tu Cuenta):
  1. Se llama a `/api/client/register`
  2. Se crea la cuenta del usuario INMEDIATAMENTE
  3. Se guardan los datos en sessionStorage
  4. Se redirige al checkout

- ✅ Si el usuario ya existe: continúa normal (permite reintentos)
- ✅ Si hay error de red: muestra mensaje y no avanza

### **D) Checkout**
- ✅ Si el pago es exitoso:
  - Verifica si el cliente ya existe
  - Si existe: actualiza su plan y datos de Stripe
  - Si no existe: crea nuevo cliente con el plan

---

## 🧪 CÓMO PROBAR:

### **Opción 1: Registro + Acceso Dashboard (Sin Pagar)**

1. Ir a: `https://agutidesigns.vercel.app/formulario-membresia.html`
2. Completar TODO el formulario hasta el **Paso 8**:
   - Nombre: Tu nombre
   - Apellido: Tu apellido
   - Email: `test@agutidesigns.com`
   - Contraseña: `testing123`
   - Confirmar: `testing123`
3. Click "Finalizar y Pagar"
4. ✅ **Tu cuenta se crea AQUÍ** (antes de ir al checkout)
5. Puedes cerrar la página del checkout
6. Ir a: `https://agutidesigns.vercel.app/client-dashboard/`
7. Login con:
   - Email: `test@agutidesigns.com`
   - Contraseña: `testing123`
8. ✅ **Entras al dashboard SIN haber pagado**

### **Opción 2: Registro + Pago Completo**

1. Igual que la Opción 1, pero continúa en el checkout
2. Completa el pago con tarjeta de prueba:
   - Número: `4242 4242 4242 4242`
   - Fecha: `12/25`
   - CVC: `123`
3. Tu plan se activará y el dashboard mostrará tu plan activo

---

## 📊 ESTADOS DEL USUARIO:

### **Estado 1: Registrado Sin Plan**
```json
{
  "email": "usuario@example.com",
  "plan": null,
  "website_status": "en_construccion",
  "stripe_subscription_id": null
}
```
- ✅ Puede acceder al dashboard
- ❌ No tiene sitio web activo
- 📝 Puede completar datos
- 💳 Puede contratar un plan

### **Estado 2: Registrado Con Plan Activo**
```json
{
  "email": "usuario@example.com",
  "plan": "basico",
  "website_status": "activo",
  "stripe_subscription_id": "sub_xxxxx"
}
```
- ✅ Puede acceder al dashboard
- ✅ Tiene sitio web activo
- ✏️ Puede editar su sitio
- 📊 Ve estadísticas

---

## 🔒 SEGURIDAD:

- ✅ Las contraseñas se hashean con bcrypt (10 salt rounds)
- ✅ Nunca se envía la contraseña hasheada al frontend
- ✅ Validación de longitud mínima (8 caracteres)
- ✅ Verificación de email único

---

## 🚀 DESPLIEGUE:

### **1. Railway (Backend):**
```bash
1. Ve a Railway.app
2. Proyecto "agutidesigns"
3. Servicio "backend"
4. Click "Redeploy"
5. Espera 1-2 minutos
```

**IMPORTANTE:** Al redesplegar, la base de datos se actualizará con la nueva columna `password`.

### **2. Vercel (Frontend):**
- Se despliega automáticamente (1-2 min)
- Archivos actualizados:
  - `formulario-membresia.html`

---

## ✅ VERIFICACIÓN:

### **Endpoint de Debug:**
```
GET https://agutidesigns-production.up.railway.app/api/client/check/{email}
```

Ejemplo:
```
https://agutidesigns-production.up.railway.app/api/client/check/test@agutidesigns.com
```

Respuesta si existe:
```json
{
  "exists": true,
  "clientId": 1,
  "email": "test@agutidesigns.com",
  "full_name": "Test User",
  "plan": null,
  "created_at": "2025-10-02 ..."
}
```

---

## 🎯 PRÓXIMOS PASOS (Opcional):

1. **Botón "Contratar Plan" en el dashboard** → Redirige al checkout
2. **Recuperar contraseña** → Endpoint de reset password
3. **Email de bienvenida** → Al registrarse
4. **Dashboard diferente para usuarios sin plan** → Mostrar CTA para contratar

---

**¡Ahora los usuarios pueden registrarse y acceder al dashboard sin necesidad de pagar!** 🎉 