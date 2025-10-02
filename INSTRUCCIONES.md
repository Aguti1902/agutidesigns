# 🚀 INSTRUCCIONES RÁPIDAS - CALCULADORA POR PASOS AGUTIDESIGNS

## 📍 **¡YA ESTÁ FUNCIONANDO!**

Tu calculadora de presupuesto por pasos está corriendo en:
👉 **http://localhost:8000**

## 🎯 **Cómo usar (6 pasos):**

1. **Abre tu navegador** y ve a http://localhost:8000
2. **Paso 1 - Proyecto**: Selecciona tipo (Landing, Corporativa, E-commerce), complejidad, hosting
3. **Paso 2 - Contenido**: Textos, imágenes, multimedia
4. **Paso 3 - Diseño**: Nivel de diseño, branding, extras
5. **Paso 4 - Funciones**: Básicas, avanzadas, e-commerce
6. **Paso 5 - Extras**: SEO, mantenimiento, plazos
7. **Paso 6 - Contacto**: Datos del cliente y envío

## ⚙️ **Para reiniciar el servidor:**

```bash
# Detener: Ctrl+C en la terminal
# Reiniciar:
python3 -m http.server 8000

# O usar el script:
./start-server.sh
```

## 💰 **Precios actuales configurados:**

### 📱 **Proyectos Base:**
- **Landing Page:** €500
- **Web Corporativa:** €1,200  
- **Tienda Online:** €2,500

### 📄 **Contenido específico por tipo:**

**🎯 Landing Page:**
- **Básica (Hero, Beneficios, CTA):** Incluido
- **Estándar (+ Testimonios, FAQ):** +€150
- **Completa (+ Galería, Equipo, Blog):** +€300
- **Premium (+ Comparativas, Calculadoras):** +€500

**🌐 Web Corporativa:**
- **Básico (5-8 páginas):** Incluido
- **Estándar (9-15 páginas):** +€400
- **Extenso (16-25 páginas):** +€800
- **Empresarial (+25 páginas):** +€1,200

**🛒 E-commerce:**
- **Básico (1-10 categorías, 1-100 productos):** Incluido
- **Estándar (11-25 categorías, 101-500 productos):** +€500
- **Extenso (26-50 categorías, 501-1000 productos):** +€1,100
- **Empresarial (+50 categorías, +1000 productos):** +€1,800



### 🌐 **Hosting y Dominio:**
- **Ya tiene:** Sin costo adicional
- **Necesita ayuda/gestión:** Incluido en el proyecto
- **Nota:** El hosting se cobra mensualmente aparte

### ✍️ **Contenido:**

**📝 Textos:**
- **Tengo textos listos:** Sin costo
- **Revisión textos parciales:** +€150
- **Creación de todos los textos:** +€400

**🌐 Servicios adicionales:**
- **Traducción:** +€200 por idioma (1-5+ idiomas)
- **Migración contenido:** +€150

**🖼️ Imágenes:**
- **Tengo todas las imágenes:** Sin costo
- **Búsqueda de algunas:** +€100
- **Búsqueda de todas:** +€200
- **Imágenes stock premium:** +€200 (si necesitas)

**🎥 Vídeos:**
- **No necesito vídeos:** Sin costo
- **Integración básica (YouTube, Vimeo):** +€200
- **Vídeos personalizados y optimización:** +€400

### 🎨 **Diseño:**
- **Plantilla premium:** Incluido
- **Diseño personalizado:** +€800
- **Diseño premium:** +€1,500
- **Animaciones CSS:** +€300
- **Modo oscuro:** +€250

### ⚙️ **Funcionalidades:**

**🔧 Básicas y Avanzadas:**
- **Formularios contacto:** +€200
- **Newsletter:** +€300
- **Sistema usuarios:** +€400
- **Reservas:** +€500
- **Pagos online:** +€600
- **Chat en vivo:** +€400

**🛒 E-commerce** (solo para Tienda Online):
- **Gestión inventario:** +€300
- **Sistema cupones:** +€200
- **Cálculo envíos:** +€400
- **Multi-vendedor:** +€500

### 🚀 **SEO y Marketing:**
- **SEO básico:** +€300
- **SEO avanzado:** +€600
- **Google Ads:** +€400
- **Analytics:** +€250

### 🛠️ **Mantenimiento:**
- **Básico (3 meses):** +€100
- **Premium (1 año):** +€300
- **Formación:** +€200
- **Backups:** +€150

### ⏰ **Plazos:**
- **Estándar (4-6 semanas):** Incluido
- **Rápido (2-3 semanas):** +€400
- **Express (1-2 semanas):** +€800

## 🔧 **Personalizar precios:**

Edita el archivo `js/calculator.js` y busca:
```javascript
this.prices = {
    projectType: {
        landing: { name: 'Landing Page', price: 500 },
        // Cambia aquí los precios
    }
};
```

## 🎨 **Cambiar colores:**

Edita `css/styles.css` y modifica:
```css
:root {
    --primary-blue: #2563eb;
    --secondary-blue: #1d4ed8;
    /* Cambia estos valores */
}
```

## 📧 **Contacto en formulario:**

El formulario actualmente simula el envío. Para conectar con tu email:
1. Edita `js/calculator.js`
2. Busca `simulateFormSubmission`
3. Conecta con tu backend o servicio de email

## 🚨 **¿Problemas?**

- **Puerto ocupado:** El script buscará otro puerto automáticamente
- **Python no instalado:** Instala Python 3 desde python.org
- **No abre navegador:** Ve manualmente a http://localhost:8000

## 📱 **Responsive:**
✅ Funciona en móviles, tablets y desktop
✅ Todos los navegadores modernos
✅ Animaciones suaves incluidas

---

**¡Disfruta tu nueva calculadora de presupuesto!** 🎉 