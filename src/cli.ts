#!/usr/bin/env node

import { Command } from 'commander';
import { AudioQC, S3Downloader } from './index';
import { ComplianceChecker } from './compliance-checker';
import { EBU_R128_STANDARDS, EBU_R128_MUSIC_STANDARDS } from './ebu-standards';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('audio-qc')
  .description('CLI tool for checking EBU R128 compliance of audio files')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze an audio file for EBU R128 compliance')
  .argument('<input-file>', 'Path to audio file or S3 URL (s3://, https://...s3...amazonaws.com/...)')
  .option('-o, --output <file>', 'Output JSON report file')
  .option('-s, --s3-bucket <bucket>', 'S3 bucket to upload report')
  .option('-k, --s3-key <key>', 'S3 key for the report (optional)')
  .option('-r, --s3-region <region>', 'S3 region (default: us-east-1)')
  .option('--s3-endpoint <endpoint>', 'S3 endpoint URL (for MinIO, etc.)')
  .option('--s3-access-key <key>', 'S3 access key ID')
  .option('--s3-secret-key <secret>', 'S3 secret access key')
  .option('--s3-session-token <token>', 'S3 session token')
  .option('--s3-force-path-style', 'Force path-style addressing for S3')
  .option('-a, --audio-stream <index>', 'Audio stream index to analyze (default: 0)', '0')
  .option('-t, --type <type>', 'Content type: broadcast or music (default: broadcast)', 'broadcast')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--json', 'Output result as JSON')
  .option('--list-streams', 'List available audio streams and exit')
  .action(async (inputFile, options) => {
    try {
      // Check if it's an S3 URL or local file
      const isS3Url = S3Downloader.isS3Url(inputFile);
      if (!isS3Url && !fs.existsSync(inputFile)) {
        console.error(`Error: Input file does not exist: ${inputFile}`);
        process.exit(1);
      }

      if (options.listStreams) {
        if (isS3Url) {
          console.log('Downloading file from S3 to list streams...');
          let tempFile;
          try {
            tempFile = await S3Downloader.downloadFileStatic(inputFile);
            const audioStreams = await AudioQC.getAudioStreams(tempFile);
            if (audioStreams.length === 0) {
              console.log('No audio streams found in file.');
              process.exit(1);
            }
            
            console.log(`\nAudio streams in ${inputFile}:`);
            audioStreams.forEach((stream, idx) => {
              console.log(`  Stream ${idx}: ${stream.codecName}, ${stream.channels}ch, ${stream.sampleRate}Hz${stream.language ? ` (${stream.language})` : ''}${stream.title ? ` - ${stream.title}` : ''}`);
            });
          } catch (error) {
            console.error(`Error downloading file from S3: ${error}`);
            process.exit(1);
          } finally {
            if (tempFile) {
              try { fs.unlinkSync(tempFile); } catch (e) {}
            }
          }
        } else {
          const audioStreams = await AudioQC.getAudioStreams(inputFile);
          if (audioStreams.length === 0) {
            console.log('No audio streams found in file.');
            process.exit(1);
          }
          
          console.log(`\nAudio streams in ${inputFile}:`);
          audioStreams.forEach((stream, idx) => {
            console.log(`  Stream ${idx}: ${stream.codecName}, ${stream.channels}ch, ${stream.sampleRate}Hz${stream.language ? ` (${stream.language})` : ''}${stream.title ? ` - ${stream.title}` : ''}`);
          });
        }
        process.exit(0);
      }

      const standards = options.type === 'music' ? EBU_R128_MUSIC_STANDARDS : EBU_R128_STANDARDS;
      const audioQC = new AudioQC(standards);
      
      const audioStreamIndex = parseInt(options.audioStream, 10);
      if (isNaN(audioStreamIndex) || audioStreamIndex < 0) {
        console.error(`Error: Invalid audio stream index: ${options.audioStream}`);
        process.exit(1);
      }

      const s3Upload = options.s3Bucket ? {
        bucket: options.s3Bucket,
        key: options.s3Key,
        region: options.s3Region,
        endpoint: options.s3Endpoint,
        accessKeyId: options.s3AccessKey,
        secretAccessKey: options.s3SecretKey,
        sessionToken: options.s3SessionToken,
        forcePathStyle: options.s3ForcePathStyle,
      } : undefined;

      const result = await audioQC.analyze({
        inputFile,
        audioStreamIndex,
        s3Upload,
        outputFile: options.output,
        verbose: options.verbose,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(ComplianceChecker.formatReport(result));
      }

      // Exit with 0 since analysis completed successfully
      // Compliance status is indicated in the output, not exit code
      process.exit(0);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('standards')
  .description('Show EBU R128 standards information')
  .option('-t, --type <type>', 'Content type: broadcast or music (default: both)')
  .action((options) => {
    const showBroadcast = !options.type || options.type === 'broadcast' || options.type === 'both';
    const showMusic = !options.type || options.type === 'music' || options.type === 'both';

    if (showBroadcast) {
      console.log('\nEBU R128 Standards for Broadcast Content:');
      console.log(`  Integrated Loudness: ${EBU_R128_STANDARDS.integratedLoudness.min} to ${EBU_R128_STANDARDS.integratedLoudness.max} LUFS (target: ${EBU_R128_STANDARDS.integratedLoudness.target} LUFS)`);
      console.log(`  Loudness Range: max ${EBU_R128_STANDARDS.loudnessRange.max} LU`);
      console.log(`  True Peak: max ${EBU_R128_STANDARDS.truePeak.max} dBTP`);
    }

    if (showMusic) {
      console.log('\nEBU R128 Standards for Music Content:');
      console.log(`  Integrated Loudness: ${EBU_R128_MUSIC_STANDARDS.integratedLoudness.min} to ${EBU_R128_MUSIC_STANDARDS.integratedLoudness.max} LUFS (target: ${EBU_R128_MUSIC_STANDARDS.integratedLoudness.target} LUFS)`);
      console.log(`  Loudness Range: max ${EBU_R128_MUSIC_STANDARDS.loudnessRange.max} LU`);
      console.log(`  True Peak: max ${EBU_R128_MUSIC_STANDARDS.truePeak.max} dBTP`);
    }
    
    console.log();
  });

program.parse();