-- Añadir columna display_order
ALTER TABLE videos ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- Asignar valores de orden basados en created_at
UPDATE videos 
SET display_order = (
    SELECT COUNT(*) + 1 
    FROM videos v2 
    WHERE v2.created_at < videos.created_at
)
WHERE display_order IS NULL OR display_order = 999;

-- Mostrar resultados
SELECT id, title, display_order FROM videos ORDER BY display_order;

