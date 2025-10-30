import { spawn } from 'child_process';
import * as path from 'path';

export interface ContainerInfo {
  format: string;
  duration: string;
  size: string;
  bitrate: string;
  hasVideo: boolean;
  hasAudio: boolean;
  audioStreamCount: number;
  videoStreamCount: number;
}

export class ContainerDetector {
  private static readonly VIDEO_CONTAINER_EXTENSIONS = [
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v',
    '.mxf', '.ts', '.m2ts', '.vob', '.3gp', '.asf', '.rm', '.rmvb'
  ];

  static isVideoContainer(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    return this.VIDEO_CONTAINER_EXTENSIONS.includes(extension);
  }

  static async getContainerInfo(filePath: string): Promise<ContainerInfo> {
    return new Promise((resolve, reject) => {
      const ffprobeProcess = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
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
          reject(new Error(`FFprobe process failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const data = JSON.parse(output);
          const format = data.format;
          const streams = data.streams || [];

          const audioStreams = streams.filter((s: any) => s.codec_type === 'audio');
          const videoStreams = streams.filter((s: any) => s.codec_type === 'video');

          const containerInfo: ContainerInfo = {
            format: format.format_name || 'unknown',
            duration: format.duration || 'unknown',
            size: format.size || 'unknown',
            bitrate: format.bit_rate || 'unknown',
            hasVideo: videoStreams.length > 0,
            hasAudio: audioStreams.length > 0,
            audioStreamCount: audioStreams.length,
            videoStreamCount: videoStreams.length,
          };

          resolve(containerInfo);
        } catch (error) {
          reject(new Error(`Failed to parse FFprobe output: ${error}`));
        }
      });

      ffprobeProcess.on('error', (error) => {
        reject(new Error(`Failed to start FFprobe: ${error.message}`));
      });
    });
  }

  static formatContainerInfo(info: ContainerInfo, filePath: string): string {
    const fileName = path.basename(filePath);
    
    let report = `\nContainer Information for: ${fileName}\n`;
    report += `Format: ${info.format}\n`;
    report += `Duration: ${info.duration !== 'unknown' ? `${parseFloat(info.duration).toFixed(2)}s` : 'unknown'}\n`;
    report += `Size: ${info.size !== 'unknown' ? `${(parseInt(info.size) / 1024 / 1024).toFixed(2)} MB` : 'unknown'}\n`;
    report += `Bitrate: ${info.bitrate !== 'unknown' ? `${(parseInt(info.bitrate) / 1000).toFixed(0)} kbps` : 'unknown'}\n`;
    report += `Video Streams: ${info.videoStreamCount}\n`;
    report += `Audio Streams: ${info.audioStreamCount}\n`;
    
    if (!info.hasAudio) {
      report += `⚠️  WARNING: No audio streams detected\n`;
    }
    
    return report;
  }
}