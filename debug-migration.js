const fs = require('fs');

// Lire le fichier de migration
const migrationPath = './migrations/add_role_and_documents.sql';
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('Contenu du fichier:');
console.log('==================');
console.log(migrationSQL.substring(0, 500));
console.log('...\n');

// Diviser les requêtes SQL
const queries = migrationSQL
  .split(';')
  .map(query => query.trim())
  .filter(query => query.length > 0 && !query.startsWith('--') && !query.startsWith('/*'));

console.log(`Nombre de requêtes trouvées: ${queries.length}\n`);

queries.forEach((query, index) => {
  console.log(`Requête ${index + 1}:`);
  console.log(query.substring(0, 100) + (query.length > 100 ? '...' : ''));
  console.log('---');
});
