# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Clean dist directory and build TypeScript files + copy icons using gulp
- `npm run dev` - Start TypeScript compiler in watch mode for development
- `npm run lint` - Run ESLint on nodes, credentials, and package.json
- `npm run lintfix` - Run ESLint with automatic fixes
- `npm run format` - Format code using Prettier
- `npm run prepublishOnly` - Full pipeline: build, lint with prepublish config

## Architecture Overview

This is an n8n community node package starter template for building custom n8n integrations. The codebase follows n8n's node development conventions:

### Core Structure

- **nodes/** - Contains n8n node implementations
  - Each node has a `.node.ts` file implementing `INodeType` interface
  - Nodes define their description, properties, and execute function
  - Example patterns: ExampleNode (basic transform), HttpBin (API integration with credentials)

- **credentials/** - Contains credential type definitions
  - Each credential implements `ICredentialType` interface
  - Defines authentication properties and test methods

### Key Patterns

- **Node Properties**: Use `INodeTypeDescription` to define UI elements, inputs/outputs, and behavior
- **Execution**: Implement `execute()` method with proper error handling using `NodeOperationError`
- **Credentials**: Support optional authentication via credentials array in node description
- **Icon Handling**: Icons (SVG/PNG) are copied from source to dist during build via gulpfile.js

### Build Process

- TypeScript compilation to `dist/` directory (CommonJS, ES2019 target)
- Icon assets copied via gulp task
- Package exports built nodes/credentials from dist folder
- N8n integration defined in package.json `n8n` section

### Development Notes

- Use strict TypeScript settings with comprehensive type checking
- Follow n8n workflow types: `IExecuteFunctions`, `INodeExecutionData`, etc.
- Implement proper error handling with `continueOnFail()` support
- Test nodes locally by linking to n8n development environment