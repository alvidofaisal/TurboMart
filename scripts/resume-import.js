// Script to resume import with better timeout handling and smaller batches
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.COCKROACH_DB_URL;

// Display a masked version of the DB URL to verify connection
if (dbUrl) {
  const maskedUrl = dbUrl.replace(/\/\/(.+?):.+?@/, '//******:******@');
  console.log('Using database URL (masked):', maskedUrl);
} else {
  console.error('ERROR: COCKROACH_DB_URL environment variable is not set');
  process.exit(1);
}

const batchSize = 1000; // Import in smaller batches

// Parse command line arguments
const args = process.argv.slice(2);
let startBatch = null;
let endBatch = null;
let onlyCreateBatches = false;

// Process command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--start' && i + 1 < args.length) {
    startBatch = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--end' && i + 1 < args.length) {
    endBatch = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--prepare-only') {
    onlyCreateBatches = true;
  } else if (args[i] === '--help') {
    console.log(`
Usage: node scripts/resume-import.js [options]

Options:
  --start N        Start from batch N
  --end N          End with batch N
  --prepare-only   Only prepare batch files without importing
  --help           Show this help message

Examples:
  node scripts/resume-import.js                  # Import all batches
  node scripts/resume-import.js --start 5        # Start from batch 5
  node scripts/resume-import.js --start 5 --end 10   # Import batches 5-10
  node scripts/resume-import.js --prepare-only   # Only create batch files
    `);
    process.exit(0);
  }
}

// Function to save the current state to a checkpoint file
function saveCheckpoint(batchNumber) {
  fs.writeFileSync('data/resume-import/checkpoint.json', JSON.stringify({
    lastCompletedBatch: batchNumber,
    timestamp: new Date().toISOString()
  }));
  console.log(`✅ Checkpoint saved: completed batch ${batchNumber}`);
}

// Function to load the last checkpoint
function loadCheckpoint() {
  if (fs.existsSync('data/resume-import/checkpoint.json')) {
    const checkpoint = JSON.parse(fs.readFileSync('data/resume-import/checkpoint.json', 'utf8'));
    console.log(`📋 Found checkpoint: last completed batch was ${checkpoint.lastCompletedBatch} at ${checkpoint.timestamp}`);
    return checkpoint.lastCompletedBatch;
  }
  return -1;
}

async function main() {
  console.log('Starting resume import process...');
  
  try {
    // Check current state of the database
    console.log('Checking current database state...');
    console.log('Using SQL query:');
    console.log(`psql "${dbUrl}" -t -c "
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
    "`);
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
      
      // Save the filtered products for future runs
      fs.writeFileSync('data/ordered-import/products_filtered.sql', productsToImport.join('\n'));
      console.log('Saved filtered products file for future runs');
    } else {
      console.error('Cannot find products file to import');
      process.exit(1);
    }
    
    // Calculate total number of batches
    const totalBatches = Math.ceil(productsToImport.length / batchSize);
    console.log(`Will import ${productsToImport.length} products in ${totalBatches} batches of ${batchSize} records each.`);
    
    // Create batch files
    console.log('Creating batch files...');
    for (let i = 0; i < totalBatches; i++) {
      const batchFile = `${productsDir}/products_batch_${i}.sql`;
      // Skip if the batch file already exists to support resume
      if (!fs.existsSync(batchFile)) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min((i + 1) * batchSize, productsToImport.length);
        const batch = productsToImport.slice(batchStart, batchEnd);
        
        fs.writeFileSync(batchFile, batch.join('\n'));
        
        if ((i + 1) % 10 === 0 || i === totalBatches - 1) {
          console.log(`Created batch files: ${i + 1} / ${totalBatches}`);
        }
      }
    }
    
    // Create a batch manifest file
    const manifest = {
      totalProducts: productsToImport.length,
      totalBatches: totalBatches,
      batchSize: batchSize,
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(`${productsDir}/manifest.json`, JSON.stringify(manifest, null, 2));
    console.log('Created batch manifest file');
    
    if (onlyCreateBatches) {
      console.log('Batch files prepared. Use --start and --end options to import specific batches.');
      process.exit(0);
    }
    
    // Get current product count
    console.log('Checking current product count...');
    console.log(`Running: psql "${dbUrl}" -t -c "SELECT COUNT(*) FROM products;"`);
    const productCountRaw = execSync(`psql "${dbUrl}" -t -c "SELECT COUNT(*) FROM products;"`, { encoding: 'utf8' }).trim();
    console.log(`Raw product count result: '${productCountRaw}'`);
    const currentProductCount = parseInt(productCountRaw);
    console.log(`Parsed product count: ${currentProductCount}`);
    
    // Calculate which batch to start from
    let completedBatches = Math.floor(currentProductCount / batchSize);
    
    // Check if we have a checkpoint that's more accurate than the DB count
    const checkpointBatch = loadCheckpoint();
    if (checkpointBatch >= 0 && checkpointBatch >= completedBatches) {
      completedBatches = checkpointBatch;
    }
    
    // Determine start and end batches based on command line args or auto-detection
    const actualStartBatch = startBatch !== null ? startBatch : completedBatches;
    const actualEndBatch = endBatch !== null ? Math.min(endBatch, totalBatches - 1) : totalBatches - 1;
    
    if (actualStartBatch > actualEndBatch) {
      console.log('No batches to import (start batch > end batch)');
      process.exit(0);
    }
    
    console.log(`\n🚀 IMPORT PLAN:`);
    console.log(`  - Starting from batch: ${actualStartBatch}`);
    console.log(`  - Ending with batch: ${actualEndBatch}`);
    console.log(`  - Total batches to import: ${actualEndBatch - actualStartBatch + 1}`);
    console.log(`  - Records per batch: ${batchSize}`);
    console.log(`  - Estimated total records: ${(actualEndBatch - actualStartBatch + 1) * batchSize}`);
    console.log('\nPress Ctrl+C at any time to pause. You can resume later from the last completed batch.');
    console.log('Starting import in 5 seconds...');
    
    // Wait 5 seconds before starting to give user a chance to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Import products batch by batch with better error handling
    for (let i = actualStartBatch; i <= actualEndBatch; i++) {
      const startTime = new Date();
      console.log(`\n📦 Importing product batch ${i + 1} of ${totalBatches} [${new Date().toLocaleTimeString()}]...`);
      
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
            console.error(`⚠️ Batch ${i + 1} failed on attempt ${attempts}: ${error.message}`);
            
            if (attempts >= maxAttempts) {
              throw error;
            }
            
            // Wait before retry
            console.log(`Waiting 10 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
        
        // Save checkpoint after each successful batch
        saveCheckpoint(i);
        
        // Log progress after each successful batch
        const importedCount = execSync(`psql "${dbUrl}" -t -c "SELECT COUNT(*) FROM products;"`, { encoding: 'utf8' });
        const endTime = new Date();
        const batchDuration = (endTime - startTime) / 1000;
        
        console.log(`✅ Batch ${i + 1} completed in ${batchDuration.toFixed(1)} seconds`);
        console.log(`📊 Products imported so far: ${importedCount.trim()}`);
        console.log(`⏱️ Estimated time remaining: ${((actualEndBatch - i) * batchDuration / 60).toFixed(1)} minutes`);
        
        // Small delay between batches to avoid overloading the server
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Failed to import batch ${i + 1}: ${error.message}`);
        console.log(`To resume from this point later, run: node scripts/resume-import.js --start ${i}`);
        process.exit(1);
      }
    }
    
    // Final count
    console.log('\n🎉 Import completed successfully! Final record counts:');
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
    console.log('Run with --help to see available options');
    process.exit(1);
  }
}

main(); 