# Design Document

## Overview

The listener project documentation system provides comprehensive guides for creating, deploying, and maintaining a separate NFT Activity Listener service. The documentation is structured as a collection of Markdown files, each serving a specific purpose in the developer journey from understanding the architecture to production deployment.

The documentation addresses the fundamental constraint that Vercel (a serverless platform) cannot run long-running processes like blockchain event listeners. The solution is a hybrid architecture where the Next.js web application runs on Vercel while the listener service runs on a platform that supports persistent processes (Railway, Render, Fly.io, or custom VPS).

### Key Documentation Files

1. **LISTENER_PROJECT_SUMMARY.md** - High-level overview with quick start options
2. **SEPARATE_LISTENER_PROJECT.md** - Detailed step-by-step setup guide
3. **VERCEL_DEPLOYMENT.md** - Deployment strategies and platform comparisons
4. **QUICK_START_LISTENER.md** - Rapid local testing guide
5. **Setup Scripts** - Automated project creation (create-listener-project.sh/bat)

## Architecture

### Documentation Structure

```
docs/
├── LISTENER_PROJECT_SUMMARY.md          # Entry point - overview & quick start
├── SEPARATE_LISTENER_PROJECT.md         # Detailed setup guide
├── VERCEL_DEPLOYMENT.md                 # Deployment options & comparisons
├── QUICK_START_LISTENER.md              # Local testing guide
└── RUNNING_ACTIVITY_LISTENER.md         # Operations guide

scripts/
├── create-listener-project.sh           # Linux/Mac setup automation
├── create-listener-project.bat          # Windows setup automation
└── dev-with-listener.sh/bat            # Development helper scripts
```

### System Architecture Diagram

The documentation explains this architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Web App)                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  nft-launchpad-evm-odds                               │  │
│  │  - Next.js Frontend                                   │  │
│  │  - API Routes                                         │  │
│  │  - Server Components                                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ DATABASE_URL
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SHARED DATABASE (Supabase/Railway)              │
│  - PostgreSQL                                                │
│  - Shared by both Web App and Listener                      │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ DATABASE_URL
                           │
┌─────────────────────────────────────────────────────────────┐
│              RAILWAY/RENDER (Listener Service)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  nft-listener-service                                 │  │
│  │  - Activity Listener                                  │  │
│  │  - Multi-Chain Manager                                │  │
│  │  - Event Handlers                                     │  │
│  │  - Auto-Discovery & Auto-Sync                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Information Flow

1. **Developer Journey**: Overview → Setup → Local Testing → Deployment → Maintenance
2. **Setup Options**: Automated Script → Manual Steps → Verification
3. **Deployment Paths**: Railway (easiest) → Render (free tier) → Fly.io → Docker → VPS

## Components and Interfaces

### 1. Overview Documentation (LISTENER_PROJECT_SUMMARY.md)

**Purpose**: First point of contact for developers, providing context and quick start options.

**Content Structure**:
- Problem statement (why separation is needed)
- Benefits comparison table
- Architecture diagram
- Quick start commands (script-based)
- Project structure overview
- Deployment options summary
- Cost estimates
- Monitoring basics
- Troubleshooting quick reference

**Target Audience**: Developers evaluating or starting the separation process

### 2. Detailed Setup Guide (SEPARATE_LISTENER_PROJECT.md)

**Purpose**: Comprehensive step-by-step instructions for manual project creation.

**Content Structure**:
- Complete project structure definition
- Step-by-step setup (14 detailed steps)
- File copying instructions with source/destination paths
- Import path conversion guide (Next.js aliases → relative paths)
- Configuration file templates (package.json, tsconfig.json, etc.)
- Entry point implementation (src/index.ts)
- Database configuration
- Environment variable setup
- Prisma client generation
- Local testing verification
- Deployment configurations for each platform

**Target Audience**: Developers who want full control or need to understand every step

### 3. Deployment Guide (VERCEL_DEPLOYMENT.md)

**Purpose**: Platform-specific deployment instructions and comparisons.

**Content Structure**:
- Vercel limitations explanation
- Hybrid architecture recommendation
- Platform-specific guides:
  - Railway (recommended)
  - Render (free tier)
  - Fly.io (free tier)
  - Vercel Cron (alternative approach)
  - Docker (containerized)
  - VPS (custom)
- Comparison table (cost, difficulty, real-time capability)
- Shared database setup
- Environment variable configuration per platform
- Monitoring and logging access
- Integration verification steps

**Target Audience**: Developers ready to deploy to production

### 4. Quick Start Guide (QUICK_START_LISTENER.md)

**Purpose**: Rapid local testing and verification.

**Content Structure**:
- Important warnings (listener doesn't auto-start)
- Development options (concurrently, dual terminal, helper scripts)
- Production commands (PM2)
- Verification methods (health checks, logs, expected output)
- Troubleshooting quick fixes
- Command reference table

**Target Audience**: Developers testing locally before deployment

### 5. Setup Scripts

**Purpose**: Automated project creation to reduce manual errors.

**Components**:

**create-listener-project.sh** (Linux/Mac):
- Directory creation with conflict detection
- npm initialization
- Dependency installation
- Directory structure creation
- File copying from main project
- Configuration file generation
- Prisma client generation
- Success verification

**create-listener-project.bat** (Windows):
- Same functionality as shell script
- Windows-specific commands (mkdir, copy, etc.)
- Batch file syntax and error handling

**Common Features**:
- Interactive prompts for existing directories
- Automatic dependency installation
- Configuration file generation
- Environment file copying
- Deployment config creation (railway.json, render.yaml)
- README generation
- Success message with next steps

## Data Models

### Documentation Metadata

Each documentation file contains implicit metadata:

```typescript
interface DocumentationFile {
  filename: string;
  purpose: string;
  targetAudience: string[];
  prerequisites: string[];
  estimatedReadTime: number; // minutes
  relatedFiles: string[];
}
```

### Project Structure Model

The documentation describes this project structure:

```typescript
interface ListenerProjectStructure {
  rootDirectory: string; // "nft-listener-service"
  directories: {
    src: {
      lib: {
        blockchain: {
          eventHandlers: string[];
        };
      };
      config: string[];
      utils: string[];
    };
    prisma: string[];
    abi: string[];
  };
  configFiles: string[]; // package.json, tsconfig.json, etc.
  deploymentConfigs: string[]; // railway.json, render.yaml, etc.
}
```

### Deployment Platform Model

```typescript
interface DeploymentPlatform {
  name: string;
  cost: {
    freeTier: boolean;
    monthlyMin: number;
    monthlyMax: number;
  };
  setupDifficulty: 1 | 2 | 3 | 4 | 5; // 1 = easiest
  supportsRealTime: boolean;
  configFile: string;
  cliTool?: string;
  deploymentMethod: 'cli' | 'git' | 'docker' | 'manual';
  monitoringAccess: string;
}
```

### Environment Configuration Model

```typescript
interface EnvironmentConfig {
  required: {
    DATABASE_URL: string;
    NODE_ENV: 'development' | 'production';
  };
  rpcUrls: {
    [chainName: string]: string;
  };
  optional?: {
    [key: string]: string;
  };
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Documentation Content Properties

Property 1: Script directory creation completeness
*For any* successful script execution, all required directories (src/lib/blockchain/event-handlers, src/config, src/utils, prisma, abi) should exist in the created project
**Validates: Requirements 4.3**

Property 2: Script file copying completeness
*For any* successful script execution, all required files from the main project should be present in the new project with correct content
**Validates: Requirements 4.4**

Property 3: Script dependency installation
*For any* successful script execution, running `npm list` should show all required dependencies (ethers, @prisma/client, dotenv, tsx, typescript, prisma) installed
**Validates: Requirements 4.5**

Property 4: Script Prisma client generation
*For any* successful script execution, the Prisma client should be generated and the node_modules/.prisma directory should exist
**Validates: Requirements 4.5**

Property 5: Script success output
*For any* successful script execution, the console output should contain "✅ Project created successfully!" and next steps instructions
**Validates: Requirements 4.6**

### Documentation Structure Properties

Property 6: Documentation file existence
*For any* complete documentation set, all five core documentation files (LISTENER_PROJECT_SUMMARY.md, SEPARATE_LISTENER_PROJECT.md, VERCEL_DEPLOYMENT.md, QUICK_START_LISTENER.md, and both setup scripts) should exist
**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**

Property 7: Platform deployment coverage
*For any* deployment platform mentioned in the comparison table (Railway, Render, Fly.io, Docker), the documentation should contain a dedicated section with configuration examples and deployment commands
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Error Handling

### Documentation Errors

**Missing Content**:
- **Detection**: Automated tests verify presence of required sections
- **Handling**: CI/CD pipeline fails if required content is missing
- **User Impact**: Developers receive complete documentation

**Outdated Information**:
- **Detection**: Version numbers and commands are validated against current dependencies
- **Handling**: Documentation includes version numbers that can be automatically checked
- **User Impact**: Developers use correct, current versions

**Broken Links**:
- **Detection**: Link checker validates all internal references
- **Handling**: CI/CD pipeline fails if links are broken
- **User Impact**: All documentation cross-references work correctly

### Script Errors

**Directory Already Exists**:
- **Detection**: Script checks for existing directory before creation
- **Handling**: Prompt user for confirmation before overwriting
- **User Impact**: Prevents accidental data loss
- **Example**:
  ```bash
  ⚠️  Directory already exists!
  Do you want to remove it and continue? (y/N):
  ```

**Missing Source Files**:
- **Detection**: Script verifies source files exist before copying
- **Handling**: Display error message with missing file path
- **User Impact**: Clear feedback about what's missing
- **Example**:
  ```bash
  ❌ Error: Source file not found: ../nft-launchpad-evm-odds/src/lib/blockchain/activity-listener.ts
  ```

**Dependency Installation Failure**:
- **Detection**: Check npm install exit code
- **Handling**: Display error and suggest checking network connection
- **User Impact**: Clear guidance on resolving installation issues
- **Example**:
  ```bash
  ❌ Failed to install dependencies
  Please check your network connection and try again
  ```

**Prisma Generation Failure**:
- **Detection**: Check prisma generate exit code
- **Handling**: Display error and suggest checking DATABASE_URL
- **User Impact**: Clear guidance on database configuration
- **Example**:
  ```bash
  ❌ Failed to generate Prisma client
  Please check your DATABASE_URL in .env file
  ```

### Deployment Errors

**Invalid Environment Variables**:
- **Documentation**: Each platform section includes environment variable validation
- **Handling**: Provide examples of correct format
- **User Impact**: Developers can verify configuration before deployment

**Platform-Specific Issues**:
- **Documentation**: Troubleshooting section for each platform
- **Handling**: Common errors and solutions documented
- **User Impact**: Quick resolution of platform-specific problems

## Testing Strategy

### Documentation Testing

**Content Verification Tests**:
- Verify all required sections exist in each documentation file
- Verify code examples are syntactically correct
- Verify all mentioned files and directories exist in examples
- Verify version numbers match current dependencies
- Verify all internal links resolve correctly

**Example Test**:
```typescript
describe('LISTENER_PROJECT_SUMMARY.md', () => {
  it('should contain architecture diagram', () => {
    const content = fs.readFileSync('LISTENER_PROJECT_SUMMARY.md', 'utf-8');
    expect(content).toContain('VERCEL (Web App)');
    expect(content).toContain('SHARED DATABASE');
    expect(content).toContain('RAILWAY/RENDER (Listener Service)');
  });

  it('should list all four benefits', () => {
    const content = fs.readFileSync('LISTENER_PROJECT_SUMMARY.md', 'utf-8');
    expect(content).toContain('Independent Deployment');
    expect(content).toContain('No Dependency Conflict');
    expect(content).toContain('Easier Scaling');
    expect(content).toContain('Better Resource Management');
  });
});
```

### Script Testing

**Unit Tests**:
- Test directory creation logic
- Test file copying logic
- Test configuration file generation
- Test error handling for missing files
- Test user prompt handling

**Integration Tests**:
- Run complete script in test environment
- Verify all files created correctly
- Verify dependencies installed
- Verify Prisma client generated
- Verify created project can start successfully

**Property-Based Tests**:
- Test script with various starting conditions (empty directory, existing directory, missing source files)
- Verify script always creates complete project structure when successful
- Verify script always prompts before overwriting when directory exists
- Verify script always displays success message when complete

**Example Property Test**:
```typescript
describe('create-listener-project script', () => {
  it('should create all required directories on successful execution', () => {
    // Run script
    execSync('./scripts/create-listener-project.sh', { 
      input: 'y\n', // Confirm overwrite if needed
      cwd: testDir 
    });

    // Verify all directories exist
    const requiredDirs = [
      'src/lib/blockchain/event-handlers',
      'src/config',
      'src/utils',
      'prisma',
      'abi'
    ];

    requiredDirs.forEach(dir => {
      expect(fs.existsSync(path.join(projectDir, dir))).toBe(true);
    });
  });

  it('should copy all required files on successful execution', () => {
    execSync('./scripts/create-listener-project.sh', { 
      input: 'y\n',
      cwd: testDir 
    });

    const requiredFiles = [
      'prisma/schema.prisma',
      'abi/MasterContractFactory.json',
      'abi/OddsLaunchpad.json',
      'src/lib/blockchain/activity-listener.ts',
      'src/config/chains.ts',
      'package.json',
      'tsconfig.json'
    ];

    requiredFiles.forEach(file => {
      expect(fs.existsSync(path.join(projectDir, file))).toBe(true);
    });
  });
});
```

### Manual Testing Checklist

**Documentation Review**:
- [ ] Read through each documentation file for clarity
- [ ] Verify all code examples are correct
- [ ] Test all commands in a fresh environment
- [ ] Verify all links work
- [ ] Check for typos and grammar issues

**Script Testing**:
- [ ] Run script on clean Linux/Mac system
- [ ] Run script on clean Windows system
- [ ] Test with existing directory (verify prompt)
- [ ] Test with missing source files (verify error)
- [ ] Verify created project starts successfully
- [ ] Verify listener captures events correctly

**Deployment Testing**:
- [ ] Deploy to Railway following documentation
- [ ] Deploy to Render following documentation
- [ ] Verify environment variables work correctly
- [ ] Verify logs are accessible as documented
- [ ] Verify monitoring works as documented

### Testing Tools

**Documentation Linting**:
- markdownlint for Markdown syntax
- markdown-link-check for link validation
- Custom scripts for content verification

**Script Testing**:
- Jest for unit and integration tests
- fast-check for property-based testing
- shellcheck for shell script validation

**Deployment Testing**:
- Manual testing in staging environments
- Automated health checks post-deployment
- Log monitoring for errors

## Implementation Notes

### Documentation Maintenance

**Version Synchronization**:
- Documentation should reference current package versions
- Update documentation when dependencies are upgraded
- Include version numbers in code examples

**Platform Updates**:
- Monitor deployment platforms for changes
- Update configuration examples when platforms change
- Test deployment guides regularly

**Script Maintenance**:
- Keep scripts synchronized with main project structure
- Update file paths when main project reorganizes
- Test scripts after main project changes

### Accessibility

**Documentation Accessibility**:
- Use clear, simple language
- Provide examples for all concepts
- Include visual diagrams for architecture
- Offer multiple learning paths (quick start vs. detailed)

**Script Accessibility**:
- Provide both automated and manual options
- Include helpful error messages
- Display progress indicators
- Offer confirmation prompts for destructive actions

### Internationalization

**Current State**: Documentation is in mixed English and Indonesian

**Future Considerations**:
- Standardize on English for technical terms
- Consider separate Indonesian translation
- Use consistent terminology throughout

### Performance Considerations

**Documentation Loading**:
- Keep individual files focused and reasonably sized
- Use clear file names for easy navigation
- Provide table of contents in longer documents

**Script Performance**:
- Minimize unnecessary file operations
- Use efficient copy commands
- Provide progress feedback for long operations

## Security Considerations

### Environment Variables

**Documentation**:
- Never include actual secrets in documentation
- Use placeholder values (YOUR_KEY, YOUR_PASSWORD)
- Emphasize importance of .env file security
- Document .gitignore requirements

**Scripts**:
- Never log environment variable values
- Copy .env.example instead of .env by default
- Warn users about sensitive data

### File Permissions

**Scripts**:
- Set appropriate permissions on created files
- Ensure scripts are executable (chmod +x)
- Validate file paths to prevent directory traversal

### Deployment Security

**Documentation**:
- Document secure environment variable management
- Explain platform-specific security features
- Recommend using secrets management services
- Document database connection security

## Future Enhancements

### Documentation Improvements

1. **Interactive Tutorials**: Step-by-step interactive guides
2. **Video Walkthroughs**: Screen recordings of setup process
3. **Troubleshooting Database**: Searchable error solutions
4. **Version-Specific Guides**: Documentation for different versions

### Script Enhancements

1. **Interactive Mode**: Prompt for configuration during setup
2. **Validation Mode**: Verify existing project structure
3. **Update Mode**: Update existing project with new files
4. **Rollback Mode**: Undo changes if setup fails

### Monitoring Enhancements

1. **Health Dashboard**: Web UI for monitoring listener status
2. **Alert System**: Notifications for listener failures
3. **Metrics Collection**: Performance and event statistics
4. **Log Aggregation**: Centralized logging across platforms

### Testing Enhancements

1. **Automated E2E Tests**: Full deployment testing
2. **Documentation CI/CD**: Automated validation on commits
3. **Platform Testing Matrix**: Test on all supported platforms
4. **Performance Benchmarks**: Track script execution time
