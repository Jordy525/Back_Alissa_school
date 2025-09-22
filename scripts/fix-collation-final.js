const { query, connectDB } = require('../config/database');

async function fixCollationFinal() {
  try {
    console.log('🔧 Connexion à la base de données...');
    await connectDB();
    
    console.log('🔍 Vérification des collations actuelles...');
    
    // Vérifier les collations des tables
    const tablesInfo = await query(`
      SELECT TABLE_NAME, TABLE_COLLATION 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'zigh-portfolio_alissa_school' 
      AND TABLE_NAME IN ('users', 'admins')
    `);
    
    console.log('📊 Collations actuelles:');
    tablesInfo.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}: ${table.TABLE_COLLATION}`);
    });
    
    // Vérifier les collations des colonnes spécifiques
    const columnsInfo = await query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'zigh-portfolio_alissa_school' 
      AND TABLE_NAME IN ('users', 'admins')
      AND COLUMN_NAME IN ('id', 'email', 'user_id')
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);
    
    console.log('\n📋 Collations des colonnes:');
    columnsInfo.forEach(col => {
      console.log(`  - ${col.TABLE_NAME}.${col.COLUMN_NAME}: ${col.COLLATION_NAME}`);
    });
    
    // Convertir toutes les tables vers utf8mb4_unicode_ci
    console.log('\n🔧 Conversion des tables vers utf8mb4_unicode_ci...');
    
    try {
      await query('ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      console.log('✅ Table users convertie');
    } catch (error) {
      console.log('⚠️ Erreur conversion users:', error.message);
    }
    
    try {
      await query('ALTER TABLE admins CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      console.log('✅ Table admins convertie');
    } catch (error) {
      console.log('⚠️ Erreur conversion admins:', error.message);
    }
    
    // Test de la requête problématique
    console.log('\n🧪 Test de la requête corrigée...');
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_students,
          COUNT(CASE WHEN classe = '6eme' THEN 1 END) as classe_6eme,
          COUNT(CASE WHEN classe = '5eme' THEN 1 END) as classe_5eme,
          COUNT(CASE WHEN classe = '4eme' THEN 1 END) as classe_4eme,
          COUNT(CASE WHEN classe = '3eme' THEN 1 END) as classe_3eme,
          COUNT(CASE WHEN classe = 'seconde' THEN 1 END) as classe_seconde,
          COUNT(CASE WHEN classe = 'premiere' THEN 1 END) as classe_premiere,
          COUNT(CASE WHEN classe = 'terminale' THEN 1 END) as classe_terminale
        FROM users u
        WHERE u.deleted_at IS NULL 
        AND u.id NOT IN (
          SELECT COALESCE(user_id, '') FROM admins WHERE user_id IS NOT NULL
        )
        AND u.email NOT IN (
          SELECT COALESCE(email, '') FROM admins WHERE email IS NOT NULL
        )
      `);
      
      console.log('✅ Requête réussie! Résultat:', result[0]);
    } catch (error) {
      console.log('❌ Erreur requête:', error.message);
      
      // Essayer une approche alternative avec CAST
      console.log('🔄 Tentative avec CAST...');
      try {
        const result = await query(`
          SELECT 
            COUNT(*) as total_students,
            COUNT(CASE WHEN classe = '6eme' THEN 1 END) as classe_6eme,
            COUNT(CASE WHEN classe = '5eme' THEN 1 END) as classe_5eme,
            COUNT(CASE WHEN classe = '4eme' THEN 1 END) as classe_4eme,
            COUNT(CASE WHEN classe = '3eme' THEN 1 END) as classe_3eme,
            COUNT(CASE WHEN classe = 'seconde' THEN 1 END) as classe_seconde,
            COUNT(CASE WHEN classe = 'premiere' THEN 1 END) as classe_premiere,
            COUNT(CASE WHEN classe = 'terminale' THEN 1 END) as classe_terminale
          FROM users u
          WHERE u.deleted_at IS NULL 
          AND CAST(u.id AS CHAR) NOT IN (
            SELECT CAST(COALESCE(user_id, '') AS CHAR) FROM admins WHERE user_id IS NOT NULL
          )
          AND CAST(u.email AS CHAR) NOT IN (
            SELECT CAST(COALESCE(email, '') AS CHAR) FROM admins WHERE email IS NOT NULL
          )
        `);
        
        console.log('✅ Requête avec CAST réussie! Résultat:', result[0]);
      } catch (castError) {
        console.log('❌ Erreur avec CAST:', castError.message);
      }
    }
    
    console.log('\n🎉 Correction des collations terminée !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    process.exit(0);
  }
}

fixCollationFinal();