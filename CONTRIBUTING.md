# Contributing to Audio QC

We welcome contributions to the Audio QC project! This document provides guidelines for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inspiring community for all.

## How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs
- Include as much detail as possible:
  - Operating system and version
  - Node.js version
  - FFmpeg version
  - Input file format and details
  - Complete error messages
  - Steps to reproduce

### Suggesting Features

- Open an issue with a clear description of the enhancement
- Explain the use case and benefits
- Consider providing a proof of concept or implementation plan

### Submitting Changes

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Update documentation** as needed
6. **Run the test suite**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```
7. **Commit your changes** with a clear commit message
8. **Push to your fork** and submit a pull request

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Eyevinn/audio-qc.git
   cd audio-qc
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install FFmpeg** (required for development):
   - macOS: `brew install ffmpeg`
   - Ubuntu: `sudo apt update && sudo apt install ffmpeg`
   - Windows: Download from https://ffmpeg.org/

4. **Build the project**:
   ```bash
   npm run build
   ```

5. **Run tests**:
   ```bash
   npm test
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Code Style

- Run `npm run lint` to check code style
- Run `npm run format` to auto-format code
- Follow existing naming conventions
- Keep functions focused and small

### Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting
- Test with various audio/video formats when possible
- Include both positive and negative test cases

## Project Structure

```
src/
├── cli.ts              # Command-line interface
├── index.ts            # Main library exports
├── types.ts            # TypeScript type definitions
├── ebu-standards.ts    # EBU R128 standard definitions
├── ffmpeg-analyzer.ts  # FFmpeg integration
├── compliance-checker.ts # Compliance validation
├── s3-uploader.ts      # S3 upload functionality
├── s3-downloader.ts    # S3 download functionality
└── container-detector.ts # Video container detection
```

## Commit Message Format

Use clear, descriptive commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
- `feat(s3): add support for presigned URLs`
- `fix(ffmpeg): handle video containers without audio`
- `docs(readme): update Docker installation instructions`

## Pull Request Guidelines

- **Target the `main` branch** for all pull requests
- **Include a clear description** of the changes
- **Reference related issues** using `#issue-number`
- **Update documentation** for user-facing changes
- **Add tests** for new functionality
- **Ensure CI passes** before requesting review

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] CI passes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
```

## Release Process

Releases are managed by maintainers:

1. Version is bumped using semantic versioning
2. Changelog is updated
3. Git tag is created
4. Package is published to npm
5. Docker image is built and pushed

## Getting Help

- **Documentation**: Check the README and existing issues
- **Community**: Open a GitHub discussion for questions
- **Issues**: Use GitHub issues for bug reports and feature requests

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## Acknowledgments

Thank you for contributing to Audio QC! Your efforts help make broadcast and streaming audio quality assurance more accessible to everyone.