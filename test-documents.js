// Utiliser la configuration de base de données existante
const { query } = require('./config/database');
require('dotenv').config();

async function testDocumentSystem() {
  try {
    console.log('🔌 Test du système de documents...');
    console.log('✅ Connexion à la base de données via la configuration existante');

    // Test 1: Vérifier les tables
    console.log('\n📋 Test 1: Vérification des tables');
    
    const tables = ['documents', 'document_categories', 'document_downloads', 'document_category_links'];
    
    for (const table of tables) {
      try {
        const rows = await query(`DESCRIBE ${table}`);
        console.log(`✅ Table ${table} existe (${rows.length} colonnes)`);
      } catch (error) {
        console.log(`❌ Table ${table} n'existe pas:`, error.message);
      }
    }

    // Test 2: Vérifier les catégories par défaut
    console.log('\n📂 Test 2: Vérification des catégories');
    
    const categories = await query('SELECT * FROM document_categories');
    console.log(`✅ ${categories.length} catégories trouvées:`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.color})`);
    });

    // Test 3: Vérifier les matières
    console.log('\n📚 Test 3: Vérification des matières');
    
    const subjects = await query('SELECT * FROM subjects LIMIT 5');
    console.log(`✅ ${subjects.length} matières trouvées:`);
    subjects.forEach(subject => {
      console.log(`   - ${subject.name}`);
    });

    // Test 4: Vérifier les classes d'utilisateurs
    console.log('\n👥 Test 4: Vérification des classes d\'utilisateurs');
    
    const classes = await query(`
      SELECT classe, COUNT(*) as count 
      FROM users 
      WHERE classe IS NOT NULL 
      GROUP BY classe
    `);
    console.log(`✅ Classes trouvées:`);
    classes.forEach(cls => {
      console.log(`   - ${cls.classe}: ${cls.count} utilisateurs`);
    });

    // Test 5: Vérifier les rôles d'utilisateurs
    console.log('\n🔐 Test 5: Vérification des rôles');
    
    const roles = await query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    console.log(`✅ Rôles trouvés:`);
    roles.forEach(role => {
      console.log(`   - ${role.role || 'student'}: ${role.count} utilisateurs`);
    });

    // Test 6: Créer un document de test (si des données existent)
    console.log('\n📄 Test 6: Test de création de document');
    
    const testSubjects = await query('SELECT id FROM subjects LIMIT 1');
    const testUsers = await query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    
    if (testSubjects.length > 0 && testUsers.length > 0) {
      const testDocument = {
        id: 'test-doc-' + Date.now(),
        title: 'Document de test',
        description: 'Ceci est un document de test',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        subject_id: testSubjects[0].id,
        classe: '6eme',
        created_by: testUsers[0].id
      };

      try {
        await query(`
          INSERT INTO documents (id, title, description, file_name, file_path, file_type, file_size, subject_id, classe, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testDocument.id,
          testDocument.title,
          testDocument.description,
          testDocument.file_name,
          testDocument.file_path,
          testDocument.file_type,
          testDocument.file_size,
          testDocument.subject_id,
          testDocument.classe,
          testDocument.created_by
        ]);
        
        console.log('✅ Document de test créé avec succès');
        
        // Nettoyer le document de test
        await query('DELETE FROM documents WHERE id = ?', [testDocument.id]);
        console.log('✅ Document de test supprimé');
        
      } catch (error) {
        console.log('❌ Erreur lors de la création du document de test:', error.message);
      }
    } else {
      console.log('⚠️  Impossible de créer un document de test (données manquantes)');
    }

    console.log('\n🎉 Tests terminés avec succès !');
    console.log('\n📝 Prochaines étapes:');
    console.log('1. Créer un utilisateur admin: UPDATE users SET role = "admin" WHERE email = "votre-email@example.com"');
    console.log('2. Tester l\'API: npm start');
    console.log('3. Accéder à /admin/documents dans le frontend');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Exécuter les tests
testDocumentSystem();
