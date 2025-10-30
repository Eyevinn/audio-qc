import { FFmpegAnalyzer } from './ffmpeg-analyzer';
import { ComplianceChecker } from './compliance-checker';
import { S3Uploader } from './s3-uploader';
import { S3Downloader } from './s3-downloader';
import { ContainerDetector } from './container-detector';
import { AudioQCOptions, EBUComplianceResult, EBUStandards } from './types';
import { EBU_R128_STANDARDS, EBU_R128_MUSIC_STANDARDS } from './ebu-standards';
import * as fs from 'fs';
import * as path from 'path';

export class AudioQC {
  private complianceChecker: ComplianceChecker;

  constructor(standards: EBUStandards = EBU_R128_STANDARDS) {
    this.complianceChecker = new ComplianceChecker(standards);
  }

  async analyze(options: AudioQCOptions): Promise<EBUComplianceResult> {
    const { inputFile, audioStreamIndex, s3Upload, outputFile, verbose } = options;
    let localFilePath = inputFile;
    let isTemporaryFile = false;

    // Check if input is an S3 URL
    if (S3Downloader.isS3Url(inputFile)) {
      if (verbose) {
        console.log(`Detected S3 URL, downloading: ${inputFile}`);
      }
      
      try {
        localFilePath = await S3Downloader.downloadFileStatic(inputFile);
        isTemporaryFile = true;
        
        if (verbose) {
          console.log(`Downloaded to temporary file: ${localFilePath}`);
        }
      } catch (error) {
        throw new Error(`Failed to download S3 file: ${error}`);
      }
    } else if (!fs.existsSync(inputFile)) {
      throw new Error(`Input file does not exist: ${inputFile}`);
    }

    if (verbose) {
      console.log(`Analyzing file: ${localFilePath}${isTemporaryFile ? ' (downloaded from S3)' : ''}`);
      
      if (ContainerDetector.isVideoContainer(localFilePath)) {
        const containerInfo = await ContainerDetector.getContainerInfo(localFilePath);
        console.log(ContainerDetector.formatContainerInfo(containerInfo, inputFile));
        
        if (!containerInfo.hasAudio) {
          if (isTemporaryFile) {
            try { fs.unlinkSync(localFilePath); } catch (e) {}
          }
          throw new Error(`No audio streams found in video container: ${inputFile}`);
        }
      }
      
      const audioStreams = await FFmpegAnalyzer.getAudioStreams(localFilePath);
      if (audioStreams.length === 0) {
        if (isTemporaryFile) {
          try { fs.unlinkSync(localFilePath); } catch (e) {}
        }
        throw new Error(`No audio streams found in file: ${inputFile}`);
      }
      
      console.log(`Found ${audioStreams.length} audio stream(s):`);
      audioStreams.forEach((stream, idx) => {
        console.log(`  Stream ${idx}: ${stream.codecName}, ${stream.channels}ch, ${stream.sampleRate}Hz${stream.language ? ` (${stream.language})` : ''}${stream.title ? ` - ${stream.title}` : ''}`);
      });
      
      const selectedStream = audioStreamIndex !== undefined ? audioStreamIndex : 0;
      console.log(`Using audio stream ${selectedStream} for analysis`);
    }

    let metrics;
    let result;
    
    try {
      metrics = await FFmpegAnalyzer.analyzeFile(localFilePath, audioStreamIndex);
    

      if (verbose) {
        console.log('Analysis complete. Checking compliance...');
      }

      result = this.complianceChecker.checkCompliance(inputFile, metrics);

      if (outputFile) {
        if (verbose) {
          console.log(`Writing report to: ${outputFile}`);
        }
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
      }

      if (s3Upload) {
        if (verbose) {
          console.log(`Uploading report to S3 bucket: ${s3Upload.bucket}`);
        }
        const s3Url = await S3Uploader.uploadReportToS3(result, s3Upload);
        if (verbose) {
          console.log(`Report uploaded to: ${s3Url}`);
        }
      }
    } catch (error) {
      // Clean up temporary file on error
      if (isTemporaryFile) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
      throw error;
    } finally {
      // Clean up temporary file on success
      if (isTemporaryFile) {
        try {
          fs.unlinkSync(localFilePath);
          if (verbose) {
            console.log('Cleaned up temporary file');
          }
        } catch (cleanupError) {
          if (verbose) {
            console.warn(`Warning: Could not clean up temporary file: ${cleanupError}`);
          }
        }
      }
    }

    return result;
  }

  static async analyzeFile(
    inputFile: string,
    standards?: EBUStandards,
    audioStreamIndex?: number
  ): Promise<EBUComplianceResult> {
    const audioQC = new AudioQC(standards);
    return audioQC.analyze({ inputFile, audioStreamIndex });
  }

  static async getAudioStreams(inputFile: string) {
    return FFmpegAnalyzer.getAudioStreams(inputFile);
  }
}

export * from './types';
export * from './ebu-standards';
export * from './ffmpeg-analyzer';
export * from './compliance-checker';
export * from './s3-uploader';
export * from './s3-downloader';
export * from './container-detector';

export { AudioQC as default };