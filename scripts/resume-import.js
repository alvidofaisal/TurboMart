// Script to resume import with better timeout handling and smaller batches
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.COCKROACH_DB_URL;
const batchSize = 1000; // Import in smaller batches

async function main() {
  console.log('Starting resume import process...');
  
  try {
    // Check current state of the database
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
    
    // Get valid subcategory slugs for product validation
    console.log('Getting valid subcategory slugs...');
    const result = execSync(`psql "${dbUrl}" -t -c "SELECT slug FROM subcategories;"`, { encoding: 'utf8' });
    const validSubcategories = new Set(result.split('\n').map(s => s.trim()).filter(Boolean));
    
    console.log(`Found ${validSubcategories.size} valid subcategory slugs.`);
    
    // Split products into much smaller batches to avoid timeouts
    console.log('Processing products in smaller batches...');
    
    // Read filtered products or create them if needed
    let productsToImport = [];
    const productsDir = 'data/resume-import';
    
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
    }
    
    // Check if we already have a filtered products file
    if (fs.existsSync('data/ordered-import/products_filtered.sql')) {
      console.log('Using existing filtered products file...');
      // Split the existing filtered file into smaller batches
      const content = fs.readFileSync('data/ordered-import/products_filtered.sql', 'utf8');
      const lines = content.split('\n').filter(line => line.trim().startsWith('INSERT INTO products'));
      productsToImport = lines;
    } else if (fs.existsSync('data/ordered-import/products.sql')) {
      console.log('Filtering products from original file...');
      // Process the original products file and filter
      const fileStream = fs.createReadStream('data/ordered-import/products.sql');
      const readline = require('readline');
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      let validProductCount = 0;
      let skippedProductCount = 0;
      
      for await (const line of rl) {
        if (!line.startsWith('INSERT INTO products')) continue;
        
        // Check if this insert uses a valid subcategory slug
        let isValid = false;
        for (const slug of validSubcategories) {
          if (line.includes(`'${slug}'`)) {
            isValid = true;
            break;
          }
        }
        
        if (isValid) {
          productsToImport.push(line);
          validProductCount++;
          
          if (validProductCount % 10000 === 0) {
            console.log(`Processed ${validProductCount} valid products...`);
          }
        } else {
          skippedProductCount++;
        }
      }
      
      console.log(`Filtered products. Valid: ${validProductCount}, Skipped: ${skippedProductCount}`);
    } else {
      console.error('Cannot find products file to import');
      process.exit(1);
    }
    
    // Calculate total number of batches
    const totalBatches = Math.ceil(productsToImport.length / batchSize);
    console.log(`Will import ${productsToImport.length} products in ${totalBatches} batches of ${batchSize} records each.`);
    
    // Create batch files
    for (let i = 0; i < totalBatches; i++) {
      const batchFile = `${productsDir}/products_batch_${i}.sql`;
      // Skip if the batch file already exists to support resume
      if (!fs.existsSync(batchFile)) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min((i + 1) * batchSize, productsToImport.length);
        const batch = productsToImport.slice(batchStart, batchEnd);
        
        fs.writeFileSync(batchFile, batch.join('\n'));
      }
    }
    
    // Get current product count
    const currentProductCount = parseInt(
      execSync(`psql "${dbUrl}" -t -c "SELECT COUNT(*) FROM products;"`, { encoding: 'utf8' }).trim()
    );
    
    // Calculate which batch to start from
    const completedBatches = Math.floor(currentProductCount / batchSize);
    
    // Import products batch by batch with better error handling
    for (let i = completedBatches; i < totalBatches; i++) {
      console.log(`Importing product batch ${i + 1} of ${totalBatches}...`);
      
      try {
        // Set higher statement timeout for each batch
        execSync(`psql "${dbUrl}" -c "SET statement_timeout = '5min';"`, { stdio: 'inherit' });
        
        // Import the batch with retries
        let success = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!success && attempts < maxAttempts) {
          attempts++;
          try {
            execSync(`psql "${dbUrl}" -f ${productsDir}/products_batch_${i}.sql`, { 
              stdio: 'inherit',
              timeout: 300000 // 5 minutes timeout for the command
            });
            success = true;
          } catch (error) {
            console.error(`Batch ${i + 1} failed on attempt ${attempts}: ${error.message}`);
            
            if (attempts >= maxAttempts) {
              throw error;
            }
            
            // Wait before retry
            console.log(`Waiting 10 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
        
        // Log progress after each successful batch
        const importedCount = execSync(`psql "${dbUrl}" -t -c "SELECT COUNT(*) FROM products;"`, { encoding: 'utf8' });
        console.log(`Products imported so far: ${importedCount.trim()}`);
        
        // Small delay between batches to avoid overloading the server
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Failed to import batch ${i + 1}: ${error.message}`);
        console.log('Continuing with next batch...');
      }
    }
    
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
    
  } catch (error) {
    console.error('Error during import:', error.message);
    process.exit(1);
  }
}

main(); 