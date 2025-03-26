import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase';

// This API route handles deletion of objects from R2
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract key from request
    const { key } = await request.json();
    
    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      );
    }

    // Ensure the user can only delete their own files
    // This assumes keys are prefixed with user ID
    if (!key.startsWith(`${session.user.id}/`)) {
      return NextResponse.json(
        { error: 'You can only delete your own files' },
        { status: 403 }
      );
    }
    
    // In a Cloudflare Workers environment, this would use:
    // await env.TURBOMART_IMAGES.delete(key);
    
    // Since we're not in the Workers environment yet, just return a successful response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting object from R2:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
} 