export interface EBULoudnessMetrics {
  integratedLoudness: number;
  loudnessRange: number;
  truePeakMax: number;
  momentaryMax: number;
  shortTermMax: number;
}

export interface EBUComplianceResult {
  file: string;
  isCompliant: boolean;
  metrics: EBULoudnessMetrics;
  violations: string[];
  timestamp: string;
}

export interface S3UploadOptions {
  bucket: string;
  key?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  forcePathStyle?: boolean;
}

export interface AudioStream {
  index: number;
  codecName: string;
  channels: number;
  sampleRate: string;
  duration: string;
  language?: string;
  title?: string;
}

export interface AudioQCOptions {
  inputFile: string;
  audioStreamIndex?: number;
  s3Upload?: S3UploadOptions;
  outputFile?: string;
  verbose?: boolean;
}

export interface EBUStandards {
  integratedLoudness: {
    min: number;
    max: number;
    target: number;
  };
  loudnessRange: {
    max: number;
  };
  truePeak: {
    max: number;
  };
}