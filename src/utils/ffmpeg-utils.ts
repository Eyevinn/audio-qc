import { spawn } from 'child_process';
import { EBULoudnessMetrics, AudioStream } from '../types';

export interface FFmpegProcessOptions {
  timeout?: number;
  analyzeduration?: string;
  probesize?: string;
}

export class FFmpegUtils {
  static parseEBUOutput(output: string): EBULoudnessMetrics {
    const lines = output.split('\n');
    let integratedLoudness = 0;
    let loudnessRange = 0;
    let truePeakMax = 0;
    const momentaryMax = 0;
    const shortTermMax = 0;

    for (const line of lines) {
      // Parse FFmpeg loudnorm output format
      if (line.includes('Input Integrated:')) {
        const match = line.match(/(-?\d+\.?\d*)\s*LUFS/);
        if (match) integratedLoudness = parseFloat(match[1]);
      } else if (line.includes('Input LRA:')) {
        const match = line.match(/(\d+\.?\d*)\s*LU/);
        if (match) loudnessRange = parseFloat(match[1]);
      } else if (line.includes('Input True Peak:')) {
        const match = line.match(/(-?\d+\.?\d*)\s*dBTP/);
        if (match) truePeakMax = parseFloat(match[1]);
      }
      // Note: FFmpeg loudnorm doesn't provide momentary/short-term max values
      // These would need a different analysis method (ebur128 filter)
    }

    return {
      integratedLoudness,
      loudnessRange,
      truePeakMax,
      momentaryMax,
      shortTermMax,
    };
  }

  static async getAudioStreams(
    source: string, 
    options: FFmpegProcessOptions = {}
  ): Promise<AudioStream[]> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-select_streams', 'a'
      ];

      if (options.analyzeduration) {
        args.push('-analyzeduration', options.analyzeduration);
      }
      
      if (options.probesize) {
        args.push('-probesize', options.probesize);
      }

      args.push(source);

      const ffprobeProcess = spawn('ffprobe', args, {
        timeout: options.timeout
      });

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
          reject(new Error(`FFprobe process failed with code ${code}: ${errorOutput}`));
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
          reject(new Error(`Failed to parse FFprobe output: ${error}`));
        }
      });

      ffprobeProcess.on('error', (error) => {
        reject(new Error(`Failed to start FFprobe: ${error.message}`));
      });
    });
  }

  static async analyzeAudioLoudness(
    source: string,
    audioStreamIndex?: number
  ): Promise<EBULoudnessMetrics> {
    return new Promise((resolve, reject) => {
      const args = ['-i', source];
      
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
          reject(new Error(`FFmpeg process failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const metrics = this.parseEBUOutput(output);
          resolve(metrics);
        } catch (error) {
          reject(new Error(`Failed to parse FFmpeg output: ${error}`));
        }
      });

      ffmpegProcess.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`));
      });
    });
  }
}