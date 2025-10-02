# 🎨 CÓMO AÑADIR TU LOGO AL CHECKOUT

## 📝 PASOS:

### 1. Sube tu logo:
- Crea una carpeta: `mkdir images`
- Coloca tu logo ahí (SVG, PNG o JPG)
- Nombre recomendado: `logo-agutidesigns.svg`

### 2. Edita checkout.html:

Busca esta línea (aproximadamente línea 268):
```html
<div class="logo-text">agutidesigns</div>
```

Reemplázala por:
```html
<img src="/images/logo-agutidesigns.svg" alt="agutidesigns" style="height: 45px;">
```

### 3. Opcional - Añadir también al formulario:

En `formulario-membresia.html`, busca el header y añade tu logo.

### 4. Push a GitHub:
```bash
git add .
git commit -m "add: logo agutidesigns"
git push
```

Vercel y Railway se actualizarán automáticamente.

---

## 💡 MIENTRAS TANTO:

El checkout usa "agutidesigns" como texto.
Funciona perfectamente hasta que añadas tu logo.
