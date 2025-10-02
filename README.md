# 🎨 agutidesigns - Sistema de Membresías Web

Sistema completo de suscripciones web con Stripe, dashboard de administrador y formulario interactivo.

## 🚀 Características

- ✅ Formulario multi-paso interactivo
- ✅ 3 planes de suscripción (Básico, Avanzado, Premium)
- ✅ Integración completa con Stripe (pagos recurrentes)
- ✅ Dashboard de administrador
- ✅ Base de datos SQLite
- ✅ Sistema de emails automáticos
- ✅ Campos dinámicos según sector del negocio

## 📦 Estructura del Proyecto

```
/
├── backend/                    # Servidor Node.js + Express
│   ├── server.js              # Servidor principal
│   ├── database.js            # Base de datos SQLite
│   ├── email-service.js       # Envío de emails
│   ├── package.json           # Dependencias
│   └── env.example            # Plantilla de configuración
├── admin-dashboard/           # Dashboard de administrador
│   └── index.html             # Interfaz del dashboard
├── formulario-membresia.html  # Formulario de registro
├── success.html               # Página de éxito
├── pricing-section.html       # Sección de precios
└── README.md                  # Este archivo
```

## ⚡ Instalación

Ver `INSTRUCCIONES-CONFIGURACION.md` para la guía completa.

## 🛠️ Tecnologías

- **Backend**: Node.js, Express, SQLite
- **Pagos**: Stripe (suscripciones recurrentes)
- **Emails**: Nodemailer
- **Frontend**: HTML5, CSS3, JavaScript vanilla

## �� Licencia

© 2025 agutidesigns - Todos los derechos reservados
