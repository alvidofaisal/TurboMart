// Script to create a smaller demo dataset using existing categories and subcategories
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.COCKROACH_DB_URL;
const DEMO_PRODUCT_COUNT = 5000; // Much smaller number of products for demo

async function main() {
  console.log('Starting demo import process...');

  try {
    // Check current state of database
    console.log('Checking current database state...');
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
    
    console.log('Current database state:');
    console.log(currentState);
    
    // Clean out products table to start fresh
    console.log('Cleaning out products table...');
    execSync(`psql "${dbUrl}" -c "DELETE FROM products;"`, { stdio: 'inherit' });
    
    // Get valid subcategory slugs
    console.log('Getting valid subcategory slugs...');
    const result = execSync(`psql "${dbUrl}" -t -c "SELECT slug FROM subcategories LIMIT 500;"`, { encoding: 'utf8' });
    const validSubcategories = result.split('\n').map(s => s.trim()).filter(Boolean);
    
    if (validSubcategories.length === 0) {
      console.error('No subcategories found! Cannot generate products.');
      process.exit(1);
    }
    
    console.log(`Found ${validSubcategories.length} valid subcategory slugs to use.`);
    
    // Generate demo products
    console.log(`Generating ${DEMO_PRODUCT_COUNT} demo products...`);
    
    // Make sure directory exists
    const outputDir = './data/demo-import';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const productsFile = `${outputDir}/demo_products.sql`;
    const writeStream = fs.createWriteStream(productsFile);
    
    // Start with a transaction
    writeStream.write('BEGIN;\n');
    
    // Generate products with valid subcategory references
    for (let i = 1; i <= DEMO_PRODUCT_COUNT; i++) {
      // Pick a random subcategory from our valid ones
      const subcategorySlug = validSubcategories[Math.floor(Math.random() * validSubcategories.length)];
      
      // Generate random product price between $5 and $200
      const price = (Math.random() * 195 + 5).toFixed(2);
      
      // Write INSERT statement for this product
      const productSlug = `demo-product-${i}`;
      const productName = `Demo Product ${i}`;
      const description = `This is demo product ${i} in the ${subcategorySlug} subcategory.`;
      
      writeStream.write(
        `INSERT INTO products (slug, name, description, price, subcategory_slug) ` +
        `VALUES ('${productSlug}', '${productName}', '${description}', ${price}, '${subcategorySlug}');\n`
      );
      
      // Log progress
      if (i % 1000 === 0) {
        console.log(`Generated ${i} products...`);
      }
    }
    
    // Commit the transaction
    writeStream.write('COMMIT;\n');
    writeStream.end();
    
    console.log('Product generation complete. Starting import...');
    
    // Wait for the writeStream to finish
    await new Promise((resolve) => {
      writeStream.on('finish', resolve);
    });
    
    // Import the generated products
    console.log('Importing demo products...');
    execSync(`psql "${dbUrl}" -f "${productsFile}"`, { 
      stdio: 'inherit',
      timeout: 300000 // 5 minute timeout
    });
    
    // Final count
    console.log('Import completed. Final record counts:');
    execSync(`psql "${dbUrl}" -c "
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
    "`, { stdio: 'inherit' });
    
    console.log('Demo data import completed successfully!');
    
  } catch (error) {
    console.error('Error during demo import:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main(); 