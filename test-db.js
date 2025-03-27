require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

const dbUrl = process.env.COCKROACH_DB_URL;
console.log('Database URL from .env.local (masked):', 
    dbUrl ? dbUrl.replace(/\/\/(.+?):.+?@/, '//******:******@') : 'not set');

// Direct query
console.log('Direct count query:');
try {
    const result = execSync(`psql "${dbUrl}" -t -c "SELECT COUNT(*) FROM products;"`, 
        { encoding: 'utf8' }).trim();
    console.log('Result:', result);
} catch (err) {
    console.error('Error:', err.message);
}

// Combined query as used in resume-import.js
console.log('\nCombined query:');
try {
    const currentState = execSync(`psql "${dbUrl}" -t -c "
      SELECT 'collections' as table_name, COUNT(*) as count FROM collections 
      UNION ALL 
      SELECT 'categories', COUNT(*) FROM categories 
      UNION ALL 
      SELECT 'subcollections', COUNT(*) FROM subcollections 
      UNION ALL 
      SELECT 'subcategories', COUNT(*) FROM subcategories 
      UNION ALL 
      SELECT 'products', COUNT(*) FROM products 
      ORDER BY table_name;
    "`, { encoding: 'utf8' });
    console.log(currentState);
} catch (err) {
    console.error('Error:', err.message);
} 