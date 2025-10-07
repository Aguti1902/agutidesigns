# 🌐 MIGRACIÓN SIMPLE CON SLUGS (Sin Subdominios)

## 🎯 ESTRUCTURA FINAL

```
agutidesigns.es (WordPress en IONOS)
├── / → WordPress (Landing)
├── /formulario → Formulario (slug limpio) ✨
├── /checkout → Checkout (slug limpio) ✨
├── /success → Success (slug limpio) ✨
└── /reset-password → Reset password (slug limpio) ✨

panel.agutidesigns.es (Vercel - Dashboard Cliente)
└── / → client-dashboard

admin.agutidesigns.es (Vercel - Dashboard Admin)
└── / → admin-dashboard
```

---

## ⚠️ PROBLEMA: WordPress + Vercel en el mismo dominio

**No es posible** tener WordPress en IONOS y las rutas `/formulario`, `/checkout` en Vercel **en el mismo dominio** simultáneamente.

### **¿Por qué?**
- `agutidesigns.es` solo puede apuntar a **UN** servidor a la vez
- Si apunta a IONOS (WordPress), Vercel no puede manejar las rutas
- Si apunta a Vercel, WordPress no funcionará

---

## 💡 SOLUCIONES (Elige una)

### **OPCIÓN 1: Todo en WordPress (Recomendada para tu caso) ✅**

Subir el formulario, checkout y success **dentro de WordPress** como páginas personalizadas.

**Ventajas:**
- ✅ Slugs limpios: `agutidesigns.es/formulario`
- ✅ Un solo dominio
- ✅ Fácil de gestionar
- ✅ SEO optimizado

**Desventajas:**
- ❌ Debes subir los archivos HTML como páginas de WordPress
- ❌ Más trabajo inicial (pero vale la pena)

**Cómo hacerlo:**
1. Crear páginas en WordPress: "Formulario", "Checkout", "Success"
2. Usar un plugin como "Insert HTML Snippet" o "Code Snippets"
3. Copiar el código HTML de cada archivo
4. Slug de cada página será automático: `/formulario`, `/checkout`, `/success`

---

### **OPCIÓN 2: Subdominio para Formulario (La que configuré antes) ⚡**

Mantener WordPress en `agutidesigns.es` y formulario en `formulario.agutidesigns.es`

**Ventajas:**
- ✅ Separación clara de servicios
- ✅ Despliegues independientes
- ✅ Fácil de configurar en Vercel

**Desventajas:**
- ❌ No es un slug (es un subdominio)
- ❌ URL más larga

**URLs resultantes:**
```
agutidesigns.es → Landing (WordPress)
formulario.agutidesigns.es → Formulario
formulario.agutidesigns.es/checkout → Checkout
formulario.agutidesigns.es/success → Success
```

---

### **OPCIÓN 3: Migrar WordPress a Vercel (Avanzado) 🚀**

Migrar todo el WordPress a Vercel para tener control total de las rutas.

**Ventajas:**
- ✅ Slugs limpios
- ✅ Todo en una plataforma
- ✅ Mejor rendimiento

**Desventajas:**
- ❌ Complejo de configurar
- ❌ Requiere WordPress en modo headless
- ❌ Mucho trabajo de migración

---

### **OPCIÓN 4: Proxy Reverso en WordPress (Técnico) 🔧**

Configurar WordPress para que actúe como proxy y redirija ciertas rutas a Vercel.

**Ventajas:**
- ✅ Slugs limpios: `agutidesigns.es/formulario`
- ✅ WordPress sigue en IONOS

**Desventajas:**
- ❌ Requiere configuración avanzada de servidor
- ❌ Posibles problemas de CORS
- ❌ Difícil de mantener

**Cómo hacerlo:**
1. Instalar plugin "Redirection" en WordPress
2. Crear reglas de proxy para `/formulario/*`
3. Configurar CORS en ambos servidores

---

## 🎯 MI RECOMENDACIÓN

### **Para tu caso específico:**

**Si quieres slugs limpios (`/formulario`):**
→ **OPCIÓN 1: Todo en WordPress** (más trabajo inicial, pero mejor resultado)

**Si quieres simplicidad y rapidez:**
→ **OPCIÓN 2: Subdominio** (`formulario.agutidesigns.es`) - **YA ESTÁ TODO CONFIGURADO**

---

## 📋 CONFIGURACIÓN ACTUAL (Opción 2 - Subdominio)

El código **ya está listo** para la Opción 2:

```
✅ vercel.json configurado
✅ URLs en backend actualizadas
✅ Emails con URLs correctas
✅ Documentación completa
```

**Para activarla:**
1. Crear 3 proyectos en Vercel
2. Añadir 3 registros CNAME en IONOS
3. Actualizar variables en Railway
4. Cambiar botón en WordPress a `formulario.agutidesigns.es`

---

## 🔄 SI PREFIERES OPCIÓN 1 (WordPress)

### **Pasos para integrar formulario en WordPress:**

#### **1. Preparar los archivos**

Los archivos ya están listos:
- `formulario-membresia.html`
- `checkout.html`
- `success.html`

#### **2. Crear páginas en WordPress**

1. WordPress → Páginas → Añadir nueva
2. **Título:** "Formulario de Membresía"
3. **Slug:** `formulario` (configurar en Permalink)
4. Repetir para "Checkout" y "Success"

#### **3. Insertar el código HTML**

**Opción A: Con plugin "Code Snippets"**
1. Instalar "Code Snippets"
2. Crear snippet con el contenido del HTML
3. Asignar a la página

**Opción B: Con tema hijo**
1. Crear template personalizado
2. Copiar el HTML en el template
3. Asignar template a la página

**Opción C: Con Elementor**
1. Editar página con Elementor
2. Añadir widget "HTML"
3. Pegar el código

#### **4. Configurar permalinks**

WordPress → Ajustes → Enlaces permanentes
- Seleccionar "Nombre de entrada"
- Guardar

#### **5. Actualizar rutas en el código**

Las rutas ya están configuradas como slugs:
```javascript
window.location.href = '/checkout';  // ✅ Ya está así
window.location.href = '/success';   // ✅ Ya está así
```

---

## ⚖️ COMPARACIÓN RÁPIDA

| Característica | WordPress | Subdominio | Vercel Total |
|---|---|---|---|
| URL del formulario | `/formulario` | `formulario.` | `/formulario` |
| Configuración | Media | Fácil | Difícil |
| Mantenimiento | Fácil | Fácil | Medio |
| SEO | Excelente | Bueno | Excelente |
| Velocidad | Buena | Excelente | Excelente |
| Costo adicional | No | No | No |

---

## 🤔 ¿QUÉ OPCIÓN PREFIERES?

**Dime cuál prefieres y adapto todo el código:**

1. **Opción 1:** Todo en WordPress (slugs limpios)
2. **Opción 2:** Subdominio (ya configurado, más rápido)
3. **Opción 3:** Migrar WordPress a Vercel
4. **Opción 4:** Proxy reverso (técnico)

---

**Mi recomendación personal:** 
- Si tienes tiempo → **Opción 1** (mejor UX, mejor SEO)
- Si quieres lanzar rápido → **Opción 2** (ya está listo, solo configurar)

¿Cuál prefieres? 🤔

