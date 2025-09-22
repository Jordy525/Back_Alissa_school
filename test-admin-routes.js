const { query, connectDB } = require('./config/database');

async function testAdminRoutes() {
  try {
    console.log('🔍 Test des routes admin...\n');
    
    await connectDB();
    console.log('✅ Connexion à la base de données établie\n');

    // 1. Test de la requête des statistiques (version corrigée)
    console.log('📊 Test de la requête des statistiques...');
    try {
      const studentStats = await query(`
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
      
      console.log('✅ Statistiques élèves:', studentStats[0]);
    } catch (error) {
      console.error('❌ Erreur statistiques élèves:', error.message);
    }

    // 2. Test de la requête des élèves (version corrigée)
    console.log('\n👥 Test de la requête des élèves...');
    try {
      const students = await query(`
        SELECT 
          u.id, u.email, u.name, u.avatar_url, u.classe, u.selected_class, 
          u.total_points, u.level, u.created_at, u.last_login_at,
          u.matieres as selected_subjects
        FROM users u
        WHERE u.deleted_at IS NULL 
        AND u.id NOT IN (
          SELECT COALESCE(user_id, '') FROM admins WHERE user_id IS NOT NULL
        )
        AND u.email NOT IN (
          SELECT COALESCE(email, '') FROM admins WHERE email IS NOT NULL
        )
        ORDER BY u.created_at DESC
        LIMIT 5
      `);
      
      console.log(`✅ ${students.length} élèves trouvés:`);
      students.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (${student.email}) - ${student.classe || 'Pas de classe'}`);
      });
    } catch (error) {
      console.error('❌ Erreur récupération élèves:', error.message);
    }

    // 3. Test de la requête des documents (sans deleted_at car la colonne n'existe pas)
    console.log('\n📄 Test de la requête des documents...');
    try {
      const documentStats = await query(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN document_type = 'book' THEN 1 END) as books,
          COUNT(CASE WHEN document_type = 'methodology' THEN 1 END) as methodologies,
          COUNT(CASE WHEN document_type = 'exercise' THEN 1 END) as exercises,
          COALESCE(SUM(download_count), 0) as total_downloads
        FROM documents 
        WHERE is_active = 1
      `);
      
      console.log('✅ Statistiques documents:', documentStats[0]);
    } catch (error) {
      console.error('❌ Erreur statistiques documents:', error.message);
    }

    // 4. Test de la requête des admins
    console.log('\n👑 Test de la requête des admins...');
    try {
      const adminStats = await query(`SELECT COUNT(*) as total_admins FROM admins`);
      console.log('✅ Statistiques admins:', adminStats[0]);
    } catch (error) {
      console.error('❌ Erreur statistiques admins:', error.message);
    }

    // 5. Vérifier les tables existantes
    console.log('\n🗂️ Vérification des tables...');
    try {
      const tables = await query(`SHOW TABLES`);
      console.log('✅ Tables disponibles:');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   - ${tableName}`);
      });
    } catch (error) {
      console.error('❌ Erreur vérification tables:', error.message);
    }

    console.log('\n🎉 Tests terminés!');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  } finally {
    process.exit(0);
  }
}

testAdminRoutes();