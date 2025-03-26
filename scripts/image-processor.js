#!/usr/bin/env node

/**
 * Image Processing Script for TurboMart
 * 
 * This script processes images to optimize them for the TurboMart e-commerce platform:
 * 1. Converts images to WebP format
 * 2. Generates different sizes for responsive images
 * 3. Uploads the processed images to Cloudflare R2
 * 
 * Usage:
 *   node scripts/image-processor.js [--source=<directory>] [--optimize-existing]
 * 
 * Options:
 *   --source=<directory>   Directory containing source images (default: "data/images")
 *   --optimize-existing    Process images already in R2 storage
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const { parse } = require('url');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Parse command-line arguments
const args = process.argv.slice(2);
const sourceDir = args.find(arg => arg.startsWith('--source='))?.split('=')[1] || 'data/images';
const optimizeExisting = args.includes('--optimize-existing');

// Cloudflare R2 configuration
const endpoint = process.env.NEXT_PUBLIC_R2_ENDPOINT;
const bucketName = process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'turbomart-images';
const accessKey = process.env.R2_ACCESS_KEY;
const secretKey = process.env.R2_SECRET_KEY;

// Image sizes for responsive images
const imageSizes = [
  { width: 320, suffix: 'sm' },
  { width: 640, suffix: 'md' },
  { width: 1024, suffix: 'lg' },
  { width: 1920, suffix: 'xl' },
];

// Validate required environment variables
if (!endpoint || !accessKey || !secretKey) {
  console.error('Missing required R2 configuration. Please check your .env.local file.');
  process.exit(1);
}

// Initialize R2 client (compatible with S3 API)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: endpoint,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

// Parse the hostname from the endpoint URL
const { hostname } = parse(endpoint);

// Convert image to WebP and resize
async function processImage(inputPath, outputDir, filename) {
  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const originalImage = sharp(inputPath);
  const metadata = await originalImage.metadata();
  
  // Process images at different sizes
  const promises = imageSizes
    .filter(size => size.width <= metadata.width) // Don't upscale images
    .map(async ({ width, suffix }) => {
      const outputFilename = `${path.parse(filename).name}-${suffix}.webp`;
      const outputPath = path.join(outputDir, outputFilename);
      
      await originalImage
        .resize(width)
        .webp({ quality: 80 })
        .toFile(outputPath);
      
      return {
        path: outputPath,
        key: `${path.dirname(filename)}/${outputFilename}`,
      };
    });
  
  // Also create a full-size WebP version
  const fullSizeFilename = `${path.parse(filename).name}.webp`;
  const fullSizePath = path.join(outputDir, fullSizeFilename);
  
  await originalImage
    .webp({ quality: 85 })
    .toFile(fullSizePath);
  
  promises.push({
    path: fullSizePath,
    key: `${path.dirname(filename)}/${fullSizeFilename}`,
  });
  
  return Promise.all(promises);
}

// Upload a file to R2
async function uploadToR2(filePath, key) {
  const contentType = 'image/webp';
  const fileStream = fs.readFileSync(filePath);
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });
  
  try {
    await r2Client.send(command);
    console.log(`Uploaded ${key} to R2`);
    return `https://${hostname}/${bucketName}/${key}`;
  } catch (error) {
    console.error(`Error uploading ${key}:`, error);
    throw error;
  }
}

// Process all images in a directory
async function processDirectory(dir, baseDir = sourceDir) {
  const tempDir = path.join('data', 'processed');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      await processDirectory(filePath, baseDir);
    } else if (/\.(jpe?g|png|gif)$/i.test(file)) {
      const relativePath = path.relative(baseDir, dir);
      console.log(`Processing ${filePath}...`);
      
      try {
        const processedImages = await processImage(
          filePath,
          tempDir,
          path.join(relativePath, file)
        );
        
        for (const { path: imagePath, key } of processedImages) {
          await uploadToR2(imagePath, key);
        }
        
        // Clean up temporary files
        for (const { path: imagePath } of processedImages) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
  }
}

// List all objects in the R2 bucket
async function listObjects(prefix = '') {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });
  
  return r2Client.send(command);
}

// Process existing images in R2
async function processExistingR2Images() {
  console.log('Processing existing images in R2...');
  
  try {
    const tempDir = path.join('data', 'r2-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const response = await listObjects();
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('No objects found in R2 bucket.');
      return;
    }
    
    for (const object of response.Contents) {
      // Skip if already processed (WebP)
      if (object.Key.endsWith('.webp')) {
        continue;
      }
      
      // Skip if already has size suffix (processed)
      if (/-(sm|md|lg|xl)\.[^.]+$/.test(object.Key)) {
        continue;
      }
      
      console.log(`Processing R2 object: ${object.Key}`);
      
      // Download the object to temp directory
      // Note: In a real implementation, you would use GetObjectCommand
      // This is a simplified example that assumes local access to files
      // In production, integrate with Cloudflare R2 API to download files
      
      // For demonstration purposes only:
      console.log(`Would process ${object.Key} to WebP format with multiple sizes`);
      // Actual implementation would download, process, and re-upload
    }
  } catch (error) {
    console.error('Error processing existing R2 images:', error);
  }
}

// Main function
async function main() {
  console.log('TurboMart Image Processor');
  console.log(`Source directory: ${sourceDir}`);
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory "${sourceDir}" not found.`);
    process.exit(1);
  }
  
  if (optimizeExisting) {
    await processExistingR2Images();
  } else {
    await processDirectory(sourceDir);
  }
  
  console.log('Image processing complete!');
}

// Run the script
main().catch(error => {
  console.error('Error running image processor:', error);
  process.exit(1);
}); 