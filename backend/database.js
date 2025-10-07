const { Pool } = require('pg');

// Configurar conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test de conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conectado a PostgreSQL');
        release();
    }
});

// Inicializar tablas
async function initializeTables() {
    const client = await pool.connect();
    try {
        // Crear tabla de submissions
        await client.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                business_name TEXT NOT NULL,
                business_description TEXT,
                industry TEXT,
                cif_nif TEXT,
                razon_social TEXT,
                direccion_fiscal TEXT,
                business_email TEXT,
                contact_methods TEXT,
                phone_number TEXT,
                email_contact TEXT,
                whatsapp_number TEXT,
                form_email TEXT,
                physical_address TEXT,
                instagram TEXT,
                facebook TEXT,
                linkedin TEXT,
                twitter TEXT,
                services TEXT,
                purpose TEXT,
                target_audience TEXT,
                pages TEXT,
                custom_pages TEXT,
                design_style TEXT,
                brand_colors TEXT,
                reference_websites TEXT,
                logo_data TEXT,
                images_data TEXT,
                keywords TEXT,
                has_analytics TEXT,
                domain_name TEXT,
                domain_alt1 TEXT,
                domain_alt2 TEXT,
                privacy_policy TEXT,
                privacy_text TEXT,
                privacy_file_data TEXT,
                privacy_file_name TEXT,
                web_texts TEXT,
                menu_content TEXT,
                opening_hours TEXT,
                portfolio_description TEXT,
                full_name TEXT,
                email TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                password TEXT,
                plan TEXT NOT NULL,
                amount DECIMAL NOT NULL,
                status TEXT DEFAULT 'pending',
                stripe_session_id TEXT,
                stripe_subscription_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Índices para submissions
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_plan ON submissions(plan)`);

        // Crear tabla de clients
        await client.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                business_name TEXT,
                plan TEXT,
                status TEXT DEFAULT 'active',
                submission_id INTEGER,
                website_status TEXT DEFAULT 'en_construccion',
                website_url TEXT,
                wordpress_url TEXT,
                website_screenshot_url TEXT,
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                payment_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)`);

        // Crear tabla de tickets
        await client.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                client_id INTEGER,
                client_email TEXT NOT NULL,
                client_name TEXT,
                business_name TEXT,
                subject TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                priority TEXT DEFAULT 'media',
                status TEXT DEFAULT 'abierto',
                admin_response TEXT,
                client_response TEXT,
                admin_response_at TIMESTAMP,
                client_response_at TIMESTAMP,
                admin_unread BOOLEAN DEFAULT FALSE,
                client_unread BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`);

        // Crear tabla de projects
        await client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL,
                client_name TEXT,
                business_name TEXT NOT NULL,
                plan TEXT NOT NULL,
                status TEXT DEFAULT 'sin_empezar',
                delivery_date TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);

        // 🆕 MIGRACIÓN: Agregar columnas faltantes a la tabla projects
        try {
            await client.query(`
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS submission_id INTEGER,
                ADD COLUMN IF NOT EXISTS project_name TEXT,
                ADD COLUMN IF NOT EXISTS client_email TEXT,
                ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
                ADD COLUMN IF NOT EXISTS deadline TIMESTAMP,
                ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0
            `);
            console.log('✅ Migración: Columnas de projects añadidas');
        } catch (e) {
            console.log('⚠️ Migración projects ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campo is_upgrade a projects
        try {
            await client.query(`
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS is_upgrade BOOLEAN DEFAULT FALSE
            `);
            console.log('✅ Migración: Campo is_upgrade añadido a projects');
        } catch (e) {
            console.log('⚠️ Migración is_upgrade en projects ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campos de upgrade a submissions
        try {
            await client.query(`
                ALTER TABLE submissions 
                ADD COLUMN IF NOT EXISTS is_upgrade BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS previous_plan TEXT
            `);
            console.log('✅ Migración: Campos de upgrade añadidos a submissions');
        } catch (e) {
            console.log('⚠️ Migración upgrade en submissions ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campos para trackear modificaciones
        try {
            await client.query(`
                ALTER TABLE submissions 
                ADD COLUMN IF NOT EXISTS has_upgrade BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS has_modifications BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP
            `);
            console.log('✅ Migración: Campos de tracking de modificaciones añadidos a submissions');
        } catch (e) {
            console.log('⚠️ Migración tracking en submissions ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campo billing_cycle
        try {
            await client.query(`
                ALTER TABLE submissions 
                ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'
            `);
            console.log('✅ Migración: Campo billing_cycle añadido a submissions');
        } catch (e) {
            console.log('⚠️ Migración billing_cycle en submissions ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campo para marcar modificaciones como vistas
        try {
            await client.query(`
                ALTER TABLE submissions 
                ADD COLUMN IF NOT EXISTS modifications_viewed_at TIMESTAMP
            `);
            console.log('✅ Migración: Campo modifications_viewed_at añadido a submissions');
        } catch (e) {
            console.log('⚠️ Migración modifications_viewed_at en submissions ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campos para integración con Mailchimp
        try {
            await client.query(`
                ALTER TABLE clients 
                ADD COLUMN IF NOT EXISTS mailchimp_api_key TEXT,
                ADD COLUMN IF NOT EXISTS mailchimp_server_prefix TEXT,
                ADD COLUMN IF NOT EXISTS mailchimp_audience_id TEXT
            `);
            console.log('✅ Migración: Campos de Mailchimp añadidos a clients');
        } catch (e) {
            console.log('⚠️ Migración Mailchimp en clients ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campo para Google Analytics Property ID
        try {
            await client.query(`
                ALTER TABLE clients 
                ADD COLUMN IF NOT EXISTS ga_property_id TEXT
            `);
            console.log('✅ Migración: Campo ga_property_id añadido a clients');
        } catch (e) {
            console.log('⚠️ Migración ga_property_id en clients ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campo para URL del sitio web público
        try {
            await client.query(`
                ALTER TABLE clients 
                ADD COLUMN IF NOT EXISTS website_url TEXT
            `);
            console.log('✅ Migración: Campo website_url añadido a clients');
        } catch (e) {
            console.log('⚠️ Migración website_url en clients ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar credenciales de WordPress para cada cliente
        try {
            await client.query(`
                ALTER TABLE clients 
                ADD COLUMN IF NOT EXISTS wordpress_username TEXT,
                ADD COLUMN IF NOT EXISTS wordpress_password TEXT
            `);
            console.log('✅ Migración: Credenciales de WordPress añadidas a clients');
        } catch (e) {
            console.log('⚠️ Migración credenciales WordPress en clients ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campo is_downgrade para submissions
        try {
            await client.query(`
                ALTER TABLE submissions 
                ADD COLUMN IF NOT EXISTS is_downgrade BOOLEAN DEFAULT FALSE
            `);
            console.log('✅ Migración: Campo is_downgrade añadido a submissions');
        } catch (e) {
            console.log('⚠️ Migración is_downgrade en submissions ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campo plan_change_at para reiniciar ventana de edición 24h
        try {
            await client.query(`
                ALTER TABLE clients 
                ADD COLUMN IF NOT EXISTS plan_change_at TIMESTAMP
            `);
            console.log('✅ Migración: Campo plan_change_at añadido a clients');
        } catch (e) {
            console.log('⚠️ Migración plan_change_at en clients ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campo is_downgrade para projects
        try {
            await client.query(`
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS is_downgrade BOOLEAN DEFAULT FALSE
            `);
            console.log('✅ Migración: Campo is_downgrade añadido a projects');
        } catch (e) {
            console.log('⚠️ Migración is_downgrade en projects ya aplicada');
        }

        // 🆕 MIGRACIÓN: Crear tabla de cancelaciones
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS cancellations (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
                    subscription_id VARCHAR(255),
                    cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    effective_date TIMESTAMP,
                    reason VARCHAR(255),
                    reason_details TEXT,
                    cancelled_by VARCHAR(20),
                    reactivated BOOLEAN DEFAULT FALSE,
                    reactivated_at TIMESTAMP,
                    coupon_applied BOOLEAN DEFAULT FALSE,
                    coupon_code VARCHAR(50)
                )
            `);
            console.log('✅ Migración: Tabla cancellations creada');
        } catch (e) {
            console.log('⚠️ Migración tabla cancellations ya aplicada');
        }

        // 🆕 MIGRACIÓN: Agregar campos de cancelación a clients
        try {
            await client.query(`
                ALTER TABLE clients 
                ADD COLUMN IF NOT EXISTS cancellation_scheduled BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS cancellation_effective_date TIMESTAMP,
                ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255)
            `);
            console.log('✅ Migración: Campos de cancelación añadidos a clients');
        } catch (e) {
            console.log('⚠️ Migración campos de cancelación en clients ya aplicada');
        }

        console.log('✅ Tablas PostgreSQL inicializadas correctamente');
    } catch (error) {
        console.error('❌ Error inicializando tablas:', error);
    } finally {
        client.release();
    }
}

// Inicializar tablas al cargar el módulo
initializeTables();

// ===== FUNCIONES DE BASE DE DATOS =====

async function createSubmission(data) {
    const result = await pool.query(`
        INSERT INTO submissions (
            business_name, business_description, industry, cif_nif, razon_social, direccion_fiscal, business_email,
            contact_methods, phone_number, email_contact, whatsapp_number, form_email, physical_address,
            instagram, facebook, linkedin, twitter,
            services, purpose, target_audience, pages, custom_pages,
            design_style, brand_colors, reference_websites, logo_data, images_data,
            keywords, has_analytics,
            domain_name, domain_alt1, domain_alt2,
            privacy_policy, privacy_text, privacy_file_data, privacy_file_name,
            web_texts, menu_content, opening_hours, portfolio_description,
            full_name, email, phone, address, password,
            plan, amount, status, is_upgrade, previous_plan
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50)
        RETURNING id
    `, [
        data.business_name || null,
        data.business_description || null,
        data.industry || null,
        data.cif_nif || null,
        data.razon_social || null,
        data.direccion_fiscal || null,
        data.business_email || null,
        JSON.stringify(data.contact_methods) || null,
        data.phone_number || null,
        data.email_contact || null,
        data.whatsapp_number || null,
        data.form_email || null,
        data.physical_address || null,
        data.instagram || null,
        data.facebook || null,
        data.linkedin || null,
        data.twitter || null,
        data.services_list || data.services || null,
        JSON.stringify(data.purpose) || null,
        data.target_audience || null,
        JSON.stringify(data.pages) || null,
        JSON.stringify(data.custom_pages) || null,
        data.design_style || null,
        data.brand_colors || null,
        data.reference_websites || null,
        data.logo_data || null,
        data.images_data || null,
        data.keywords || null,
        data.has_analytics || null,
        data.domain_name || null,
        data.domain_alt1 || null,
        data.domain_alt2 || null,
        data.privacy_policy || null,
        data.privacy_text || null,
        data.privacy_file_data || null,
        data.privacy_file_name || null,
        data.web_texts || null,
        data.menu_content || null,
        data.opening_hours || null,
        data.portfolio_description || null,
        data.full_name || null,
        data.email,
        data.phone || null,
        data.address || null,
        data.password || null,
        data.plan,
        data.amount,
        data.status || 'pending',
        data.is_upgrade || false,
        data.previous_plan || null
    ]);
    return result.rows[0].id;
}

async function getSubmission(id) {
    const result = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
    const submission = result.rows[0];
    
    if (submission) {
        // Parsear JSON fields (con protección contra errores)
        try {
            if (submission.contact_methods) {
                submission.contact_methods = typeof submission.contact_methods === 'string' 
                    ? JSON.parse(submission.contact_methods) 
                    : submission.contact_methods;
            }
        } catch (e) {
            console.log('⚠️ Error parsing contact_methods:', e.message, '- valor:', submission.contact_methods);
            submission.contact_methods = [];
        }
        
        try {
            if (submission.purpose) {
                submission.purpose = typeof submission.purpose === 'string' 
                    ? JSON.parse(submission.purpose) 
                    : submission.purpose;
            }
        } catch (e) {
            console.log('🔧 [DB] Corrigiendo formato de purpose (se arreglará automáticamente)');
            submission.purpose = [];
        }
        
        try {
            if (submission.pages) {
                submission.pages = typeof submission.pages === 'string' 
                    ? JSON.parse(submission.pages) 
                    : submission.pages;
            }
        } catch (e) {
            console.log('⚠️ Error parsing pages:', e.message);
            submission.pages = [];
        }
        
        try {
            if (submission.custom_pages) {
                submission.custom_pages = typeof submission.custom_pages === 'string' 
                    ? JSON.parse(submission.custom_pages) 
                    : submission.custom_pages;
            }
        } catch (e) {
            console.log('⚠️ Error parsing custom_pages:', e.message);
            submission.custom_pages = [];
        }
        
        if (submission.images_data) {
            try {
                submission.images_data = typeof submission.images_data === 'string' 
                    ? JSON.parse(submission.images_data) 
                    : submission.images_data;
            } catch (e) {
                console.log('⚠️ Error parsing images_data:', e.message);
            }
        }
        
        submission.services_list = submission.services;
    }
    
    return submission;
}

async function getSubmissionBySubscriptionId(subscriptionId) {
    const result = await pool.query(
        'SELECT * FROM submissions WHERE stripe_subscription_id = $1',
        [subscriptionId]
    );
    return result.rows[0];
}

async function getAllSubmissions() {
    const result = await pool.query(`
        SELECT id, business_name, email, plan, amount, status, created_at,
               has_upgrade, is_downgrade, has_modifications, previous_plan, last_modified_at,
               modifications_viewed_at
        FROM submissions 
        ORDER BY created_at DESC
    `);
    return result.rows;
}

async function updateSubmissionStatus(id, status, stripeSessionId = null) {
    if (stripeSessionId) {
        await pool.query(
            'UPDATE submissions SET status = $1, stripe_session_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [status, stripeSessionId, id]
        );
    } else {
        await pool.query(
            'UPDATE submissions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, id]
        );
    }
}

async function markSubmissionAsViewed(id) {
    await pool.query(
        'UPDATE submissions SET modifications_viewed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
    );
}

async function getStats(dateFilter = {}) {
    // Construir filtro de fechas si existe
    const hasDateFilter = dateFilter.start && dateFilter.end;
    
    console.log('📊 [DB] getStats con filtro de fecha:', { hasDateFilter, dateFilter });
    
    // Total de solicitudes (todas las submissions)
    let totalResult;
    if (hasDateFilter) {
        totalResult = await pool.query(
            'SELECT COUNT(*) as count FROM submissions WHERE created_at >= $1 AND created_at <= $2',
            [dateFilter.start, dateFilter.end]
        );
    } else {
        totalResult = await pool.query('SELECT COUNT(*) as count FROM submissions');
    }
    
    // Clientes con plan activo (que han pagado)
    let activeClientsResult;
    if (hasDateFilter) {
        activeClientsResult = await pool.query(
            `SELECT COUNT(*) as count FROM clients 
             WHERE plan IS NOT NULL AND plan != '' 
             AND created_at >= $1 AND created_at <= $2`,
            [dateFilter.start, dateFilter.end]
        );
    } else {
        activeClientsResult = await pool.query(
            `SELECT COUNT(*) as count FROM clients 
             WHERE plan IS NOT NULL AND plan != ''`
        );
    }
    
    // Clientes sin plan (oportunidades de venta)
    let noPlanResult;
    if (hasDateFilter) {
        noPlanResult = await pool.query(
            `SELECT COUNT(*) as count FROM submissions 
             WHERE (status = 'pending' 
             OR id NOT IN (SELECT submission_id FROM clients WHERE submission_id IS NOT NULL))
             AND created_at >= $1 AND created_at <= $2`,
            [dateFilter.start, dateFilter.end]
        );
    } else {
        noPlanResult = await pool.query(
            `SELECT COUNT(*) as count FROM submissions 
             WHERE status = 'pending' 
             OR id NOT IN (SELECT submission_id FROM clients WHERE submission_id IS NOT NULL)`
        );
    }
    
    // Revenue total (de submissions con estado 'paid' o 'completed')
    let revenueResult;
    if (hasDateFilter) {
        revenueResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as revenue 
             FROM submissions 
             WHERE status IN ('paid', 'completed')
             AND created_at >= $1 AND created_at <= $2`,
            [dateFilter.start, dateFilter.end]
        );
    } else {
        revenueResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as revenue 
             FROM submissions 
             WHERE status IN ('paid', 'completed')`
        );
    }
    
    // Proyectos en desarrollo
    let projectsResult;
    if (hasDateFilter) {
        projectsResult = await pool.query(
            `SELECT COUNT(*) as count FROM projects 
             WHERE status = 'en_desarrollo'
             AND created_at >= $1 AND created_at <= $2`,
            [dateFilter.start, dateFilter.end]
        );
    } else {
        projectsResult = await pool.query(
            `SELECT COUNT(*) as count FROM projects 
             WHERE status = 'en_desarrollo'`
        );
    }
    
    // Distribución por planes
    let basicoPlanResult, avanzadoPlanResult, premiumPlanResult;
    if (hasDateFilter) {
        basicoPlanResult = await pool.query(
            `SELECT COUNT(*) as count FROM clients 
             WHERE plan = 'basico' AND created_at >= $1 AND created_at <= $2`,
            [dateFilter.start, dateFilter.end]
        );
        avanzadoPlanResult = await pool.query(
            `SELECT COUNT(*) as count FROM clients 
             WHERE plan = 'avanzado' AND created_at >= $1 AND created_at <= $2`,
            [dateFilter.start, dateFilter.end]
        );
        premiumPlanResult = await pool.query(
            `SELECT COUNT(*) as count FROM clients 
             WHERE plan = 'premium' AND created_at >= $1 AND created_at <= $2`,
            [dateFilter.start, dateFilter.end]
        );
    } else {
        basicoPlanResult = await pool.query(
            `SELECT COUNT(*) as count FROM clients WHERE plan = 'basico'`
        );
        avanzadoPlanResult = await pool.query(
            `SELECT COUNT(*) as count FROM clients WHERE plan = 'avanzado'`
        );
        premiumPlanResult = await pool.query(
            `SELECT COUNT(*) as count FROM clients WHERE plan = 'premium'`
        );
    }
    
    return {
        total: parseInt(totalResult.rows[0].count),
        activeClients: parseInt(activeClientsResult.rows[0].count),
        noPlan: parseInt(noPlanResult.rows[0].count),
        revenue: parseFloat(revenueResult.rows[0].revenue),
        projectsInProgress: parseInt(projectsResult.rows[0].count),
        byPlan: {
            basico: parseInt(basicoPlanResult.rows[0].count),
            avanzado: parseInt(avanzadoPlanResult.rows[0].count),
            premium: parseInt(premiumPlanResult.rows[0].count)
        }
    };
}

async function searchSubmissions(query) {
    const result = await pool.query(`
        SELECT * FROM submissions 
        WHERE business_name ILIKE $1 OR email ILIKE $1 
        ORDER BY created_at DESC
    `, [`%${query}%`]);
    return result.rows;
}

async function createClient(data) {
    const result = await pool.query(`
        INSERT INTO clients (email, password, full_name, business_name, plan, submission_id, stripe_customer_id, stripe_subscription_id, payment_date, website_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
    `, [
        data.email,
        data.password,
        data.full_name,
        data.business_name || null,
        data.plan || null,
        data.submission_id || null,
        data.stripe_customer_id || null,
        data.stripe_subscription_id || null,
        data.payment_date || null,
        data.website_status || 'en_construccion'
    ]);
    return result.rows[0].id;
}

async function updateClient(clientId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.plan !== undefined) {
        fields.push(`plan = $${paramCount++}`);
        values.push(updates.plan);
    }
    if (updates.stripe_subscription_id !== undefined) {
        fields.push(`stripe_subscription_id = $${paramCount++}`);
        values.push(updates.stripe_subscription_id);
    }
    if (updates.payment_date !== undefined) {
        fields.push(`payment_date = $${paramCount++}`);
        values.push(updates.payment_date);
    }
    if (updates.submission_id !== undefined) {
        fields.push(`submission_id = $${paramCount++}`);
        values.push(updates.submission_id);
    }
    if (updates.website_status !== undefined) {
        fields.push(`website_status = $${paramCount++}`);
        values.push(updates.website_status);
    }
    if (updates.plan_change_at !== undefined) {
        fields.push(`plan_change_at = $${paramCount++}`);
        values.push(updates.plan_change_at);
    }
    if (updates.billing_cycle !== undefined) {
        fields.push(`billing_cycle = $${paramCount++}`);
        values.push(updates.billing_cycle);
    }
    if (updates.cancellation_scheduled !== undefined) {
        fields.push(`cancellation_scheduled = $${paramCount++}`);
        values.push(updates.cancellation_scheduled);
    }
    if (updates.cancellation_effective_date !== undefined) {
        fields.push(`cancellation_effective_date = $${paramCount++}`);
        values.push(updates.cancellation_effective_date);
    }
    if (updates.cancellation_reason !== undefined) {
        fields.push(`cancellation_reason = $${paramCount++}`);
        values.push(updates.cancellation_reason);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(clientId);
    
    console.log('🔧 [DB] updateClient - Campos a actualizar:', fields.join(', '));
    console.log('🔧 [DB] updateClient - Valores:', values.slice(0, -1));
    
    await pool.query(
        `UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        values
    );
    
    console.log('✅ [DB] Cliente #' + clientId + ' actualizado exitosamente');
}

async function getClientByEmail(email) {
    const result = await pool.query('SELECT * FROM clients WHERE email = $1', [email]);
    return result.rows[0];
}

async function getClientById(id) {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    return result.rows[0];
}

async function updateWebsiteStatus(clientId, status, url = null) {
    if (url) {
        await pool.query(
            'UPDATE clients SET website_status = $1, website_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [status, url, clientId]
        );
    } else {
        await pool.query(
            'UPDATE clients SET website_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, clientId]
        );
    }
}

async function getClientDashboardData(clientId) {
    console.log(`📊 [DB] Obteniendo datos del dashboard para cliente #${clientId}`);
    
    const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    const client = clientResult.rows[0];
    
    if (!client) {
        console.log('❌ [DB] Cliente no encontrado');
        return null;
    }
    
    console.log('✅ [DB] Cliente encontrado:', client.email);
    console.log('🔗 [DB] submission_id:', client.submission_id);
    
    let submission = null;
    if (client.submission_id) {
        submission = await getSubmission(client.submission_id);
        console.log('📋 [DB] Submission:', submission ? 'Encontrada' : 'No encontrada');
    }
    
    return { client, submission };
}

async function createTicket(data) {
    const result = await pool.query(`
        INSERT INTO tickets (
            client_id, client_email, client_name, business_name,
            subject, category, description, priority, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
    `, [
        data.client_id,
        data.client_email,
        data.client_name || null,
        data.business_name || null,
        data.subject,
        data.category,
        data.description,
        data.priority || 'media',
        data.status || 'abierto'
    ]);
    return result.rows[0].id;
}

async function getAllTickets() {
    const result = await pool.query(`
        SELECT * FROM tickets 
        ORDER BY created_at DESC
    `);
    return result.rows;
}

async function getTicketsByClient(clientId) {
    const result = await pool.query(
        'SELECT * FROM tickets WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
    );
    return result.rows;
}

async function getTicketById(ticketId) {
    const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    return result.rows[0];
}

async function updateTicket(ticketId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);
    }
    if (updates.admin_response !== undefined) {
        fields.push(`admin_response = $${paramCount++}`);
        values.push(updates.admin_response);
        fields.push(`admin_response_at = CURRENT_TIMESTAMP`);
        if (updates.client_unread === undefined) {
            fields.push(`client_unread = TRUE`);
        }
    }
    if (updates.client_response !== undefined) {
        fields.push(`client_response = $${paramCount++}`);
        values.push(updates.client_response);
        fields.push(`client_response_at = CURRENT_TIMESTAMP`);
        if (updates.admin_unread === undefined) {
            fields.push(`admin_unread = TRUE`);
        }
    }
    if (updates.admin_unread !== undefined) {
        fields.push(`admin_unread = $${paramCount++}`);
        values.push(updates.admin_unread);
    }
    if (updates.client_unread !== undefined) {
        fields.push(`client_unread = $${paramCount++}`);
        values.push(updates.client_unread);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(ticketId);
    
    await pool.query(
        `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        values
    );
}

async function getTicketStats() {
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM tickets');
    const openResult = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'abierto'");
    const closedResult = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'cerrado'");
    
    return {
        total: parseInt(totalResult.rows[0].count),
        abiertos: parseInt(openResult.rows[0].count),
        cerrados: parseInt(closedResult.rows[0].count)
    };
}

async function createProject(data) {
    console.log('📝 [DB] Creando proyecto con datos:', {
        client_id: data.client_id,
        submission_id: data.submission_id,
        project_name: data.project_name,
        business_name: data.business_name,
        client_email: data.client_email,
        plan: data.plan,
        status: data.status
    });
    
    const result = await pool.query(`
        INSERT INTO projects (
            client_id, 
            submission_id,
            project_name, 
            client_name, 
            business_name, 
            client_email,
            plan, 
            status, 
            priority,
            deadline,
            progress,
            delivery_date, 
            notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
    `, [
        data.client_id,
        data.submission_id || null,
        data.project_name || data.business_name || 'Proyecto sin nombre',
        data.client_name || null,
        data.business_name || 'Sin especificar',
        data.client_email || null,
        data.plan || 'basico',
        data.status || 'sin_empezar',
        data.priority || 'normal',
        data.deadline || null,
        data.progress || 0,
        data.delivery_date || null,
        data.notes || null
    ]);
    
    const projectId = result.rows[0].id;
    console.log(`✅ [DB] Proyecto #${projectId} creado exitosamente`);
    return projectId;
}

async function getAllProjects() {
    const result = await pool.query(`
        SELECT * FROM projects 
        ORDER BY created_at DESC
    `);
    return result.rows;
}

async function getProjectsByStatus(status) {
    const result = await pool.query(
        'SELECT * FROM projects WHERE status = $1 ORDER BY created_at DESC',
        [status]
    );
    return result.rows;
}

async function getProjectsByClient(clientId) {
    const result = await pool.query(
        'SELECT * FROM projects WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
    );
    return result.rows;
}

async function getProjectById(projectId) {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    return result.rows[0];
}

async function updateProject(projectId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);
    }
    if (updates.delivery_date !== undefined) {
        fields.push(`delivery_date = $${paramCount++}`);
        values.push(updates.delivery_date);
    }
    if (updates.notes !== undefined) {
        fields.push(`notes = $${paramCount++}`);
        values.push(updates.notes);
    }
    if (updates.progress !== undefined) {
        fields.push(`progress = $${paramCount++}`);
        values.push(updates.progress);
    }
    if (updates.priority !== undefined) {
        fields.push(`priority = $${paramCount++}`);
        values.push(updates.priority);
    }
    if (updates.deadline !== undefined) {
        fields.push(`deadline = $${paramCount++}`);
        values.push(updates.deadline);
    }
    if (updates.project_name !== undefined) {
        fields.push(`project_name = $${paramCount++}`);
        values.push(updates.project_name);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(projectId);
    
    await pool.query(
        `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        values
    );
}

async function deleteProject(projectId) {
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
}

async function getProjectStats() {
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM projects');
    const sinEmpezarResult = await pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'sin_empezar'");
    const enDesarrolloResult = await pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'en_desarrollo'");
    const entregadaResult = await pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'entregada'");
    
    return {
        total: parseInt(totalResult.rows[0].count),
        sin_empezar: parseInt(sinEmpezarResult.rows[0].count),
        en_desarrollo: parseInt(enDesarrolloResult.rows[0].count),
        entregada: parseInt(entregadaResult.rows[0].count)
    };
}

// Obtener todos los clientes con sus datos de submission
async function getAllClients() {
    const result = await pool.query(`
        SELECT 
            c.id,
            c.email,
            c.full_name,
            c.plan,
            c.website_status,
            c.payment_date,
            c.stripe_subscription_id,
            c.submission_id,
            c.wordpress_url,
            c.website_screenshot_url,
            c.created_at,
            s.business_name,
            s.industry,
            s.phone_number,
            s.domain_name
        FROM clients c
        LEFT JOIN submissions s ON c.submission_id = s.id
        ORDER BY c.created_at DESC
    `);
    return result.rows;
}

// Obtener cliente con detalles completos
async function getClientWithDetails(clientId) {
    const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) return null;
    
    const client = clientResult.rows[0];
    
    // Obtener submission si existe
    if (client.submission_id) {
        client.submission = await getSubmission(client.submission_id);
    }
    
    // Obtener proyecto si existe
    const projectResult = await pool.query('SELECT * FROM projects WHERE client_id = $1', [clientId]);
    if (projectResult.rows.length > 0) {
        client.project = projectResult.rows[0];
    }
    
    return client;
}

// ===== FUNCIONES DE CANCELACIÓN =====

async function createCancellation(data) {
    const result = await pool.query(`
        INSERT INTO cancellations (
            client_id, subscription_id, effective_date, reason, 
            reason_details, cancelled_by, coupon_applied, coupon_code
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `, [
        data.client_id,
        data.subscription_id,
        data.effective_date,
        data.reason,
        data.reason_details || null,
        data.cancelled_by,
        data.coupon_applied || false,
        data.coupon_code || null
    ]);
    return result.rows[0];
}

async function getAllCancellations() {
    const result = await pool.query(`
        SELECT 
            ca.id,
            ca.client_id,
            ca.subscription_id,
            ca.cancelled_at,
            ca.effective_date,
            ca.reason,
            ca.reason_details,
            ca.cancelled_by,
            ca.reactivated,
            ca.reactivated_at,
            ca.coupon_applied,
            ca.coupon_code,
            c.email,
            c.full_name,
            c.plan,
            s.business_name
        FROM cancellations ca
        LEFT JOIN clients c ON ca.client_id = c.id
        LEFT JOIN submissions s ON c.submission_id = s.id
        ORDER BY ca.cancelled_at DESC
    `);
    return result.rows;
}

async function getCancellationByClientId(clientId) {
    const result = await pool.query(`
        SELECT * FROM cancellations 
        WHERE client_id = $1 AND reactivated = FALSE
        ORDER BY cancelled_at DESC 
        LIMIT 1
    `, [clientId]);
    return result.rows[0] || null;
}

async function reactivateCancellation(cancellationId) {
    await pool.query(`
        UPDATE cancellations 
        SET reactivated = TRUE, reactivated_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `, [cancellationId]);
    
    // También actualizar campos en clients
    const cancellation = await pool.query('SELECT client_id FROM cancellations WHERE id = $1', [cancellationId]);
    if (cancellation.rows.length > 0) {
        await pool.query(`
            UPDATE clients 
            SET cancellation_scheduled = FALSE, 
                cancellation_effective_date = NULL,
                cancellation_reason = NULL
            WHERE id = $1
        `, [cancellation.rows[0].client_id]);
    }
}

async function getCancellationStats() {
    // Total de cancelaciones
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM cancellations WHERE reactivated = FALSE');
    
    // Cancelaciones por razón
    const byReasonResult = await pool.query(`
        SELECT reason, COUNT(*) as count 
        FROM cancellations 
        WHERE reactivated = FALSE
        GROUP BY reason
        ORDER BY count DESC
    `);
    
    // Reactivaciones
    const reactivatedResult = await pool.query('SELECT COUNT(*) as count FROM cancellations WHERE reactivated = TRUE');
    
    // Valor perdido (revenue lost)
    const revenueLostResult = await pool.query(`
        SELECT SUM(
            CASE 
                WHEN c.plan = 'basico' THEN 35
                WHEN c.plan = 'avanzado' THEN 49
                WHEN c.plan = 'premium' THEN 65
                ELSE 0
            END
        ) as revenue_lost
        FROM cancellations ca
        LEFT JOIN clients c ON ca.client_id = c.id
        WHERE ca.reactivated = FALSE
    `);
    
    return {
        total: parseInt(totalResult.rows[0].count),
        by_reason: byReasonResult.rows,
        reactivated: parseInt(reactivatedResult.rows[0].count),
        revenue_lost: parseFloat(revenueLostResult.rows[0].revenue_lost || 0)
    };
}

module.exports = {
    pool,
    db: pool, // Alias para compatibilidad
    createSubmission,
    getSubmission,
    getSubmissionBySubscriptionId,
    getAllSubmissions,
    updateSubmissionStatus,
    markSubmissionAsViewed,
    getStats,
    searchSubmissions,
    createClient,
    updateClient,
    getAllClients,
    getClientWithDetails,
    getClientByEmail,
    getClientById,
    updateWebsiteStatus,
    getClientDashboardData,
    createTicket,
    getAllTickets,
    getTicketsByClient,
    getTicketById,
    updateTicket,
    getTicketStats,
    createProject,
    getAllProjects,
    getProjectsByStatus,
    getProjectsByClient,
    getProjectById,
    updateProject,
    deleteProject,
    getProjectStats,
    createCancellation,
    getAllCancellations,
    getCancellationByClientId,
    reactivateCancellation,
    getCancellationStats
};
