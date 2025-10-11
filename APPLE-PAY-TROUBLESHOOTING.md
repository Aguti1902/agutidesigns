# 🍎 APPLE PAY TROUBLESHOOTING

## ❓ ¿Por qué no aparece Apple Pay en móvil?

---

## 🔍 **REQUISITOS OBLIGATORIOS PARA APPLE PAY**

### **1. Navegador y Dispositivo:**
- ✅ **iPhone/iPad** con iOS 10.1+
- ✅ **Safari** (NO funciona en Chrome, Firefox, etc. en iOS)
- ✅ **HTTPS** (tu sitio ya lo tiene)

### **2. Configuración del Usuario:**
- ✅ **Apple Wallet** configurado
- ✅ **Tarjeta de crédito/débito** añadida en Apple Wallet
- ✅ **Touch ID/Face ID** configurado

### **3. Configuración de Stripe:**
- ✅ **Dominio verificado** en Stripe Dashboard
- ✅ **Apple Pay activado** en tu cuenta de Stripe

---

## 🛠️ **PASOS PARA VERIFICAR/ACTIVAR APPLE PAY**

### **PASO 1: Verificar en Stripe Dashboard**

1. Ve a: https://dashboard.stripe.com/settings/payment_methods
2. Busca **"Apple Pay"**
3. Verifica que esté **activado**
4. Si no está activado, haz clic en "Enable"

### **PASO 2: Verificar Dominio**

1. En Stripe Dashboard → Apple Pay
2. Añade tu dominio: `formulario.agutidesigns.es`
3. Descarga el archivo de verificación
4. **NO es necesario subirlo** (Stripe lo verifica automáticamente para dominios .es)

### **PASO 3: Probar en Dispositivo Real**

**IMPORTANTE:** Apple Pay **NO funciona en simuladores** de iOS.

1. Usa un **iPhone/iPad real**
2. Abre **Safari** (NO Chrome)
3. Ve a: https://formulario.agutidesigns.es/checkout.html
4. Abre la consola del navegador (Safari → Desarrollo → Consola Web)
5. Busca estos logs:
   ```
   🍎 Apple Pay disponible: true
   ✅ Activando Apple/Google Pay
   ```

---

## 🚨 **PROBLEMAS COMUNES Y SOLUCIONES**

### **❌ "Apple Pay no disponible" en consola**

**Causas posibles:**
1. **Navegador incorrecto:** Estás usando Chrome/Firefox en iOS
2. **Sin tarjeta en Wallet:** No tienes tarjetas configuradas
3. **Stripe no configurado:** Apple Pay no está activado en Stripe
4. **Dominio no verificado:** Stripe no reconoce tu dominio

**Solución:**
1. Usa Safari en iPhone/iPad
2. Añade una tarjeta en Apple Wallet
3. Activa Apple Pay en Stripe Dashboard

---

### **❌ Apple Pay no aparece en el botón**

**Causa:** El usuario no tiene Apple Pay configurado

**Solución:** 
- El código ya oculta el botón automáticamente si no está disponible
- Se muestra solo cuando Apple Pay está realmente disponible

---

### **❌ Error "Domain not verified"**

**Causa:** Stripe no ha verificado tu dominio

**Solución:**
1. Ve a Stripe Dashboard → Apple Pay
2. Añade: `formulario.agutidesigns.es`
3. Espera 5-10 minutos para la verificación

---

## 🧪 **PRUEBA PASO A PASO**

### **En iPhone/iPad:**

1. **Abre Safari** (importante: NO Chrome)
2. Ve a: https://formulario.agutidesigns.es/checkout.html
3. **Abre consola del navegador:**
   - Safari → Configuración → Avanzado → "Mostrar menú Desarrollo"
   - Safari → Desarrollo → [Tu iPhone] → Consola Web
4. **Busca estos logs:**
   ```
   🍎 Apple Pay disponible: true
   ✅ Activando Apple/Google Pay
   ```
5. **Si aparece el botón de Apple Pay:**
   - Deberías ver un botón negro con el logo de Apple Pay
   - Al tocarlo, se abrirá Apple Wallet

---

## 📱 **CONFIGURACIÓN DEL USUARIO**

Para que Apple Pay funcione, el usuario debe:

1. **Tener iPhone/iPad** con iOS 10.1+
2. **Configurar Apple Wallet:**
   - Configuración → Wallet y Apple Pay
   - "Añadir tarjeta"
   - Escanear o introducir datos de tarjeta
3. **Configurar Touch ID/Face ID:**
   - Configuración → Touch ID y código / Face ID y código
   - Activar "Apple Pay"

---

## 🔧 **DEBUGGING AVANZADO**

Si sigue sin funcionar, añade este código temporal para debug:

```javascript
// En la consola del navegador (Safari en iOS)
console.log('User Agent:', navigator.userAgent);
console.log('HTTPS:', location.protocol === 'https:');
console.log('Touch ID disponible:', 'TouchEvent' in window);

// Verificar si Apple Pay está disponible
if (window.ApplePaySession) {
    console.log('Apple Pay Session disponible:', ApplePaySession.canMakePayments());
} else {
    console.log('Apple Pay Session NO disponible');
}
```

---

## ✅ **VERIFICACIÓN FINAL**

Apple Pay funcionará si:

- ✅ Estás en **iPhone/iPad real** (no simulador)
- ✅ Usas **Safari** (no Chrome/Firefox)
- ✅ Tienes **HTTPS** (ya tienes)
- ✅ Tienes **tarjetas en Apple Wallet**
- ✅ **Stripe tiene Apple Pay activado**
- ✅ **Dominio verificado** en Stripe

---

## 📞 **SI SIGUE SIN FUNCIONAR**

1. **Verifica en Stripe Dashboard** que Apple Pay esté activado
2. **Prueba en un iPhone real** con Safari
3. **Revisa la consola** para ver los logs de debug
4. **Contacta soporte de Stripe** si el problema persiste

---

**Nota:** Apple Pay es muy restrictivo y solo funciona en condiciones muy específicas. Es normal que no aparezca en muchos casos.
