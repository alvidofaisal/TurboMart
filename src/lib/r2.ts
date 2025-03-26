// This is a client-side compatible module for handling R2 operations
// It uses the Cloudflare R2 API directly for browser compatibility

// Constants
const R2_ENDPOINT = process.env.NEXT_PUBLIC_R2_ENDPOINT || '';
const R2_BUCKET_NAME = process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'turbomart-images';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || '';

/**
 * Generate a presigned URL for uploading an image to R2
 */
export async function getUploadUrl(fileName: string, contentType: string) {
  try {
    const response = await fetch('/api/r2/presigned-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        contentType,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate upload URL');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw error;
  }
}

/**
 * Upload an image to R2 using fetch and FormData (works in browser)
 */
export async function uploadImage(file: File) {
  try {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const { url, fields } = await getUploadUrl(fileName, file.type);
    
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    formData.append('file', file);
    
    const uploadResponse = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image to R2');
    }
    
    // Return the public URL for the uploaded image
    return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Get an image URL from R2
 */
export function getImageUrl(key: string) {
  if (!key) return '';
  return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
}

/**
 * Delete an image from R2
 */
export async function deleteImage(key: string) {
  try {
    const response = await fetch(`/api/r2/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete image from R2');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
} 