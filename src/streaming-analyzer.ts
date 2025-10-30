import { spawn } from 'child_process';
import { EBULoudnessMetrics, AudioStream } from './types';

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
    return new Promise((resolve, reject) => {
      const ffprobeProcess = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-select_streams', 'a',
        '-analyzeduration', '5000000', // 5 seconds
        '-probesize', '5242880', // 5MB
        url
      ]);

      let output = '';
      let errorOutput = '';

      ffprobeProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobeProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobeProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe streaming failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const data = JSON.parse(output);
          const audioStreams: AudioStream[] = data.streams.map((stream: any) => ({
            index: stream.index,
            codecName: stream.codec_name,
            channels: stream.channels || 0,
            sampleRate: stream.sample_rate || 'unknown',
            duration: stream.duration || 'unknown',
            language: stream.tags?.language,
            title: stream.tags?.title
          }));
          resolve(audioStreams);
        } catch (error) {
          reject(new Error(`Failed to parse FFprobe streaming output: ${error}`));
        }
      });

      ffprobeProcess.on('error', (error) => {
        reject(new Error(`Failed to start FFprobe for streaming: ${error.message}`));
      });
    });
  }

  static async analyzeFileFromUrl(url: string, audioStreamIndex?: number): Promise<EBULoudnessMetrics> {
    return new Promise((resolve, reject) => {
      const args = ['-i', url];
      
      if (audioStreamIndex !== undefined) {
        args.push('-map', `0:a:${audioStreamIndex}`);
      }
      
      args.push(
        '-af',
        'loudnorm=I=-23:TP=-1:LRA=7:print_format=summary',
        '-f',
        'null',
        '-'
      );
      
      const ffmpegProcess = spawn('ffmpeg', args);

      let output = '';
      let errorOutput = '';

      ffmpegProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        errorOutput += chunk;
      });

      ffmpegProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg streaming analysis failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const metrics = this.parseEBUOutput(output);
          resolve(metrics);
        } catch (error) {
          reject(new Error(`Failed to parse FFmpeg streaming output: ${error}`));
        }
      });

      ffmpegProcess.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg for streaming analysis: ${error.message}`));
      });
    });
  }

  private static parseEBUOutput(output: string): EBULoudnessMetrics {
    const lines = output.split('\n');
    let integratedLoudness = 0;
    let loudnessRange = 0;
    let truePeakMax = 0;
    let momentaryMax = 0;
    let shortTermMax = 0;

    for (const line of lines) {
      if (line.includes('Integrated loudness:')) {
        const match = line.match(/(-?\d+\.?\d*)\s*LUFS/);
        if (match) integratedLoudness = parseFloat(match[1]);
      } else if (line.includes('Loudness range:')) {
        const match = line.match(/(\d+\.?\d*)\s*LU/);
        if (match) loudnessRange = parseFloat(match[1]);
      } else if (line.includes('True peak:')) {
        const match = line.match(/(-?\d+\.?\d*)\s*dBTP/);
        if (match) truePeakMax = parseFloat(match[1]);
      } else if (line.includes('Momentary max:')) {
        const match = line.match(/(-?\d+\.?\d*)\s*LUFS/);
        if (match) momentaryMax = parseFloat(match[1]);
      } else if (line.includes('Short-term max:')) {
        const match = line.match(/(-?\d+\.?\d*)\s*LUFS/);
        if (match) shortTermMax = parseFloat(match[1]);
      }
    }

    return {
      integratedLoudness,
      loudnessRange,
      truePeakMax,
      momentaryMax,
      shortTermMax,
    };
  }
}