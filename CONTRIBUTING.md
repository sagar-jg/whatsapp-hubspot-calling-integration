# Contributing to WhatsApp HubSpot Calling Integration

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issues](https://github.com/sagar-jg/whatsapp-hubspot-calling-integration/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/sagar-jg/whatsapp-hubspot-calling-integration/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

People *love* thorough bug reports. I'm not even kidding.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/sagar-jg/whatsapp-hubspot-calling-integration.git
   cd whatsapp-hubspot-calling-integration
   ```

2. Run the setup script:
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   # Edit the .env files with your configuration
   ```

4. Start the development environment:
   ```bash
   npm run dev
   ```

## Code Style

We use ESLint and Prettier to maintain code quality and consistency:

```bash
# Lint your code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Testing

Please add tests for any new functionality:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:backend
npm run test:frontend
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Example:
```
feat(calling): add mute/unmute functionality during calls

Added buttons to mute and unmute audio during active calls.
Includes visual feedback and keyboard shortcuts.

Closes #123
```

## Code Review Process

1. All submissions require review before merging
2. We use GitHub's review features
3. Reviews should be constructive and helpful
4. Address all feedback before expecting a merge

## Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Help

- Check existing [issues](https://github.com/sagar-jg/whatsapp-hubspot-calling-integration/issues)
- Join our [discussions](https://github.com/sagar-jg/whatsapp-hubspot-calling-integration/discussions)
- Read the documentation thoroughly
- Ask questions in a clear and detailed manner

## Areas for Contribution

### 🐛 Bug Fixes
- Fix existing bugs
- Improve error handling
- Address edge cases

### ✨ Features
- Video calling support
- Call recording analytics
- Mobile app development
- Integration with other CRM systems

### 📚 Documentation
- Improve existing documentation
- Add code examples
- Create tutorials and guides
- Translate documentation

### 🧪 Testing
- Add more test cases
- Improve test coverage
- Add performance tests
- Create testing utilities

### 🎨 UI/UX
- Improve user interface
- Enhance user experience
- Add accessibility features
- Mobile responsiveness

### 🔧 DevOps
- Improve CI/CD pipeline
- Add monitoring and alerting
- Optimize Docker configurations
- Enhance deployment scripts

## Release Process

1. Create a release branch from `main`
2. Update version numbers
3. Update CHANGELOG.md
4. Create a pull request
5. After review and merge, create a GitHub release
6. Deploy to production

## Security

If you find a security vulnerability, please do NOT open a public issue. Instead, email security@example.com with details.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Recognition

Contributors will be recognized in:
- README.md contributors section
- GitHub contributors page
- Release notes for significant contributions

## Questions?

Don't hesitate to ask! Open an issue or start a discussion if you need help.