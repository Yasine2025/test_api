// src/config/db.ts
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || "srv1860.hstgr.io",
  user: process.env.DB_USER || "u915424601_amazon_api",
  password: process.env.DB_PASSWORD || "ke2#OOpjH>8U",
  database: process.env.DB_NAME || "u915424601_amazon_partner",
  port: parseInt(process.env.DB_PORT || "3306"),
};

/**
 * Initialiser et tester la connexion à la base de données
 */
async function initDatabase() {
  try {
    console.log('🔄 Testing database connection...');
    console.log(`   Host: ${DB_CONFIG.host}`);
    console.log(`   Database: ${DB_CONFIG.database}`);
    console.log(`   User: ${DB_CONFIG.user}`);
    
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log(`✅ Successfully connected to database: ${DB_CONFIG.database}`);
    
    // Vérifier les tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ Found ${(tables as any[]).length} tables in database`);
    
    // Afficher les tables
    if ((tables as any[]).length > 0) {
      console.log('📋 Available tables:');
      (tables as any[]).forEach((table: any) => {
        const tableName = Object.values(table)[0];
        console.log(`   - ${tableName}`);
      });
    } else {
      console.warn('⚠️  No tables found in database. Please run the SQL setup script.');
    }
    
    await connection.end();
  } catch (error: any) {
    console.error("❌ Database connection error:", error.message);
    console.error("   Code:", error.code);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   ⚠️  Access denied. Check username and password.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   ⚠️  Host not found. Check DB_HOST.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   ⚠️  Database does not exist. Check DB_NAME.');
    }
  }
}

// Initialiser la connexion au démarrage
await initDatabase();

/**
 * Pool de connexions pour les requêtes
 */
const pool = mysql.createPool({
  ...DB_CONFIG,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});
 
// ✅ CORRECTION : Supprimer pool.on('error') car non supporté par mysql2/promise
// Les erreurs seront gérées par les try/catch dans les controllers

export default pool;