# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Audio QC, please report it to us privately. We take security seriously and will work to address issues promptly.

### How to Report

1. **Email**: Send details to security@eyevinn.se
2. **Subject**: Include "Audio QC Security Issue" in the subject line
3. **Details**: Provide as much information as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 24 hours
- **Assessment**: We will assess the issue within 72 hours
- **Updates**: Regular updates on our progress
- **Resolution**: We aim to resolve critical issues within 7 days

### Disclosure Timeline

1. **Immediate**: We will work to fix the issue
2. **Coordinated**: Public disclosure after fix is available
3. **Credit**: Security researchers will be credited (if desired)

## Security Considerations

### AWS Credentials

- Never commit AWS credentials to the repository
- Use environment variables or IAM roles
- Rotate credentials regularly
- Use least-privilege access policies

### S3 Operations

- Validate S3 URLs before processing
- Use temporary files with restricted permissions
- Clean up temporary files after processing
- Limit file sizes to prevent DoS attacks

### FFmpeg Security

- FFmpeg processes untrusted media files
- Ensure FFmpeg is kept up to date
- Consider sandboxing in production environments

### Docker Security

- Container runs as non-root user
- Minimal attack surface with Alpine Linux
- Regular base image updates

## Best Practices

### For Users

1. **Keep Updated**: Use the latest version
2. **Secure Credentials**: Use IAM roles when possible
3. **Network Security**: Restrict network access as needed
4. **Input Validation**: Validate input files before processing

### For Contributors

1. **Dependency Security**: Check dependencies for vulnerabilities
2. **Code Review**: Security-focused code reviews
3. **Static Analysis**: Use security linting tools
4. **Input Sanitization**: Validate all external inputs

## Dependencies

We regularly monitor our dependencies for security vulnerabilities using:

- npm audit
- GitHub security advisories
- Dependabot alerts

## Reporting Non-Security Issues

For general bugs and feature requests, please use our [GitHub Issues](https://github.com/Eyevinn/audio-qc/issues).

Thank you for helping keep Audio QC secure!