# 🔧 VARIABLES DE ENTORNO PARA PLANES ANUALES

## 📋 **VARIABLES QUE DEBES AÑADIR EN RAILWAY**

### **⚠️ IMPORTANTE:**
Las variables **MENSUALES** ya existentes deben renombrarse añadiendo `_MONTHLY` al final.

---

## **1️⃣ RENOMBRAR VARIABLES EXISTENTES (TEST)**

En Railway, renombra estas variables añadiendo `_MONTHLY`:

| Variable Antigua | Variable Nueva |
|-----------------|----------------|
| `STRIPE_PRICE_BASICO_TEST` | `STRIPE_PRICE_BASICO_MONTHLY_TEST` |
| `STRIPE_PRICE_AVANZADO_TEST` | `STRIPE_PRICE_AVANZADO_MONTHLY_TEST` |
| `STRIPE_PRICE_PREMIUM_TEST` | `STRIPE_PRICE_PREMIUM_MONTHLY_TEST` |

---

## **2️⃣ AÑADIR NUEVAS VARIABLES (TEST - ANUALES)**

Añade estas 3 nuevas variables con los Price IDs **anuales** de Stripe TEST:

```
STRIPE_PRICE_BASICO_ANNUAL_TEST=price_XXXXXXXXX
STRIPE_PRICE_AVANZADO_ANNUAL_TEST=price_XXXXXXXXX
STRIPE_PRICE_PREMIUM_ANNUAL_TEST=price_XXXXXXXXX
```

**Dónde encontrar los Price IDs:**
1. Ve a Stripe Dashboard → Productos
2. Busca tus productos anuales
3. Copia el Price ID que empieza con `price_`

---

## **3️⃣ PARA PRODUCCIÓN (LIVE)**

Cuando estés listo para modo LIVE, también necesitarás:

### **Renombrar:**
```
STRIPE_PRICE_BASICO → STRIPE_PRICE_BASICO_MONTHLY
STRIPE_PRICE_AVANZADO → STRIPE_PRICE_AVANZADO_MONTHLY
STRIPE_PRICE_PREMIUM → STRIPE_PRICE_PREMIUM_MONTHLY
```

### **Añadir:**
```
STRIPE_PRICE_BASICO_ANNUAL=price_XXXXXXXXX
STRIPE_PRICE_AVANZADO_ANNUAL=price_XXXXXXXXX
STRIPE_PRICE_PREMIUM_ANNUAL=price_XXXXXXXXX
```

---

## **📊 PRECIOS CORRECTOS**

### **Mensuales:**
- Básico: 35€/mes
- Avanzado: 49€/mes
- Premium: 65€/mes

### **Anuales (con descuento ~20%):**
- Básico: 28€/mes (336€/año facturado de una vez)
- Avanzado: 39€/mes (468€/año facturado de una vez)
- Premium: 52€/mes (624€/año facturado de una vez)

---

## **🔄 RESUMEN DE VARIABLES EN RAILWAY**

Después de estos cambios, tendrás en Railway:

### **TEST MODE:**
```
STRIPE_PRICE_BASICO_MONTHLY_TEST=price_xxx
STRIPE_PRICE_AVANZADO_MONTHLY_TEST=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY_TEST=price_xxx
STRIPE_PRICE_BASICO_ANNUAL_TEST=price_xxx    ← NUEVO
STRIPE_PRICE_AVANZADO_ANNUAL_TEST=price_xxx  ← NUEVO
STRIPE_PRICE_PREMIUM_ANNUAL_TEST=price_xxx   ← NUEVO
```

### **LIVE MODE:**
```
STRIPE_PRICE_BASICO_MONTHLY=price_xxx
STRIPE_PRICE_AVANZADO_MONTHLY=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
STRIPE_PRICE_BASICO_ANNUAL=price_xxx    ← NUEVO
STRIPE_PRICE_AVANZADO_ANNUAL=price_xxx  ← NUEVO
STRIPE_PRICE_PREMIUM_ANNUAL=price_xxx   ← NUEVO
```

---

## **✅ PASOS A SEGUIR:**

1. **En Stripe Dashboard:**
   - Crea 3 productos nuevos (o precios) ANUALES
   - Copia los 3 Price IDs

2. **En Railway:**
   - Renombra las 3 variables mensuales añadiendo `_MONTHLY`
   - Añade las 3 variables anuales con `_ANNUAL`

3. **Restart del Backend:**
   - Railway hará restart automático al cambiar variables
   - O puedes hacerlo manual en Railway Dashboard

4. **Verificar:**
   - Logs de Railway deben mostrar: `💳 Creando suscripción annual...`
   - Al pagar, debe cobrar el precio anual correcto

---

## **🆘 SI HAY PROBLEMAS:**

**Error: "Plan inválido o Price ID no configurado"**
- Verifica que los Price IDs sean correctos
- Asegúrate de haber hecho restart del backend
- Revisa los logs de Railway

**Error: "No such price"**
- El Price ID está mal copiado
- O estás usando Price ID de TEST en modo LIVE (o viceversa)

---

## **📞 AYUDA:**

Si tienes dudas, revisa:
- Stripe Dashboard → Productos
- Railway → Variables
- Railway → Logs (para ver qué Price ID está intentando usar) 