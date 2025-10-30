import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3UploadOptions, EBUComplianceResult } from './types';
import * as path from 'path';

export class S3Uploader {
  private s3Client: S3Client;
  private options: S3UploadOptions;

  constructor(options: S3UploadOptions) {
    this.options = this.mergeWithEnvironment(options);
    
    const clientConfig: any = {
      region: this.options.region || process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
    };

    if (this.options.endpoint) {
      clientConfig.endpoint = this.options.endpoint;
    }

    if (this.options.forcePathStyle) {
      clientConfig.forcePathStyle = this.options.forcePathStyle;
    }

    if (this.options.accessKeyId && this.options.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
        ...(this.options.sessionToken && { sessionToken: this.options.sessionToken }),
      };
    }

    this.s3Client = new S3Client(clientConfig);
  }

  private mergeWithEnvironment(options: S3UploadOptions): S3UploadOptions {
    return {
      ...options,
      region: options.region || process.env.S3_REGION || process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION,
      endpoint: options.endpoint || process.env.S3_ENDPOINT,
      accessKeyId: options.accessKeyId || process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: options.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: options.sessionToken || process.env.S3_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN,
      forcePathStyle: options.forcePathStyle ?? (process.env.S3_FORCE_PATH_STYLE === 'true'),
    };
  }

  private generateKey(originalFile: string, customKey?: string): string {
    if (customKey) {
      return customKey.endsWith('.json') ? customKey : `${customKey}.json`;
    }

    const baseName = path.basename(originalFile, path.extname(originalFile));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `audio-qc-reports/${baseName}-${timestamp}.json`;
  }

  async uploadReport(result: EBUComplianceResult): Promise<string> {
    const key = this.generateKey(result.file, this.options.key);
    const body = JSON.stringify(result, null, 2);

    try {
      const command = new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json',
        Metadata: {
          'original-file': path.basename(result.file),
          'compliance-status': result.isCompliant ? 'compliant' : 'non-compliant',
          'analysis-timestamp': result.timestamp,
        },
      });

      await this.s3Client.send(command);
      
      const s3Url = this.options.endpoint && !this.options.endpoint.includes('amazonaws.com')
        ? `${this.options.endpoint}/${this.options.bucket}/${key}`
        : `s3://${this.options.bucket}/${key}`;
      return s3Url;
    } catch (error) {
      throw new Error(`Failed to upload report to S3: ${error}`);
    }
  }

  static async uploadReportToS3(
    result: EBUComplianceResult,
    options: S3UploadOptions
  ): Promise<string> {
    const uploader = new S3Uploader(options);
    return uploader.uploadReport(result);
  }
}