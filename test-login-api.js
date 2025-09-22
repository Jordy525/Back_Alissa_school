const fetch = require('node-fetch');

async function testLoginAPI() {
  try {
    console.log('🔍 Test de l\'API de connexion...\n');
    
    const API_URL = 'http://localhost:3000'; // Changez selon votre configuration
    const email = 'jude@gmail.com';
    const password = 'votre_mot_de_passe'; // Remplacez par le vrai mot de passe
    
    console.log('📡 Envoi de la requête de connexion...');
    console.log(`   Email: ${email}`);
    console.log(`   URL: ${API_URL}/api/frontend/login\n`);
    
    const response = await fetch(`${API_URL}/api/frontend/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });
    
    console.log('📡 Réponse reçue:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}\n`);
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Connexion réussie!');
      console.log(`   Nom: ${data.data.user.name}`);
      console.log(`   Email: ${data.data.user.email}`);
      console.log(`   Rôle: ${data.data.user.role || 'undefined'}`);
      console.log(`   IsAdmin: ${data.data.user.isAdmin}`);
      console.log(`   Redirection: ${data.data.redirectPath}`);
      console.log(`   Token: ${data.data.token.substring(0, 20)}...`);
      
      if (data.data.user.role === 'admin' && data.data.redirectPath === '/admin/dashboard') {
        console.log('\n🎉 SUCCÈS: L\'utilisateur sera correctement redirigé vers le dashboard admin!');
      } else {
        console.log('\n⚠️  ATTENTION: L\'utilisateur ne sera pas redirigé vers le dashboard admin.');
        console.log('   Vérifiez que l\'utilisateur est bien dans la table admins.');
      }
    } else {
      console.log('❌ Échec de la connexion:');
      console.log(`   Message: ${data.error?.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('\n💡 Assurez-vous que:');
    console.log('   1. Le serveur backend est démarré');
    console.log('   2. L\'URL est correcte');
    console.log('   3. Le mot de passe est correct');
  }
}

// Utilisation
console.log('⚠️  ATTENTION: Modifiez le mot de passe dans ce script avant de l\'exécuter!');
console.log('   Ligne 8: const password = "votre_mot_de_passe";\n');

// Décommentez la ligne suivante après avoir mis le bon mot de passe
// testLoginAPI();