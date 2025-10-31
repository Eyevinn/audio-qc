import { spawn } from 'child_process';
import { EBULoudnessMetrics, AudioStream } from './types';
import { FFmpegUtils } from './utils/ffmpeg-utils';

export interface StreamingCapability {
  canStream: boolean;
  format: string;
  confidence: 'high' | 'medium' | 'low';
  fallbackReason?: string;
}

export class StreamingAnalyzer {
  // Formats that generally support streaming well
  private static readonly STREAMABLE_FORMATS = new Map([
    // Excellent streaming support
    ['mp4', { confidence: 'high', canStream: true }],
    ['mov', { confidence: 'high', canStream: true }],
    ['m4v', { confidence: 'high', canStream: true }],
    ['ts', { confidence: 'high', canStream: true }],
    ['m2ts', { confidence: 'high', canStream: true }],
    ['webm', { confidence: 'high', canStream: true }],
    
    // Good streaming support
    ['mxf', { confidence: 'medium', canStream: true }],
    ['mkv', { confidence: 'medium', canStream: true }],
    ['3gp', { confidence: 'medium', canStream: true }],
    
    // Limited or poor streaming support
    ['avi', { confidence: 'low' as const, canStream: false, reason: 'index usually at end' }],
    ['wmv', { confidence: 'low' as const, canStream: false, reason: 'poor streaming support' }],
    ['flv', { confidence: 'low' as const, canStream: false, reason: 'metadata at end' }],
    ['rm', { confidence: 'low' as const, canStream: false, reason: 'proprietary format' }],
    ['rmvb', { confidence: 'low' as const, canStream: false, reason: 'variable bitrate issues' }],
  ]);

  static getStreamingCapability(url: string): StreamingCapability {
    const extension = this.extractExtension(url);
    const capability = this.STREAMABLE_FORMATS.get(extension.toLowerCase());
    
    if (!capability) {
      return {
        canStream: false,
        format: extension,
        confidence: 'low',
        fallbackReason: 'Unknown format streaming capability'
      };
    }

    return {
      canStream: capability.canStream,
      format: extension,
      confidence: capability.confidence as 'high' | 'medium' | 'low',
      fallbackReason: capability.reason
    };
  }

  private static extractExtension(url: string): string {
    // Extract extension from URL, handling query parameters
    const urlPath = url.split('?')[0];
    const parts = urlPath.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  static async testStreamingCapability(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Quick test to see if FFprobe can read the stream
      const ffprobeProcess = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-analyzeduration', '1000000', // 1 second
        '-probesize', '1048576', // 1MB
        url
      ], { timeout: 10000 }); // 10 second timeout

      let hasOutput = false;

      ffprobeProcess.stdout.on('data', () => {
        hasOutput = true;
      });

      ffprobeProcess.on('close', (code) => {
        resolve(code === 0 && hasOutput);
      });

      ffprobeProcess.on('error', () => {
        resolve(false);
      });
    });
  }

  static async getAudioStreamsFromUrl(url: string): Promise<AudioStream[]> {
    return FFmpegUtils.getAudioStreams(url, {
      analyzeduration: '5000000', // 5 seconds
      probesize: '5242880' // 5MB
    });
  }

  static async analyzeFileFromUrl(url: string, audioStreamIndex?: number): Promise<EBULoudnessMetrics> {
    return FFmpegUtils.analyzeAudioLoudness(url, audioStreamIndex);
  }
}