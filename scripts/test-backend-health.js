const fetch = require('node-fetch');

const API_BASE_URL = 'https://back-alissa-school-up2p.onrender.com';

async function testBackendHealth() {
  console.log('🏥 Test de santé du backend...\n');

  // Test 1: Health check
  console.log('1. Test du health check...');
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      timeout: 10000 // 10 secondes de timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend en ligne:', {
        status: data.status,
        uptime: data.uptime,
        environment: data.environment
      });
    } else {
      console.log('⚠️ Backend répond mais avec erreur:', response.status);
    }
  } catch (error) {
    console.log('❌ Backend inaccessible:', error.message);
    console.log('🔄 Le serveur est peut-être en cours de redémarrage...');
    
    // Attendre et réessayer
    console.log('⏳ Attente de 30 secondes avant nouveau test...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      const retryResponse = await fetch(`${API_BASE_URL}/health`);
      if (retryResponse.ok) {
        const data = await retryResponse.json();
        console.log('✅ Backend maintenant en ligne après redémarrage:', data.status);
      } else {
        console.log('❌ Backend toujours inaccessible après attente');
      }
    } catch (retryError) {
      console.log('❌ Backend toujours inaccessible:', retryError.message);
    }
  }

  // Test 2: CORS avec la nouvelle URL
  console.log('\n2. Test CORS avec la nouvelle URL...');
  try {
    const corsResponse = await fetch(`${API_BASE_URL}/api`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://front-alissa-school-ifao2yvxs-jordys-projects-d5468569.vercel.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    
    console.log('📊 CORS Response:', {
      status: corsResponse.status,
      allowOrigin: corsResponse.headers.get('access-control-allow-origin'),
      allowMethods: corsResponse.headers.get('access-control-allow-methods'),
      allowHeaders: corsResponse.headers.get('access-control-allow-headers')
    });
    
    if (corsResponse.headers.get('access-control-allow-origin')) {
      console.log('✅ CORS configuré correctement');
    } else {
      console.log('❌ CORS non configuré pour cette origine');
    }
  } catch (error) {
    console.log('❌ Test CORS échoué:', error.message);
  }

  // Test 3: Login admin
  console.log('\n3. Test de connexion admin...');
  try {
    const loginResponse = await fetch(`${API_BASE_URL}/api/frontend/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://front-alissa-school-ifao2yvxs-jordys-projects-d5468569.vercel.app'
      },
      body: JSON.stringify({
        email: 'admin@alissa-school.com',
        password: 'admin123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login admin réussi:', {
        success: loginData.success,
        role: loginData.data?.user?.role,
        redirectPath: loginData.data?.redirectPath
      });
      
      // Test 4: Stats admin avec token
      if (loginData.success && loginData.data?.token) {
        console.log('\n4. Test des stats admin...');
        try {
          const statsResponse = await fetch(`${API_BASE_URL}/api/admin/stats`, {
            headers: {
              'Authorization': `Bearer ${loginData.data.token}`,
              'Content-Type': 'application/json',
              'Origin': 'https://front-alissa-school-ifao2yvxs-jordys-projects-d5468569.vercel.app'
            }
          });
          
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            console.log('✅ Stats admin récupérées:', {
              students: statsData.data?.students?.total_students,
              documents: statsData.data?.documents?.total_documents,
              admins: statsData.data?.admins?.total_admins
            });
          } else {
            console.log('❌ Erreur stats admin:', statsResponse.status);
            const errorText = await statsResponse.text();
            console.log('Réponse:', errorText.substring(0, 200));
          }
        } catch (error) {
          console.log('❌ Erreur stats admin:', error.message);
        }
      }
    } else {
      console.log('❌ Login admin échoué:', loginResponse.status);
      const errorText = await loginResponse.text();
      console.log('Réponse:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Test login échoué:', error.message);
  }

  console.log('\n📋 RÉSUMÉ:');
  console.log('- Si le backend est inaccessible, il est probablement en cours de redémarrage');
  console.log('- Les services Render peuvent prendre quelques minutes à redémarrer');
  console.log('- Vérifiez les logs sur https://dashboard.render.com');
  console.log('- La nouvelle URL CORS a été ajoutée au code');
  
  console.log('\n🎉 Test terminé!');
}

testBackendHealth();