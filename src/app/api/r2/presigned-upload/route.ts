import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase';

// This API route generates presigned URLs for direct uploads to R2
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract file information from request
    const { fileName, contentType } = await request.json();
    
    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a secure key for the file
    const key = `${session.user.id}/${Date.now()}-${fileName}`;
    
    // In production environment, this would use Cloudflare Workers R2 to generate
    // a real presigned URL. Here we're simulating the response structure.
    
    // For the Cloudflare environment, the actual implementation would use:
    // const presignedUrl = await env.TURBOMART_IMAGES.createPresignedPost({
    //   key,
    //   contentType,
    //   expiresIn: 60 * 60, // 1 hour
    // });
    
    // Mock response matching expected structure
    const presignedData = {
      url: process.env.NEXT_PUBLIC_R2_ENDPOINT + '/upload',
      fields: {
        key,
        'Content-Type': contentType,
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': 'credential',
        'X-Amz-Date': new Date().toISOString().split('T')[0].replace(/-/g, ''),
        'X-Amz-Signature': 'signature',
        Policy: 'policy',
      },
    };

    return NextResponse.json(presignedData);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 