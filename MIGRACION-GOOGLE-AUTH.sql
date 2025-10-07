-- ============================================
-- MIGRACIONES PARA GOOGLE AUTHENTICATION
-- ============================================

-- Añadir columnas necesarias para autenticación con Google
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS picture TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

-- Crear índice para búsquedas rápidas por google_id
CREATE INDEX IF NOT EXISTS idx_clients_google_id ON clients(google_id);

-- Comentarios para documentación
COMMENT ON COLUMN clients.google_id IS 'ID único de Google para OAuth';
COMMENT ON COLUMN clients.picture IS 'URL de la foto de perfil de Google';
COMMENT ON COLUMN clients.email_verified IS 'Si el email fue verificado por Google';
COMMENT ON COLUMN clients.first_name IS 'Nombre del usuario';
COMMENT ON COLUMN clients.last_name IS 'Apellido del usuario';

