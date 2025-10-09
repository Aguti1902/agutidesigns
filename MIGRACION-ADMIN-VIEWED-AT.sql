-- =============================================
-- MIGRACIÓN: Añadir columna admin_viewed_at
-- =============================================
-- Esta columna rastrea cuándo el admin vio un pedido por primera vez
-- Se usa para el badge de notificaciones en el admin dashboard

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS admin_viewed_at TIMESTAMP;

-- Crear índice para mejorar performance de queries
CREATE INDEX IF NOT EXISTS idx_submissions_admin_viewed_at ON submissions(admin_viewed_at);

-- Opcional: Marcar todos los pedidos existentes como vistos (si quieres empezar limpio)
-- UPDATE submissions SET admin_viewed_at = CURRENT_TIMESTAMP WHERE admin_viewed_at IS NULL;

SELECT 'Migración completada: admin_viewed_at añadido a submissions' AS mensaje;

