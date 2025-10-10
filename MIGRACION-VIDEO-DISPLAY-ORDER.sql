-- Migración para añadir columna display_order a la tabla videos
-- Ejecutar este SQL en la base de datos de Railway

-- Paso 1: Verificar si la columna existe (opcional, solo para información)
-- SELECT column_name FROM information_schema.columns WHERE table_name='videos' AND column_name='display_order';

-- Paso 2: Añadir columna display_order si no existe
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

-- Paso 3: Asignar valores de orden a videos existentes (basado en fecha de creación)
WITH ordered_videos AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
    FROM videos
    WHERE display_order IS NULL OR display_order = 999
)
UPDATE videos 
SET display_order = ordered_videos.row_num
FROM ordered_videos
WHERE videos.id = ordered_videos.id;

-- Paso 4: Verificar resultados
SELECT id, title, category, display_order, created_at 
FROM videos 
ORDER BY display_order ASC;

