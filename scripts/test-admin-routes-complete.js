const fetch = require('node-fetch');

const API_BASE_URL = 'https://back-alissa-school-up2p.onrender.com';

async function testAdminRoutesComplete() {
  console.log('🧪 Test complet des routes admin...\n');

  // Étape 1: Login admin
  console.log('1. Connexion admin...');
  let token;
  try {
    const loginResponse = await fetch(`${API_BASE_URL}/api/frontend/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@alissa-school.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (loginData.success) {
      token = loginData.data.token;
      console.log('✅ Connexion admin réussie');
    } else {
      console.log('❌ Échec connexion admin:', loginData.error?.message);
      return;
    }
  } catch (error) {
    console.log('❌ Erreur connexion admin:', error.message);
    return;
  }

  // Étape 2: Test des statistiques admin
  console.log('\n2. Test des statistiques admin...');
  try {
    const statsResponse = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Statistiques récupérées:', {
        students: statsData.data?.students?.total_students,
        documents: statsData.data?.documents?.total_documents,
        admins: statsData.data?.admins?.total_admins
      });
    } else {
      console.log('❌ Erreur statistiques:', statsResponse.status);
      const errorText = await statsResponse.text();
      console.log('Détails:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Erreur statistiques:', error.message);
  }

  // Étape 3: Test de récupération des élèves
  console.log('\n3. Test de récupération des élèves...');
  try {
    const studentsResponse = await fetch(`${API_BASE_URL}/api/admin/students?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (studentsResponse.ok) {
      const studentsData = await studentsResponse.json();
      console.log('✅ Élèves récupérés:', {
        count: studentsData.data?.students?.length,
        total: studentsData.data?.pagination?.total,
        pages: studentsData.data?.pagination?.pages
      });
      
      if (studentsData.data?.students?.length > 0) {
        console.log('Premier élève:', {
          name: studentsData.data.students[0].name,
          email: studentsData.data.students[0].email,
          classe: studentsData.data.students[0].classe
        });
      }
    } else {
      console.log('❌ Erreur élèves:', studentsResponse.status);
      const errorText = await studentsResponse.text();
      console.log('Détails:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Erreur élèves:', error.message);
  }

  // Étape 4: Test de création d'un élève
  console.log('\n4. Test de création d\'un élève...');
  try {
    const createResponse = await fetch(`${API_BASE_URL}/api/frontend/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Élève',
        email: 'test.eleve@example.com',
        password: 'test123',
        phoneNumber: '0123456789',
        ageRange: '13-17 ans'
      })
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Élève créé:', {
        success: createData.success,
        userId: createData.data?.user?.id
      });
    } else {
      console.log('⚠️ Création élève:', createResponse.status);
      const errorText = await createResponse.text();
      console.log('Détails:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Erreur création élève:', error.message);
  }

  // Étape 5: Test des documents
  console.log('\n5. Test de récupération des documents...');
  try {
    const documentsResponse = await fetch(`${API_BASE_URL}/api/admin/documents?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (documentsResponse.ok) {
      const documentsData = await documentsResponse.json();
      console.log('✅ Documents récupérés:', {
        count: documentsData.data?.documents?.length,
        total: documentsData.data?.pagination?.total
      });
    } else {
      console.log('❌ Erreur documents:', documentsResponse.status);
      const errorText = await documentsResponse.text();
      console.log('Détails:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Erreur documents:', error.message);
  }

  console.log('\n📋 RÉSUMÉ DES TESTS:');
  console.log('- Connexion admin: Testée');
  console.log('- Statistiques: Testées');
  console.log('- Récupération élèves: Testée');
  console.log('- Création élève: Testée');
  console.log('- Récupération documents: Testée');
  
  console.log('\n🎉 Tests terminés!');
  console.log('💡 Si des erreurs persistent, vérifiez les logs du serveur sur Render');
}

testAdminRoutesComplete();