#!/bin/bash

# Build script for audio-qc Docker image
# Provides options for different build configurations

set -e

# Default values
IMAGE_NAME="eyevinn/audio-qc"
TAG="latest"
PLATFORM=""
PUSH=false
BUILD_ARGS=""

# Function to show usage
show_usage() {
    echo "Docker Build Script for Audio QC"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --tag TAG           Tag for the Docker image (default: latest)"
    echo "  -n, --name NAME         Name for the Docker image (default: eyevinn/audio-qc)"
    echo "  -p, --platform PLATFORM Build for specific platform (e.g., linux/amd64,linux/arm64)"
    echo "  --push                  Push image to registry after build"
    echo "  --build-arg ARG=VALUE   Pass build arguments to docker build"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Build with default settings"
    echo "  $0 -t v1.0.0                        # Build with specific tag"
    echo "  $0 -p linux/amd64,linux/arm64 --push # Multi-platform build and push"
    echo "  $0 --build-arg NODE_ENV=production   # Pass build arguments"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="--platform $2"
            shift 2
            ;;
        --push)
            PUSH=true
            shift
            ;;
        --build-arg)
            BUILD_ARGS="$BUILD_ARGS --build-arg $2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Full image name with tag
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

echo "Building Docker image: $FULL_IMAGE_NAME"
echo "Platform: ${PLATFORM:-default}"
echo "Push after build: $PUSH"

# Build the Docker image
echo "Starting Docker build..."
docker build $PLATFORM $BUILD_ARGS -t "$FULL_IMAGE_NAME" .

# Also tag as latest if not already latest
if [ "$TAG" != "latest" ]; then
    docker tag "$FULL_IMAGE_NAME" "${IMAGE_NAME}:latest"
    echo "Tagged as ${IMAGE_NAME}:latest"
fi

echo "Build completed successfully!"

# Push if requested
if [ "$PUSH" = true ]; then
    echo "Pushing image to registry..."
    docker push "$FULL_IMAGE_NAME"
    
    if [ "$TAG" != "latest" ]; then
        docker push "${IMAGE_NAME}:latest"
    fi
    
    echo "Push completed!"
fi

echo ""
echo "Image built: $FULL_IMAGE_NAME"
echo ""
echo "Test the image with:"
echo "  docker run --rm $FULL_IMAGE_NAME"
echo ""
echo "Analyze a file with:"
echo "  docker run --rm -v \$(pwd):/usercontent $FULL_IMAGE_NAME analyze /usercontent/your-audio-file.wav --verbose"