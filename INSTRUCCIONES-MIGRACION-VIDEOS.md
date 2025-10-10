# 🔧 Migración: Añadir campo display_order a videos

## ❌ Problema
Al intentar editar un video, obtienes un error 500 porque la columna `display_order` no existe en la tabla `videos`.

## ✅ Solución

### Opción 1: Ejecutar SQL en Railway Dashboard (RECOMENDADO)

1. **Accede a Railway:**
   - Ve a [railway.app](https://railway.app)
   - Entra a tu proyecto `agutidesigns`
   - Selecciona tu base de datos PostgreSQL

2. **Abre la pestaña "Data":**
   - Busca la opción "Query" o "SQL Query"
   - Se abrirá un editor SQL

3. **Copia y pega el siguiente SQL:**

```sql
-- Añadir columna display_order
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='videos' AND column_name='display_order'
    ) THEN
        ALTER TABLE videos ADD COLUMN display_order INTEGER DEFAULT 999;
        RAISE NOTICE 'Columna display_order añadida exitosamente';
    ELSE
        RAISE NOTICE 'La columna display_order ya existe';
    END IF;
END $$;

-- Asignar valores de orden a videos existentes
WITH ordered_videos AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
    FROM videos
    WHERE display_order IS NULL OR display_order = 999
)
UPDATE videos 
SET display_order = ordered_videos.row_num
FROM ordered_videos
WHERE videos.id = ordered_videos.id;

-- Verificar resultados
SELECT id, title, category, display_order, created_at 
FROM videos 
ORDER BY display_order ASC;
```

4. **Ejecuta el SQL:**
   - Presiona el botón "Run" o "Execute"
   - Verifica que se ejecute sin errores

5. **Verifica los resultados:**
   - Deberías ver una lista de todos tus videos con su `display_order` asignado
   - Los videos más antiguos tendrán números más bajos (1, 2, 3...)

### Opción 2: Usar Railway CLI

Si prefieres usar la línea de comandos:

```bash
# Instalar Railway CLI (si no la tienes)
npm install -g @railway/cli

# Iniciar sesión
railway login

# Conectar al proyecto
railway link

# Ejecutar el archivo SQL
railway run psql < MIGRACION-VIDEO-DISPLAY-ORDER.sql
```

## ✅ Verificación

Después de ejecutar la migración:

1. **Prueba editar un video:**
   - Ve al Admin Dashboard
   - Haz clic en el botón ✏️ de un video
   - Cambia el orden
   - Guarda

2. **El error 500 debería desaparecer** y verás un mensaje de éxito.

## 📝 Nota

Esta migración:
- ✅ Añade la columna `display_order` a la tabla videos
- ✅ Asigna valores automáticos basados en la fecha de creación
- ✅ Es segura de ejecutar múltiples veces (no duplica la columna)
- ✅ No elimina ni modifica datos existentes

## 🆘 ¿Problemas?

Si sigues teniendo errores:
1. Verifica que la migración se ejecutó correctamente
2. Revisa los logs de Railway para más detalles
3. Comprueba que el servidor se haya reiniciado después de la migración

