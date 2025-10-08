# 🎯 INSTRUCCIONES: Actualizar Botones de Planes en Elementor

## 📋 **RESUMEN:**
Los botones de los planes deben redirigir al formulario con el plan y billing cycle correcto.

---

## 🔧 **CAMBIOS EN LA FUNCIÓN JavaScript:**

### **UBICACIÓN:**
Al final del HTML de la sección de precios, dentro de la etiqueta `<script>`

### **FUNCIÓN ACTUAL:**
```javascript
function selectPlan(plan) {
    const activeToggle = document.querySelector('.toggle-option.active');
    const billingCycle = activeToggle.getAttribute('data-period');
    window.location.href = `https://formulario.agutidesigns.es?plan=${plan}&billing=${billingCycle}`;
}
```

### **✅ ESTA FUNCIÓN YA ESTÁ CORRECTA - NO CAMBIAR**

---

## 🔗 **URLs QUE SE GENERARÁN AUTOMÁTICAMENTE:**

### **Plan Básico:**
- **Mensual:** `https://formulario.agutidesigns.es?plan=basico&billing=monthly`
- **Anual:** `https://formulario.agutidesigns.es?plan=basico&billing=annual`

### **Plan Avanzado:**
- **Mensual:** `https://formulario.agutidesigns.es?plan=avanzado&billing=monthly`
- **Anual:** `https://formulario.agutidesigns.es?plan=avanzado&billing=annual`

### **Plan Premium:**
- **Mensual:** `https://formulario.agutidesigns.es?plan=premium&billing=monthly`
- **Anual:** `https://formulario.agutidesigns.es?plan=premium&billing=annual`

---

## 📝 **BOTONES EN EL HTML:**

### **✅ YA ESTÁN CORRECTOS:**

```html
<button onclick="selectPlan('basico')" class="plan-button">Elegir Plan Básico</button>

<button onclick="selectPlan('avanzado')" class="plan-button">Elegir Plan Avanzado</button>

<button onclick="selectPlan('premium')" class="plan-button">Elegir Plan Premium</button>
```

---

## ✅ **VERIFICACIÓN:**

### **Cómo probar que funciona:**

1. **Ve a tu landing en WordPress**
2. **Cambia el toggle a "Mensual"**
3. **Click en "Elegir Plan Avanzado"**
   - Deberías ir a: `https://formulario.agutidesigns.es?plan=avanzado&billing=monthly`
   - Formulario muestra: **"Avanzado - 49€/mes"**

4. **Vuelve a la landing**
5. **Cambia el toggle a "Anual"**
6. **Click en "Elegir Plan Avanzado"**
   - Deberías ir a: `https://formulario.agutidesigns.es?plan=avanzado&billing=annual`
   - Formulario muestra: **"Avanzado - 39€/mes (facturado anualmente: 468€/año)"**

---

## 🎯 **CONCLUSIÓN:**

**✅ TODO YA ESTÁ CORRECTAMENTE CONFIGURADO EN EL ARCHIVO `pricing-section.html`**

**Solo necesitas:**
1. Copiar el contenido completo de `pricing-section.html`
2. Pegarlo en Elementor (Widget HTML personalizado)
3. Guardar y publicar

**El formulario detectará automáticamente el plan y billing desde la URL.**

---

## 🚀 **FLUJO COMPLETO:**

```
1. Landing (agutidesigns.es)
   ↓ Usuario elige "Anual" en toggle
   ↓ Click en "Elegir Plan Premium"
   
2. Redirección automática a:
   https://formulario.agutidesigns.es?plan=premium&billing=annual
   
3. Formulario detecta parámetros:
   ✅ Plan: Premium
   ✅ Billing: Annual
   ✅ Muestra: "Premium - 52€/mes (facturado anualmente: 624€/año)"
   
4. Usuario completa formulario
   
5. Checkout cobra precio anual correcto:
   ✅ 624€/año (52€/mes × 12 meses)
```

---

## 📞 **SOPORTE:**

Si los botones no redirigen correctamente, verifica:
- ✅ El toggle mensual/anual tiene `data-period="monthly"` y `data-period="annual"`
- ✅ La función `selectPlan()` está dentro de las etiquetas `<script>`
- ✅ Los botones tienen `onclick="selectPlan('nombre_plan')"`
- ✅ Vercel ha desplegado los últimos cambios del formulario

