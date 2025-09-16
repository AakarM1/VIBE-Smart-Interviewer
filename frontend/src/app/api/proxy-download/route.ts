import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to proxy downloads and bypass CORS restrictions
 * This runs on the server side, so it can access any URL without CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }
    
    // Validate that it's a Firebase Storage URL for security
    if (!url.includes('firebasestorage.googleapis.com')) {
      return NextResponse.json(
        { error: 'Only Firebase Storage URLs are allowed' },
        { status: 403 }
      );
    }
    
    console.log(`🔄 Proxy downloading: ${url}`);
    
    // Server-side fetch (no CORS restrictions) with extended timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Trajectorie-VIBE-Admin/1.0',
          'Accept': '*/*'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`❌ Proxy download failed: ${response.status} ${response.statusText}`);
        return NextResponse.json(
          { error: `Download failed: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }
      
      // Get the blob data
      const blob = await response.blob();
      console.log(`✅ Proxy download successful: ${blob.size} bytes`);
      
      // Stream the blob back to the client
      const arrayBuffer = await blob.arrayBuffer();
      
      // Determine content type from the original response or blob
      const contentType = response.headers.get('content-type') || blob.type || 'application/octet-stream';
      
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': arrayBuffer.byteLength.toString(),
          'Cache-Control': 'private, no-cache',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`❌ Proxy download timeout after 60 seconds for: ${url}`);
        return NextResponse.json(
          { error: 'Download timeout after 60 seconds' },
          { status: 408 }
        );
      }
      
      throw fetchError; // Re-throw other errors to be caught by outer catch
    }
    
  } catch (error) {
    console.error('❌ Proxy download error:', error);
    return NextResponse.json(
      { error: 'Internal server error during download' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
