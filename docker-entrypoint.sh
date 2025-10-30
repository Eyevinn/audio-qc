#!/bin/sh

# Docker entrypoint script for audio-qc
# Provides flexibility for running the container with different configurations

set -e

# Function to show usage
show_usage() {
    echo "Audio QC Container - EBU R128 Compliance Checking"
    echo ""
    echo "Usage:"
    echo "  docker run --rm -v /path/to/files:/usercontent eyevinn/audio-qc analyze /usercontent/audio.wav"
    echo "  docker run --rm -v /path/to/files:/usercontent eyevinn/audio-qc analyze /usercontent/video.mp4 --verbose"
    echo "  docker run --rm -v /path/to/files:/usercontent -e S3_BUCKET=my-bucket eyevinn/audio-qc analyze /usercontent/audio.wav --s3-bucket my-bucket"
    echo ""
    echo "Environment Variables:"
    echo "  S3_ENDPOINT           - S3 endpoint URL (for MinIO, etc.)"
    echo "  S3_ACCESS_KEY_ID      - S3 access key"
    echo "  S3_SECRET_ACCESS_KEY  - S3 secret key"
    echo "  S3_REGION             - S3 region"
    echo "  S3_BUCKET             - Default S3 bucket name"
    echo "  S3_FORCE_PATH_STYLE   - Use path-style addressing (true/false)"
    echo ""
    echo "Examples:"
    echo "  # Analyze audio file with verbose output"
    echo "  docker run --rm -v \$(pwd):/usercontent eyevinn/audio-qc analyze /usercontent/audio.wav --verbose"
    echo ""
    echo "  # Analyze video file and upload to S3"
    echo "  docker run --rm -v \$(pwd):/usercontent \\"
    echo "    -e S3_ACCESS_KEY_ID=your-key \\"
    echo "    -e S3_SECRET_ACCESS_KEY=your-secret \\"
    echo "    -e S3_BUCKET=reports-bucket \\"
    echo "    eyevinn/audio-qc analyze /usercontent/video.mp4 --s3-bucket reports-bucket"
    echo ""
    echo "  # List audio streams in a video file"
    echo "  docker run --rm -v \$(pwd):/usercontent eyevinn/audio-qc analyze /usercontent/video.mp4 --list-streams"
    echo ""
    echo "  # Analyze specific audio stream with MinIO"
    echo "  docker run --rm -v \$(pwd):/usercontent \\"
    echo "    -e S3_ENDPOINT=http://minio:9000 \\"
    echo "    -e S3_ACCESS_KEY_ID=minio-key \\"
    echo "    -e S3_SECRET_ACCESS_KEY=minio-secret \\"
    echo "    -e S3_FORCE_PATH_STYLE=true \\"
    echo "    eyevinn/audio-qc analyze /usercontent/video.mp4 --audio-stream 1 --s3-bucket my-bucket"
}

# If no arguments provided or help requested, show usage
if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ] || [ "$1" = "help" ]; then
    show_usage
    exit 0
fi

# Handle special commands
case "$1" in
    "standards")
        exec audio-qc "$@"
        ;;
    "analyze")
        # Ensure staging directory exists and is writable
        mkdir -p "$STAGING_DIR"
        exec audio-qc "$@"
        ;;
    *)
        # For any other command, try to execute it directly
        # This allows running shell commands or other tools in the container
        exec "$@"
        ;;
esac