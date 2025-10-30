# Audio QC

CLI and library for checking EBU R128 compliance of audio files with S3 upload support.

## Features

- **EBU R128 Compliance Checking**: Analyze audio files for loudness, dynamic range, and true peak compliance
- **Video Container Support**: Extract and analyze audio from MP4, MOV, MXF, AVI, MKV and other video formats
- **HTTP(S) Streaming**: Stream analysis directly from URLs without downloading (MP4, MXF, MOV, TS)
- **Multiple Audio Streams**: Detect and select specific audio streams in multi-stream containers
- **Multiple Standards**: Support for both broadcast and music content standards
- **S3 Integration**: Upload compliance reports directly to Amazon S3 or MinIO
- **CLI and Library**: Use as a command-line tool or integrate into your applications
- **JSON Reports**: Detailed compliance reports in JSON format
- **TypeScript Support**: Full TypeScript definitions included

## Installation

### Global Installation (CLI)

```bash
npm install -g audio-qc
```

### Local Installation (Library)

```bash
npm install audio-qc
```

## Requirements

- Node.js 16 or higher
- FFmpeg and FFprobe installed and available in PATH

## CLI Usage

### Basic Analysis

```bash
# Analyze local audio file
audio-qc analyze input.wav

# Analyze with verbose output
audio-qc analyze input.wav --verbose

# Save report to file
audio-qc analyze input.wav --output report.json

# Output as JSON
audio-qc analyze input.wav --json

# Analyze file from S3 URL
audio-qc analyze s3://my-bucket/audio.wav --verbose

# Analyze file from presigned S3 URL
audio-qc analyze "https://mybucket.s3.amazonaws.com/audio.wav?X-Amz-..." --verbose
```

### S3 Upload

```bash
# Upload report to S3 (uses AWS CLI credentials)
audio-qc analyze input.wav --s3-bucket my-reports-bucket

# Upload with custom key
audio-qc analyze input.wav --s3-bucket my-reports-bucket --s3-key my-report.json

# Upload with explicit credentials
audio-qc analyze input.wav \\
  --s3-bucket my-reports-bucket \\
  --s3-access-key YOUR_ACCESS_KEY \\
  --s3-secret-key YOUR_SECRET_KEY \\
  --s3-region us-west-2

# Upload to MinIO or custom S3-compatible service
audio-qc analyze input.wav \\
  --s3-bucket my-reports-bucket \\
  --s3-endpoint http://localhost:9000 \\
  --s3-force-path-style
```

### Content Types

```bash
# Analyze for broadcast content (default)
audio-qc analyze input.wav --type broadcast

# Analyze for music content
audio-qc analyze input.wav --type music

# Show standards information
audio-qc standards
audio-qc standards --type broadcast
audio-qc standards --type music
```

### Video Container Support

```bash
# Analyze audio from local video files
audio-qc analyze video.mp4 --verbose
audio-qc analyze movie.mov --type broadcast
audio-qc analyze broadcast.mxf --verbose

# Analyze video files from S3
audio-qc analyze s3://my-bucket/video.mp4 --verbose
audio-qc analyze "https://bucket.s3.amazonaws.com/video.mxf?X-Amz-..." --verbose

# List available audio streams in a video file
audio-qc analyze multi-audio.mp4 --list-streams
audio-qc analyze s3://my-bucket/multi-audio.mp4 --list-streams

# Select specific audio stream for analysis
audio-qc analyze multi-audio.mp4 --audio-stream 1 --verbose
audio-qc analyze s3://my-bucket/video.mxf --audio-stream 0 --verbose

# Analyze XDCAM HD MXF files from S3
audio-qc analyze "https://bucket.s3.amazonaws.com/XDCAM_file.mxf?X-Amz-..." --audio-stream 0
```

## Library Usage

### Basic Analysis

```typescript
import { AudioQC } from 'audio-qc';

const audioQC = new AudioQC();
const result = await audioQC.analyze({
  inputFile: 'path/to/audio.wav'
});

console.log(`File is ${result.isCompliant ? 'compliant' : 'non-compliant'}`);
console.log(`Integrated Loudness: ${result.metrics.integratedLoudness} LUFS`);
```

### With S3 Upload

```typescript
import { AudioQC } from 'audio-qc';

const result = await AudioQC.analyzeFile('audio.wav');

const audioQC = new AudioQC();
await audioQC.analyze({
  inputFile: 'path/to/audio.wav',
  s3Upload: {
    bucket: 'my-reports-bucket',
    region: 'us-east-1'
  },
  outputFile: 'local-report.json',
  verbose: true
});

// With MinIO or custom S3-compatible service
await audioQC.analyze({
  inputFile: 'path/to/audio.wav',
  s3Upload: {
    bucket: 'my-reports-bucket',
    endpoint: 'http://localhost:9000',
    forcePathStyle: true,
    accessKeyId: 'minio-access-key',
    secretAccessKey: 'minio-secret-key'
  }
});
```

### Custom Standards

```typescript
import { AudioQC, EBU_R128_MUSIC_STANDARDS } from 'audio-qc';

const audioQC = new AudioQC(EBU_R128_MUSIC_STANDARDS);
const result = await audioQC.analyze({
  inputFile: 'music.wav'
});
```

### Video Container Support

```typescript
import { AudioQC, ContainerDetector } from 'audio-qc';

// Check if file is a video container
const isVideo = ContainerDetector.isVideoContainer('video.mp4');

// Get container information
const containerInfo = await ContainerDetector.getContainerInfo('video.mp4');
console.log(`Format: ${containerInfo.format}, Audio streams: ${containerInfo.audioStreamCount}`);

// List available audio streams
const audioStreams = await AudioQC.getAudioStreams('multi-audio.mov');
console.log(`Found ${audioStreams.length} audio streams`);

// Analyze specific audio stream from video
const result = await AudioQC.analyzeFile('video.mp4', undefined, 1); // Use audio stream 1
```

### S3 Input Support

```typescript
import { AudioQC, S3Downloader, StreamingAnalyzer } from 'audio-qc';

// Check if input is an S3 URL
const isS3 = S3Downloader.isS3Url('s3://bucket/file.wav');

// Check streaming capability for a format
const capability = StreamingAnalyzer.getStreamingCapability('https://bucket.s3.amazonaws.com/video.mp4');
console.log(`Can stream: ${capability.canStream}, Format: ${capability.format}`);

// Analyze file from S3 URL (automatically streams if possible, falls back to download)
const result = await AudioQC.analyzeFile('s3://my-bucket/audio.wav');

// Analyze video from presigned S3 URL (will stream MP4/MXF/MOV automatically)
const videoResult = await AudioQC.analyzeFile(
  'https://bucket.s3.amazonaws.com/video.mp4?X-Amz-Signature=...',
  undefined, // use default standards
  1 // audio stream index
);

// Manual streaming analysis
const streamingResult = await StreamingAnalyzer.analyzeFileFromUrl('https://example.com/video.mp4');

// Manual download (if needed for custom processing)
const localPath = await S3Downloader.downloadFileStatic('s3://bucket/file.wav');
// ... do something with localPath
// Remember to clean up: fs.unlinkSync(localPath);
```

### Format Report

```typescript
import { ComplianceChecker } from 'audio-qc';

const report = ComplianceChecker.formatReport(result);
console.log(report);
```

## Streaming vs Download

The tool automatically determines whether to stream or download based on:

### Streamable Formats (High Efficiency)
- **MP4, MOV, M4V** - Excellent streaming support
- **TS, M2TS** - Designed for streaming
- **WebM** - Good streaming support
- **MXF** - Good streaming for most variants

### Download-Required Formats
- **AVI** - Index usually at end of file
- **FLV** - Metadata at end
- **WMV, RM, RMVB** - Poor streaming support

### Performance Benefits
- **Streaming**: Faster analysis, no temporary files, lower bandwidth
- **Automatic Fallback**: Downloads if streaming fails
- **Smart Detection**: Tests streaming capability before attempting

## EBU R128 Standards

### Broadcast Content
- **Integrated Loudness**: -24 to -22 LUFS (target: -23 LUFS)
- **Loudness Range**: max 7 LU
- **True Peak**: max -1 dBTP

### Music Content
- **Integrated Loudness**: -18 to -14 LUFS (target: -16 LUFS)
- **Loudness Range**: max 20 LU
- **True Peak**: max -1 dBTP

## Compliance Report Format

```json
{
  "file": "/path/to/audio.wav",
  "isCompliant": false,
  "metrics": {
    "integratedLoudness": -25.2,
    "loudnessRange": 8.1,
    "truePeakMax": -0.5,
    "momentaryMax": -18.7,
    "shortTermMax": -20.1
  },
  "violations": [
    "Integrated loudness -25.2 LUFS is outside acceptable range (-24 to -22 LUFS)",
    "Loudness range 8.1 LU exceeds maximum of 7 LU"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## S3 Configuration

The tool supports multiple S3-compatible services and authentication methods:

### AWS S3
1. **AWS CLI credentials** (recommended)
2. **Environment variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
3. **EC2/ECS roles** (when running on AWS)
4. **Explicit credentials** via CLI options or library parameters

### MinIO / S3-Compatible Services
Use custom endpoints with these environment variables:
- `S3_ENDPOINT` - Custom S3 endpoint URL
- `S3_ACCESS_KEY_ID` - Access key for the service
- `S3_SECRET_ACCESS_KEY` - Secret key for the service
- `S3_REGION` - Region (if required)
- `S3_FORCE_PATH_STYLE=true` - Use path-style addressing
- `S3_SESSION_TOKEN` - Session token (if using temporary credentials)

### Environment Variables Priority
The tool checks environment variables in this order:
1. S3-specific: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_ENDPOINT`
2. AWS standard: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
3. CLI parameters override environment variables

## Docker Usage

### Building the Container

```bash
# Build the Docker image
./docker-build.sh

# Build with specific tag
./docker-build.sh -t v1.0.0

# Build for multiple platforms
./docker-build.sh -p linux/amd64,linux/arm64 --push
```

### Running the Container

```bash
# Basic usage - analyze local audio file
docker run --rm -v $(pwd):/usercontent eyevinn/audio-qc analyze /usercontent/audio.wav --verbose

# Analyze video file and save report
docker run --rm -v $(pwd):/usercontent eyevinn/audio-qc \
  analyze /usercontent/video.mp4 --output /usercontent/report.json

# Analyze file from S3 URL
docker run --rm -v $(pwd):/usercontent \
  -e S3_ACCESS_KEY_ID=your-key -e S3_SECRET_ACCESS_KEY=your-secret \
  eyevinn/audio-qc analyze s3://bucket/audio.wav --verbose

# Analyze presigned S3 URL (no credentials needed)
docker run --rm -v $(pwd):/usercontent eyevinn/audio-qc \
  analyze "https://bucket.s3.amazonaws.com/video.mxf?X-Amz-Signature=..." --verbose

# List audio streams in video
docker run --rm -v $(pwd):/usercontent eyevinn/audio-qc \
  analyze /usercontent/video.mp4 --list-streams

# Upload results to S3
docker run --rm -v $(pwd):/usercontent \
  -e S3_ACCESS_KEY_ID=your-key \
  -e S3_SECRET_ACCESS_KEY=your-secret \
  -e S3_BUCKET=reports-bucket \
  eyevinn/audio-qc analyze /usercontent/audio.wav --s3-bucket reports-bucket

# Use with MinIO
docker run --rm -v $(pwd):/usercontent \
  -e S3_ENDPOINT=http://minio:9000 \
  -e S3_ACCESS_KEY_ID=minio-key \
  -e S3_SECRET_ACCESS_KEY=minio-secret \
  -e S3_FORCE_PATH_STYLE=true \
  eyevinn/audio-qc analyze /usercontent/audio.wav --s3-bucket my-bucket
```

### Docker Compose

Use the included `docker-compose.yml` for local development with MinIO:

```bash
# Start services with MinIO
docker-compose up minio

# Run audio analysis with MinIO integration
docker-compose run audio-qc-minio

# Custom analysis
docker-compose run audio-qc analyze /usercontent/your-file.wav --verbose
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Lint and format
npm run lint
npm run format

# Run tests
npm test
```

## License

MIT