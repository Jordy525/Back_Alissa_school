const fetch = require('node-fetch');

async function testStudentsAPI() {
  try {
    console.log('🔍 Test de l\'API de gestion des élèves...\n');
    
    const API_URL = 'http://localhost:3000'; // Changez selon votre configuration
    const adminEmail = 'jude@gmail.com';
    const adminPassword = 'votre_mot_de_passe'; // Remplacez par le vrai mot de passe
    
    // 1. Connexion admin pour obtenir le token
    console.log('🔐 Connexion admin...');
    const loginResponse = await fetch(`${API_URL}/api/frontend/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Échec de la connexion admin:', loginData.error?.message);
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Connexion admin réussie\n');
    
    // 2. Test de récupération des statistiques
    console.log('📊 Test des statistiques...');
    const statsResponse = await fetch(`${API_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const statsData = await statsResponse.json();
    if (statsData.success) {
      console.log('✅ Statistiques récupérées:');
      console.log(`   - Élèves: ${statsData.data.students.total_students}`);
      console.log(`   - Documents: ${statsData.data.documents.total_documents}`);
      console.log(`   - Téléchargements: ${statsData.data.documents.total_downloads}\n`);
    } else {
      console.log('⚠️  Erreur statistiques:', statsData.error?.message, '\n');
    }
    
    // 3. Test de récupération des élèves
    console.log('👥 Test de récupération des élèves...');
    const studentsResponse = await fetch(`${API_URL}/api/admin/students?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const studentsData = await studentsResponse.json();
    if (studentsData.success) {
      console.log('✅ Élèves récupérés:');
      studentsData.data.students.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (${student.email}) - ${student.classe || 'Pas de classe'}`);
      });
      console.log(`   Total: ${studentsData.data.pagination.total} élèves\n`);
    } else {
      console.log('⚠️  Erreur élèves:', studentsData.error?.message, '\n');
    }
    
    // 4. Test de recherche d'élèves
    console.log('🔍 Test de recherche d\'élèves...');
    const searchResponse = await fetch(`${API_URL}/api/admin/students?search=jude`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const searchData = await searchResponse.json();
    if (searchData.success) {
      console.log('✅ Résultats de recherche "jude":');
      searchData.data.students.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (${student.email})`);
      });
    } else {
      console.log('⚠️  Erreur recherche:', searchData.error?.message);
    }
    
    console.log('\n🎉 Tests terminés!');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    console.log('\n💡 Assurez-vous que:');
    console.log('   1. Le serveur backend est démarré');
    console.log('   2. L\'URL est correcte');
    console.log('   3. Le mot de passe admin est correct');
    console.log('   4. L\'utilisateur admin existe dans la table admins');
  }
}

// Utilisation
console.log('⚠️  ATTENTION: Modifiez le mot de passe dans ce script avant de l\'exécuter!');
console.log('   Ligne 8: const adminPassword = "votre_mot_de_passe";\n');

// Décommentez la ligne suivante après avoir mis le bon mot de passe
// testStudentsAPI();