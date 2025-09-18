require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_URL = 'http://localhost:3000/api/frontend';

async function debugAPI() {
  console.log('🔍 Debug de l\'API Frontend...\n');

  try {
    // Test d'inscription
    console.log('1. 📝 Test d\'inscription...');
    const registerResponse = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Debug User',
        email: 'debug@example.com',
        phoneNumber: '+24112345678',
        ageRange: '13-17 ans',
        password: 'password123'
      })
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('   ✅ Inscription réussie');
      console.log(`   👤 Utilisateur: ${registerData.data.user.name}`);
      console.log(`   🔑 Token: ${registerData.data.token.substring(0, 20)}...`);
      
      const token = registerData.data.token;
      
      // Test de sélection de classe
      console.log('\n2. 🎓 Test de sélection de classe...');
      const classResponse = await fetch(`${API_URL}/class`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ classe: '6eme' })
      });

      console.log(`   📊 Status: ${classResponse.status}`);
      if (!classResponse.ok) {
        const errorData = await classResponse.json();
        console.log(`   ❌ Erreur: ${JSON.stringify(errorData, null, 2)}`);
      } else {
        console.log('   ✅ Classe sélectionnée');
      }

    } else {
      const error = await registerResponse.json();
      console.log('   ❌ Erreur inscription:', JSON.stringify(error, null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur lors du debug:', error.message);
  }
}

debugAPI();

