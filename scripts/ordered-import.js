// Script to extract and import data in the correct order respecting foreign key dependencies
const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

const inputFile = 'data/data.sql';
const outputDir = 'data/ordered-import';

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Tables in dependency order
const tables = [
  'collections',
  'categories',
  'subcollections',
  'subcategories',
  'products'
];

// Wipe all existing data to avoid constraint issues
async function wipeExistingData() {
  const dbUrl = process.env.COCKROACH_DB_URL;
  console.log('Wiping all existing data...');
  
  try {
    // Delete from tables in reverse dependency order
    execSync(`psql "${dbUrl}" -c "
      DELETE FROM products;
      DELETE FROM subcategories;
      DELETE FROM subcollections;
      DELETE FROM categories;
      DELETE FROM collections;
    "`, { stdio: 'inherit' });
    console.log('Successfully wiped existing data.');
  } catch (error) {
    console.error('Error wiping data:', error.message);
  }
}

// Process the SQL data file and extract data for each table
async function extractTableData() {
  console.log('Extracting data by table...');
  
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const tableFiles = {};
  tables.forEach(table => {
    tableFiles[table] = fs.createWriteStream(`${outputDir}/${table}.sql`);
    tableFiles[table].write(`-- ${table} data\n\n`);
  });

  // Track categories for foreign key validation
  const categorySlugs = new Set();

  let currentTable = null;
  let columns = [];
  let inCopyMode = false;

  for await (const line of rl) {
    // Skip PostgreSQL-specific commands that CockroachDB doesn't support
    if (line.includes('EXTENSION') || 
        line.includes('pg_trgm') || 
        line.trim().startsWith('--')) {
      continue;
    }
    
    // Detect COPY command start
    if (line.startsWith('COPY ')) {
      inCopyMode = true;
      const match = line.match(/COPY\s+(public\.)?(\w+)\s+\((.*?)\)\s+FROM/);
      if (match) {
        const tableName = match[2];
        if (tables.includes(tableName)) {
          currentTable = tableName;
          columns = match[3].split(',').map(col => col.trim());
          console.log(`Processing COPY command for table: ${currentTable}`);
        } else {
          currentTable = null;
        }
      }
      continue;
    }
    
    // Detect end of COPY section
    if (line === '\\.' && inCopyMode) {
      inCopyMode = false;
      currentTable = null;
      columns = [];
      continue;
    }
    
    // Process data rows in COPY mode
    if (inCopyMode && currentTable && tables.includes(currentTable) && line !== '\\.' && line.trim() !== '') {
      // Split the line by tabs, honoring tab character in COPY format
      const values = line.split('\t');
      
      if (values.length === columns.length) {
        // Format the values for SQL INSERT
        const formattedValues = values.map(val => {
          if (val === '\\N') return 'NULL';
          // Handle numeric values
          if (/^-?\d+(\.\d+)?$/.test(val)) return val;
          // Escape single quotes and properly quote the value
          return `'${val.replace(/'/g, "''")}'`;
        });
        
        // Handle category slugs for foreign key validation
        if (currentTable === 'categories') {
          const slugIndex = columns.indexOf('slug');
          if (slugIndex !== -1) {
            const slug = values[slugIndex];
            categorySlugs.add(slug);
          }
        }

        // Add ON CONFLICT DO NOTHING to handle duplicate keys
        const insertStmt = `INSERT INTO ${currentTable} (${columns.join(', ')}) VALUES (${formattedValues.join(', ')}) ON CONFLICT DO NOTHING;\n`;
        tableFiles[currentTable].write(insertStmt);
      }
    }
  }

  // Close all file streams
  for (const table of tables) {
    tableFiles[table].end();
  }
  
  console.log('Extraction completed.');
}

// Import data in the correct order
async function importData() {
  const dbUrl = process.env.COCKROACH_DB_URL;
  console.log('Importing data in the correct order...');
  
  // Import collections and categories first
  for (const table of ['collections', 'categories']) {
    console.log(`Importing ${table}...`);
    try {
      execSync(`psql "${dbUrl}" -f ${outputDir}/${table}.sql`, { stdio: 'inherit' });
      console.log(`Successfully imported ${table}.`);
    } catch (error) {
      console.error(`Error importing ${table}:`, error.message);
      if (error.stdout) console.error(error.stdout.toString());
      if (error.stderr) console.error(error.stderr.toString());
      return false;
    }
  }
  
  // Check and filter subcollections to only include those with valid category slugs
  console.log('Validating and filtering subcollections...');
  try {
    // Get list of valid category slugs from the database
    const result = execSync(`psql "${dbUrl}" -t -c "SELECT slug FROM categories;"`, { encoding: 'utf8' });
    const validSlugs = new Set(result.split('\n').map(s => s.trim()).filter(Boolean));
    
    console.log(`Found ${validSlugs.size} valid category slugs.`);
    
    // Read subcollections file
    const subcollectionsFile = fs.readFileSync(`${outputDir}/subcollections.sql`, 'utf8');
    const lines = subcollectionsFile.split('\n');
    
    // Filter to only include valid foreign keys
    const filteredLines = lines.filter(line => {
      if (!line.startsWith('INSERT INTO subcollections')) return true;
      
      // Check if this insert uses a valid category slug
      for (const slug of validSlugs) {
        if (line.includes(`'${slug}'`)) return true;
      }
      return false;
    });
    
    // Write filtered file
    fs.writeFileSync(`${outputDir}/subcollections_filtered.sql`, filteredLines.join('\n'));
    console.log(`Filtered subcollections file created with valid foreign keys.`);
    
    // Import filtered subcollections
    console.log('Importing filtered subcollections...');
    execSync(`psql "${dbUrl}" -f ${outputDir}/subcollections_filtered.sql`, { stdio: 'inherit' });
    console.log('Successfully imported subcollections.');
  } catch (error) {
    console.error('Error filtering or importing subcollections:', error.message);
    if (error.stdout) console.error(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return false;
  }
  
  // Similarly validate subcategories and products
  try {
    // Get valid subcollection IDs
    const result = execSync(`psql "${dbUrl}" -t -c "SELECT id FROM subcollections;"`, { encoding: 'utf8' });
    const validSubcollections = new Set(result.split('\n').map(s => s.trim()).filter(Boolean));
    
    console.log(`Found ${validSubcollections.size} valid subcollection IDs.`);
    
    // Filter subcategories
    const subcategoriesFile = fs.readFileSync(`${outputDir}/subcategories.sql`, 'utf8');
    const lines = subcategoriesFile.split('\n');
    
    // Write a new version with only valid subcollection references
    const filteredLines = lines.filter(line => {
      if (!line.startsWith('INSERT INTO subcategories')) return true;
      
      // Check if this insert uses a valid subcollection ID
      for (const id of validSubcollections) {
        if (line.includes(`, ${id})`) || line.includes(`, ${id},`)) return true;
      }
      return false;
    });
    
    fs.writeFileSync(`${outputDir}/subcategories_filtered.sql`, filteredLines.join('\n'));
    console.log('Filtered subcategories file created.');
    
    // Import filtered subcategories
    console.log('Importing filtered subcategories...');
    execSync(`psql "${dbUrl}" -f ${outputDir}/subcategories_filtered.sql`, { stdio: 'inherit' });
    console.log('Successfully imported subcategories.');
  } catch (error) {
    console.error('Error filtering or importing subcategories:', error.message);
    return false;
  }
  
  // Finally, filter and import products
  try {
    // Get valid subcategory slugs
    const result = execSync(`psql "${dbUrl}" -t -c "SELECT slug FROM subcategories;"`, { encoding: 'utf8' });
    const validSubcategories = new Set(result.split('\n').map(s => s.trim()).filter(Boolean));
    
    console.log(`Found ${validSubcategories.size} valid subcategory slugs.`);
    
    // Since products file might be huge, process it in chunks
    const productsFile = `${outputDir}/products.sql`;
    const filteredProductsFile = `${outputDir}/products_filtered.sql`;
    
    // Create write stream for filtered products
    const outputStream = fs.createWriteStream(filteredProductsFile);
    
    // Process products file line by line
    const fileStream = fs.createReadStream(productsFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let validProductCount = 0;
    let skippedProductCount = 0;
    
    for await (const line of rl) {
      if (!line.startsWith('INSERT INTO products')) {
        outputStream.write(line + '\n');
        continue;
      }
      
      // Check if this insert uses a valid subcategory slug
      let isValid = false;
      for (const slug of validSubcategories) {
        if (line.includes(`'${slug}'`)) {
          isValid = true;
          break;
        }
      }
      
      if (isValid) {
        outputStream.write(line + '\n');
        validProductCount++;
        
        // Log progress
        if (validProductCount % 10000 === 0) {
          console.log(`Processed ${validProductCount} valid products...`);
        }
      } else {
        skippedProductCount++;
      }
    }
    
    outputStream.end();
    console.log(`Filtered products file created. Valid: ${validProductCount}, Skipped: ${skippedProductCount}`);
    
    // Import filtered products
    console.log('Importing filtered products...');
    execSync(`psql "${dbUrl}" -f ${filteredProductsFile}`, { stdio: 'inherit' });
    console.log('Successfully imported products.');
  } catch (error) {
    console.error('Error filtering or importing products:', error.message);
    return false;
  }
  
  return true;
}

// Run the process
async function main() {
  try {
    await wipeExistingData();
    await extractTableData();
    const success = await importData();
    
    if (success) {
      console.log('All data has been processed and imported successfully.');
      
      // Show final counts
      const dbUrl = process.env.COCKROACH_DB_URL;
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
    } else {
      console.error('Import process completed with errors.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 