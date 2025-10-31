import { EBULoudnessMetrics, AudioStream } from './types';
import { FFmpegUtils } from './utils/ffmpeg-utils';

export class FFmpegAnalyzer {
  static async getAudioStreams(filePath: string): Promise<AudioStream[]> {
    return FFmpegUtils.getAudioStreams(filePath);
  }

  static async analyzeFile(filePath: string, audioStreamIndex?: number): Promise<EBULoudnessMetrics> {
    return FFmpegUtils.analyzeAudioLoudness(filePath, audioStreamIndex);
  }
}