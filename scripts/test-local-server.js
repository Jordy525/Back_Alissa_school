const fetch = require('node-fetch');

const LOCAL_API_URL = 'http://localhost:3000';

async function testLocalServer() {
  console.log('🏠 Test du serveur local...\n');

  // Test 1: Vérifier si le serveur local est démarré
  console.log('1. Test de connexion au serveur local...');
  try {
    const response = await fetch(`${LOCAL_API_URL}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Serveur local en ligne:', {
        status: data.status,
        uptime: data.uptime,
        environment: data.environment
      });
    } else {
      console.log('⚠️ Serveur local répond mais avec erreur:', response.status);
    }
  } catch (error) {
    console.log('❌ Serveur local inaccessible:', error.message);
    console.log('💡 Pour démarrer le serveur local:');
    console.log('   cd school-back-main');
    console.log('   npm start');
    return;
  }

  // Test 2: Login admin local
  console.log('\n2. Test de connexion admin local...');
  try {
    const loginResponse = await fetch(`${LOCAL_API_URL}/api/frontend/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@alissa-school.com',
        password: 'admin123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login admin local réussi:', {
        success: loginData.success,
        role: loginData.data?.user?.role,
        redirectPath: loginData.data?.redirectPath
      });
      
      // Test 3: Stats admin local
      if (loginData.success && loginData.data?.token) {
        console.log('\n3. Test des stats admin local...');
        try {
          const statsResponse = await fetch(`${LOCAL_API_URL}/api/admin/stats`, {
            headers: {
              'Authorization': `Bearer ${loginData.data.token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            console.log('✅ Stats admin locales récupérées:', {
              students: statsData.data?.students?.total_students,
              documents: statsData.data?.documents?.total_documents,
              admins: statsData.data?.admins?.total_admins
            });
          } else {
            console.log('❌ Erreur stats admin local:', statsResponse.status);
            const errorText = await statsResponse.text();
            console.log('Réponse:', errorText.substring(0, 500));
          }
        } catch (error) {
          console.log('❌ Erreur stats admin local:', error.message);
        }

        // Test 4: Students admin local
        console.log('\n4. Test des élèves admin local...');
        try {
          const studentsResponse = await fetch(`${LOCAL_API_URL}/api/admin/students?page=1&limit=5`, {
            headers: {
              'Authorization': `Bearer ${loginData.data.token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json();
            console.log('✅ Élèves récupérés:', {
              count: studentsData.data?.students?.length,
              total: studentsData.data?.pagination?.total
            });
          } else {
            console.log('❌ Erreur élèves local:', studentsResponse.status);
            const errorText = await studentsResponse.text();
            console.log('Réponse:', errorText.substring(0, 500));
          }
        } catch (error) {
          console.log('❌ Erreur élèves local:', error.message);
        }
      }
    } else {
      console.log('❌ Login admin local échoué:', loginResponse.status);
      const errorText = await loginResponse.text();
      console.log('Réponse:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Test login local échoué:', error.message);
  }

  console.log('\n📋 INSTRUCTIONS POUR TESTER LOCALEMENT:');
  console.log('1. Démarrer le backend: cd school-back-main && npm start');
  console.log('2. Démarrer le frontend: cd school-front-main && npm run dev');
  console.log('3. Ouvrir http://localhost:5173 dans le navigateur');
  console.log('4. Se connecter avec admin@alissa-school.com / admin123');
  console.log('5. Aller sur /admin/dashboard');
  
  console.log('\n🎉 Test local terminé!');
}

testLocalServer();