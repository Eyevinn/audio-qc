import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export interface S3DownloadOptions {
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  forcePathStyle?: boolean;
  tempDir?: string;
}

export class S3Downloader {
  private s3Client?: S3Client;
  private options: S3DownloadOptions;

  constructor(options: S3DownloadOptions = {}) {
    this.options = this.mergeWithEnvironment(options);
  }

  private mergeWithEnvironment(options: S3DownloadOptions): S3DownloadOptions {
    return {
      ...options,
      region: options.region || process.env.S3_REGION || process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION,
      endpoint: options.endpoint || process.env.S3_ENDPOINT,
      accessKeyId: options.accessKeyId || process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: options.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: options.sessionToken || process.env.S3_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN,
      forcePathStyle: options.forcePathStyle ?? (process.env.S3_FORCE_PATH_STYLE === 'true'),
      tempDir: options.tempDir || process.env.STAGING_DIR || os.tmpdir(),
    };
  }

  private getS3Client(): S3Client {
    if (!this.s3Client) {
      const clientConfig: any = {
        region: this.options.region || 'us-east-1',
      };

      if (this.options.endpoint) {
        clientConfig.endpoint = this.options.endpoint;
      }

      if (this.options.forcePathStyle) {
        clientConfig.forcePathStyle = this.options.forcePathStyle;
      }

      // For custom endpoints (like MinIO), we need to ensure proper SSL handling
      if (this.options.endpoint) {
        // Force path style for custom endpoints to avoid subdomain issues
        clientConfig.forcePathStyle = true;
        
        // Ensure we're using the correct TLS settings for HTTPS endpoints
        if (this.options.endpoint.startsWith('https://')) {
          clientConfig.tls = true;
        }
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
    return this.s3Client;
  }

  static isS3Url(url: string): boolean {
    // Check for various S3 URL formats
    return /^s3:\/\//i.test(url) || 
           /^https?:\/\/.*\.s3[.-].*\.amazonaws\.com/i.test(url) ||
           /^https?:\/\/s3[.-].*\.amazonaws\.com/i.test(url) ||
           /^https?:\/\/.*\.s3\..*\.amazonaws\.com/i.test(url);
  }

  static parseS3Url(url: string): { bucket: string; key: string; isPresigned: boolean } {
    // Handle s3:// URLs
    if (url.startsWith('s3://')) {
      const match = url.match(/^s3:\/\/([^\/]+)\/(.+)$/);
      if (!match) {
        throw new Error(`Invalid S3 URL format: ${url}`);
      }
      return { bucket: match[1], key: match[2], isPresigned: false };
    }

    // Handle HTTPS S3 URLs (including presigned URLs)
    try {
      const urlObj = new URL(url);
      let bucket: string;
      let key: string;

      // Virtual-hosted-style URL: https://bucket.s3.region.amazonaws.com/key
      if (urlObj.hostname.includes('.s3.') || urlObj.hostname.includes('.s3-')) {
        const hostParts = urlObj.hostname.split('.');
        bucket = hostParts[0];
        key = urlObj.pathname.substring(1); // Remove leading slash
      }
      // Path-style URL: https://s3.region.amazonaws.com/bucket/key
      else if (urlObj.hostname.startsWith('s3.') || urlObj.hostname.startsWith('s3-')) {
        const pathParts = urlObj.pathname.substring(1).split('/');
        bucket = pathParts[0];
        key = pathParts.slice(1).join('/');
      }
      else {
        throw new Error(`Unsupported S3 URL format: ${url}`);
      }

      const isPresigned = urlObj.searchParams.has('X-Amz-Signature') || 
                         urlObj.searchParams.has('AWSAccessKeyId');

      return { bucket, key, isPresigned };
    } catch (error) {
      throw new Error(`Failed to parse S3 URL: ${url}`);
    }
  }

  async downloadFromPresignedUrl(presignedUrl: string, localPath: string): Promise<void> {
    const response = await fetch(presignedUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download from presigned URL: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body from presigned URL');
    }

    const writeStream = fs.createWriteStream(localPath);
    
    try {
      // Convert web stream to Node.js readable stream
      const nodeStream = Readable.fromWeb(response.body as any);
      await pipeline(nodeStream, writeStream);
    } catch (error) {
      // Clean up partial file on error
      try {
        fs.unlinkSync(localPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  async downloadFromS3(bucket: string, key: string, localPath: string): Promise<void> {
    const s3Client = this.getS3Client();
    
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No body in S3 response');
      }

      const writeStream = fs.createWriteStream(localPath);
      await pipeline(response.Body as Readable, writeStream);
    } catch (error) {
      // Clean up partial file on error
      try {
        fs.unlinkSync(localPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new Error(`Failed to download from S3: ${error}`);
    }
  }

  async downloadFile(s3Url: string, customLocalPath?: string): Promise<string> {
    const { bucket, key, isPresigned } = S3Downloader.parseS3Url(s3Url);
    
    // Generate local file path
    const fileName = path.basename(key) || 'downloaded-file';
    const localPath = customLocalPath || path.join(this.options.tempDir!, `audio-qc-${Date.now()}-${fileName}`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(localPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    if (isPresigned) {
      await this.downloadFromPresignedUrl(s3Url, localPath);
    } else {
      await this.downloadFromS3(bucket, key, localPath);
    }

    return localPath;
  }

  static async downloadFileStatic(s3Url: string, options?: S3DownloadOptions): Promise<string> {
    const downloader = new S3Downloader(options);
    return downloader.downloadFile(s3Url);
  }
}