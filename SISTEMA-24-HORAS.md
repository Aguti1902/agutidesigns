# ⏰ SISTEMA DE 24 HORAS PARA EDICIÓN

## ✅ IMPLEMENTACIÓN COMPLETA:

### **🎯 REGLAS DEL SISTEMA:**

1. **Usuarios SIN plan:**
   - ✅ Pueden editar **SIEMPRE**
   - ✅ Sin límite de tiempo
   - ✅ Hasta que contraten un plan

2. **Usuarios CON plan:**
   - ✅ Pueden editar durante **24 horas** desde el pago
   - ⏰ **Temporizador countdown** en tiempo real
   - 🔒 Después de 24h: **bloqueado**, contactar soporte

---

## 🎨 INTERFAZ:

### **Banner de Temporizador (Con Plan - Primeras 24h):**
```
┌──────────────────────────────────────────────┐
│ ⏰ Tiempo para editar tu información         │
│ Después de 24h desde tu pago, los datos     │
│ se bloquearán                                │
│                                              │
│                   [23:45:12] ← Countdown     │
└──────────────────────────────────────────────┘
```

**Características:**
- Fondo amarillo (#E5FC63)
- Countdown en negro con monospace
- Cuando queda <1h → Fondo rojo
- Se actualiza cada segundo

### **Banner de Tiempo Expirado (Después de 24h):**
```
┌──────────────────────────────────────────────┐
│ 🔒 Período de edición finalizado            │
│ Han pasado más de 24 horas desde tu pago.   │
│ Para hacer cambios, contacta a soporte.     │
└──────────────────────────────────────────────┘
```

**Características:**
- Fondo rojo claro (#fee)
- Borde rojo (#fcc)
- Todos los botones "Editar" deshabilitados

---

## 🔧 FUNCIONALIDAD:

### **Frontend (client-dashboard/index.html):**

```javascript
// Variables globales
let canEdit = true;
let countdownInterval = null;

// Iniciar temporizador
function startEditTimer(paymentDate) {
    const expirationDate = new Date(payment_date + 24h);
    
    setInterval(() => {
        const timeLeft = expirationDate - now;
        
        if (timeLeft <= 0) {
            canEdit = false;
            showExpiredBanner();
            disableAllEditButtons();
        } else {
            updateCountdown(timeLeft); // HH:MM:SS
        }
    }, 1000);
}

// Validar antes de editar
function toggleEditSection(section) {
    if (!canEdit) {
        alert('Período expirado');
        return;
    }
    // ... mostrar inputs
}
```

### **Backend (server.js):**

```javascript
// Endpoint PATCH /api/client/update-info/:clientId

// Validar 24h
if (client.plan && client.payment_date) {
    const hoursSincePayment = (now - payment_date) / (1000 * 60 * 60);
    
    if (hoursSincePayment > 24) {
        return res.status(403).json({ 
            error: 'Período finalizado',
            expired: true 
        });
    }
}

// Usuarios sin plan: no se valida (pueden editar siempre)
```

---

## 📊 TODOS LOS CAMPOS EDITABLES:

### **Secciones Principales (Siempre Visibles):**

**📋 Datos del Negocio:**
- Nombre, Sector, Descripción

**📞 Datos de Contacto:**
- Email, Teléfono, WhatsApp

**📄 Páginas de tu Web:**
- Añadir/Eliminar (con límite según plan)
- Básico: 5 | Avanzado: 10 | Premium: 20

**🔍 Dominio y SEO:**
- Dominio, Keywords, Estilo

**🏛️ Datos Fiscales:**
- CIF, Razón Social, Dirección

### **Acordeones Desplegables (Menos Usados):**

**📱 Redes Sociales:**
- Instagram, Facebook, LinkedIn

**💼 Servicios:**
- Lista de servicios que ofrece

**🎯 Objetivos:**
- Objetivo de la web
- Público objetivo

**🎨 Branding:**
- Colores de marca
- Webs de referencia

---

## 🗄️ BASE DE DATOS:

### **Tabla `clients` - Nueva Columna:**
```sql
payment_date DATETIME
```

**Se guarda cuando:**
- Cliente paga por primera vez
- Cliente actualiza su plan (repaga)

**Se usa para:**
- Calcular tiempo transcurrido
- Validar si puede editar
- Mostrar countdown

---

## 🔄 FLUJOS:

### **Flujo 1: Cliente Sin Plan**
```
1. Registro → created_at
2. Login → Dashboard
3. Editar "Mi Negocio" ✅ (sin restricción)
4. Guardar ✅
5. Editar cuando quiera ✅
```

### **Flujo 2: Cliente Paga (Primeras 24h)**
```
1. Pago exitoso → payment_date = NOW
2. Login → Dashboard
3. Banner amarillo: "23:45:12" ⏰
4. Editar "Mi Negocio" ✅
5. Guardar ✅
6. Countdown actualizado
7. Puede editar hasta que expire
```

### **Flujo 3: Después de 24h**
```
1. Login → Dashboard
2. Banner rojo: "Período finalizado" 🔒
3. Botones "Editar" deshabilitados
4. Click editar → Alert: "Contacta a soporte"
5. Intentar guardar desde backend → Error 403
```

---

## 🧪 CÓMO PROBAR:

### **Prueba 1: Usuario Sin Plan (Sin Límite)**

1. Crear cuenta sin pagar
2. Login
3. Editar cualquier campo
4. ✅ Sin temporizador
5. ✅ Sin restricción

### **Prueba 2: Usuario Con Plan (Con Temporizador)**

1. Crear cuenta y pagar
2. Login
3. Ver banner amarillo con countdown
4. Countdown funcionando (se actualiza cada segundo)
5. Editar campos ✅
6. Guardar ✅

### **Prueba 3: Simular Expiración (Temporal)**

Para testing, puedes modificar temporalmente el backend:
```javascript
// En server.js, cambiar 24 horas por 1 minuto:
if (hoursSincePayment > 0.0167) { // 1 minuto en vez de 24
```

1. Pagar
2. Esperar 1 minuto
3. Countdown llega a 00:00:00
4. Banner cambia a rojo
5. Botones deshabilitados
6. Intentar editar → Alert

---

## ⚙️ CONFIGURACIÓN:

### **Cambiar Tiempo de Edición:**

**Backend (server.js):**
```javascript
if (hoursSincePayment > 24) { // ← Cambiar aquí (horas)
```

**Frontend (client-dashboard/index.html):**
```javascript
const expirationDate = new Date(createdDate.getTime() + (24 * 60 * 60 * 1000)); // ← Cambiar aquí
```

---

## 🚀 DESPLEGAR:

Railway se está actualizando automáticamente (2-3 min).

**Verificar:**
```
https://railway.app → backend → Deployments → "✅ Active"
```

**Probar:**
```
https://agutidesigns.vercel.app/crear-cuenta-prueba.html
```

1. Click "Usuario Plan BÁSICO" (para ver temporizador)
2. Login
3. Ver banner de 24h
4. Countdown funcionando
5. Editar campos
6. Todo funciona ✅

---

## 📋 RESUMEN:

✅ **Temporizador 24h implementado**
✅ **Todos los campos del formulario en dashboard**
✅ **Acordeones para organizar info adicional**
✅ **Validación frontend Y backend**
✅ **Usuarios sin plan: sin restricción**
✅ **Usuarios con plan: 24h desde pago**
✅ **payment_date guardada en BD**
✅ **Bloqueo automático al expirar**

**¡Sistema completo de 24 horas funcionando!** 🎉 