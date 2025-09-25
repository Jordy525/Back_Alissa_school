const { query } = require('./config/database');
const logger = require('./config/logger');

// Test de la configuration Google OAuth
async function testGoogleOAuthConfig() {
  console.log('🔍 Test de la configuration Google OAuth...\n');
  
  // Vérifier les variables d'environnement
  console.log('📋 Variables d\'environnement:');
  console.log(`- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Défini' : '❌ Manquant'}`);
  console.log(`- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Défini' : '❌ Manquant'}`);
  console.log(`- BASE_URL: ${process.env.BASE_URL || '❌ Manquant'}`);
  console.log(`- FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Manquant'}`);
  console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Défini' : '❌ Manquant'}\n`);
  
  // Vérifier la configuration de la base de données
  try {
    const users = await query('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Nombre d'utilisateurs en base: ${users[0].count}`);
    
    // Vérifier les utilisateurs Google
    const googleUsers = await query('SELECT COUNT(*) as count FROM users WHERE google_id IS NOT NULL');
    console.log(`🔗 Utilisateurs Google: ${googleUsers[0].count}`);
    
    // Vérifier la structure de la table users
    const userStructure = await query('DESCRIBE users');
    console.log('\n📋 Structure de la table users:');
    userStructure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la base de données:', error.message);
  }
  
  // URLs de redirection
  console.log('\n🌐 URLs de redirection:');
  console.log(`- Callback URL: ${process.env.BASE_URL}/api/auth/google/callback`);
  console.log(`- Frontend Auth Callback: ${process.env.FRONTEND_URL}/auth/callback`);
  console.log(`- Frontend Choose Class: ${process.env.FRONTEND_URL}/choose-class`);
  
  // Configuration Google Console
  console.log('\n⚙️  Configuration requise dans Google Console:');
  console.log('1. Aller sur https://console.developers.google.com/');
  console.log('2. Sélectionner votre projet');
  console.log('3. Aller dans "Identifiants" > "OAuth 2.0 Client IDs"');
  console.log('4. Vérifier que l\'URI de redirection autorisée est:');
  console.log(`   ${process.env.BASE_URL}/api/auth/google/callback`);
  console.log('5. Vérifier que les domaines autorisés incluent:');
  console.log(`   ${process.env.FRONTEND_URL}`);
  
  console.log('\n✅ Test terminé!');
}

// Exécuter le test
testGoogleOAuthConfig().catch(console.error);
