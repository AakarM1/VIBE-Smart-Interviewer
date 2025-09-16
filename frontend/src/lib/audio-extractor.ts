import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

/**
 * Initialize FFmpeg instance (singleton pattern)
 */
async function initFFmpeg(): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }
  return ffmpeg;
}

/**
 * Extract audio from video blob
 * @param videoBlob - Video file as Blob
 * @returns Audio blob in MP3 format
 */
export async function extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
  try {
    console.log('🎵 Starting audio extraction from video blob');
    
    const ffmpegInstance = await initFFmpeg();
    
    // Write video file to FFmpeg virtual filesystem
    const inputFile = 'input_video.webm';
    const outputFile = 'output_audio.mp3';
    
    await ffmpegInstance.writeFile(inputFile, await fetchFile(videoBlob));
    console.log('📁 Video file written to FFmpeg filesystem');
    
    // Extract audio using FFmpeg
    await ffmpegInstance.exec([
      '-i', inputFile,           // Input video file
      '-vn',                     // Disable video
      '-acodec', 'libmp3lame',   // Use MP3 codec
      '-ab', '192k',             // Audio bitrate
      '-ar', '44100',            // Sample rate
      outputFile                 // Output audio file
    ]);
    console.log('🔄 Audio extraction completed');
    
    // Read extracted audio file
    const data = await ffmpegInstance.readFile(outputFile);
    const audioBlob = new Blob([data], { type: 'audio/mp3' });
    
    // Clean up files
    await ffmpegInstance.deleteFile(inputFile);
    await ffmpegInstance.deleteFile(outputFile);
    console.log('🧹 Temporary files cleaned up');
    
    console.log(`✅ Audio extraction successful (${audioBlob.size} bytes)`);
    return audioBlob;
    
  } catch (error) {
    console.error('❌ Audio extraction failed:', error);
    throw new Error(`Audio extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
