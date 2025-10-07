/**
 * 🔐 AUTENTICACIÓN CON GOOGLE - agutidesigns
 * Sistema de OAuth 2.0 para registro y login
 */

const { OAuth2Client } = require('google-auth-library');

// Cliente de Google OAuth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verificar token de Google
 * @param {string} token - Token JWT de Google
 * @returns {Object} Datos del usuario verificados
 */
async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        
        return {
            googleId: payload['sub'],
            email: payload['email'],
            emailVerified: payload['email_verified'],
            firstName: payload['given_name'],
            lastName: payload['family_name'],
            fullName: payload['name'],
            picture: payload['picture'],
            locale: payload['locale']
        };
    } catch (error) {
        console.error('❌ Error verificando token de Google:', error);
        throw new Error('Token de Google inválido');
    }
}

/**
 * Obtener o crear usuario desde datos de Google
 * @param {Object} googleData - Datos del usuario de Google
 * @param {Object} db - Instancia de la base de datos
 * @returns {Object} Usuario de la base de datos
 */
async function getOrCreateGoogleUser(googleData, db) {
    try {
        // Buscar si ya existe un usuario con ese email
        let user = await db.getClientByEmail(googleData.email);
        
        if (user) {
            // Usuario existe, actualizar google_id si no lo tiene
            if (!user.google_id) {
                await db.pool.query(
                    'UPDATE clients SET google_id = $1, picture = $2 WHERE id = $3',
                    [googleData.googleId, googleData.picture, user.id]
                );
                console.log(`✅ Usuario existente vinculado con Google: ${googleData.email}`);
            }
            return user;
        }
        
        // Usuario no existe, crear uno nuevo
        console.log(`🆕 Creando nuevo usuario con Google: ${googleData.email}`);
        
        // Generar contraseña aleatoria (no se usará, pero es requerida)
        const bcrypt = require('bcryptjs');
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        const result = await db.pool.query(`
            INSERT INTO clients (
                email,
                password,
                full_name,
                first_name,
                last_name,
                google_id,
                picture,
                email_verified,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            RETURNING *
        `, [
            googleData.email,
            hashedPassword,
            googleData.fullName,
            googleData.firstName,
            googleData.lastName,
            googleData.googleId,
            googleData.picture,
            googleData.emailVerified
        ]);
        
        user = result.rows[0];
        console.log(`✅ Usuario creado con Google: ${googleData.email}`);
        
        return user;
        
    } catch (error) {
        console.error('❌ Error obteniendo/creando usuario de Google:', error);
        throw error;
    }
}

module.exports = {
    verifyGoogleToken,
    getOrCreateGoogleUser
};

