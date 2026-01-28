# PingLink: Node.js to Bun Migration Plan

## Executive Summary

This document outlines the migration strategy for PingLink from Node.js to Bun. The migration aims to leverage Bun's faster runtime, native TypeScript support, and built-in tooling to simplify the development workflow and improve performance.

### Why Migrate to Bun?

| Benefit | Description |
|---------|-------------|
| **Faster Startup** | Bun starts ~4x faster than Node.js, improving CLI responsiveness |
| **Native TypeScript** | No transpilation needed - run `.ts` files directly |
| **Simpler Toolchain** | Eliminates tsx, esbuild, ts-node dependencies |
| **Built-in Bundler** | Replace esbuild with Bun's native bundler |
| **Faster Package Install** | Bun installs packages ~25x faster than npm |
| **Node.js Compatibility** | Drop-in replacement for most Node.js APIs |
| **Active Development** | Rapidly improving with strong community support |

### Migration Complexity: **Low to Medium**

Based on code analysis:
- ✅ No circular dependencies
- ✅ All Node.js APIs used are Bun-compatible
- ✅ Clean modular architecture
- ⚠️ `blessed` package needs compatibility verification
- ⚠️ TTY handling in `simple-graph-renderer.ts` needs testing

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Bun Compatibility Assessment](#2-bun-compatibility-assessment)
3. [Migration Steps](#3-migration-steps)
4. [Configuration Changes](#4-configuration-changes)
5. [Dependency Analysis](#5-dependency-analysis)
6. [Risk Assessment](#6-risk-assessment)
7. [Testing Strategy](#7-testing-strategy)
8. [Rollback Plan](#8-rollback-plan)

---

## 1. Current Architecture Analysis

### Codebase Metrics
| Metric | Value |
|--------|-------|
| Total Files | 13 |
| Total Lines of Code | 2,092 |
| Average Complexity | 13.1 |
| Max Complexity | 30 |
| Circular Dependencies | 0 (clean architecture) |

### Runtime & Tooling
| Component | Current | Purpose |
|-----------|---------|---------|
| Runtime | Node.js v22+ | Execution environment |
| Package Manager | pnpm v10.14.0 | Dependency management |
| Bundler | esbuild | Production builds |
| TypeScript Runner | tsx | Development mode |
| Type Checker | tsc | Static type checking |
| Linter | ESLint | Code quality |

### Node.js APIs in Use
The following Node.js APIs are used throughout the codebase:

| API | Location | Usage |
|-----|----------|-------|
| `child_process.spawn` | `ping-engine.ts`, `sound-engine.ts` | Execute ping commands and audio alerts |
| `EventEmitter` | `ping-engine.ts` | Event-driven ping result handling |
| `process.platform` | `ping-engine.ts`, `sound-engine.ts` | OS detection for cross-platform support |
| `process.stdout` | Multiple UI files | Terminal output and TTY detection |
| `process.on` | `index.ts`, `terminal-control.ts` | Signal handling (SIGINT, SIGTERM) |
| `process.exit` | Multiple files | Graceful shutdown |

### Source Files with Complexity Analysis
```
src/
├── cli.ts                        # Commander.js entry point (complexity: 9)
├── index.ts                      # Main application logic (complexity: 19)
├── core/
│   ├── ping-engine.ts            # Uses spawn, EventEmitter (complexity: 10)
│   ├── sound-engine.ts           # Uses spawn for audio (complexity: 17)
│   └── data-manager.ts           # Data storage (complexity: 19)
├── ui/
│   ├── terminal-renderer.ts      # Uses blessed (complexity: 10)
│   ├── simple-graph-renderer.ts  # Uses process.stdout (complexity: 30) ⚠️ Highest
│   └── graph-visualizer.ts       # Visualization logic (complexity: 15)
├── utils/
│   ├── terminal-control.ts       # ANSI codes, process.stdout (complexity: 13)
│   ├── time-utils.ts             # Time formatting (complexity: 10)
│   ├── color-schemes.ts          # Color definitions (complexity: 9)
│   └── dot-history.ts            # History tracking (complexity: 8)
└── types/
    └── index.ts                  # TypeScript interfaces (complexity: 1)
```

### High-Priority Files for Migration Testing
Files with highest complexity should be tested most thoroughly after migration:

1. **`simple-graph-renderer.ts`** (372 lines, complexity: 30)
   - Heavy use of `process.stdout` for terminal control
   - Scroll regions, cursor positioning, resize handling
   - Most critical file for Bun TTY compatibility testing

2. **`index.ts`** (135 lines, complexity: 19)
   - Main orchestration with signal handlers
   - Runtime duration tracking
   - Process event listeners

3. **`data-manager.ts`** (147 lines, complexity: 19)
   - Pure TypeScript, no Node.js specific APIs
   - Should work unchanged

4. **`sound-engine.ts`** (234 lines, complexity: 17)
   - Heavy use of `child_process.spawn`
   - Platform-specific audio commands
   - Test cross-platform audio playback

---

## 2. Bun Compatibility Assessment

### Fully Compatible APIs

| API | Bun Support | Notes |
|-----|-------------|-------|
| `child_process.spawn` | ✅ Full | Native support |
| `EventEmitter` | ✅ Full | Via `events` module |
| `process.platform` | ✅ Full | Native support |
| `process.stdout` | ✅ Full | Native support |
| `process.on` (signals) | ✅ Full | Native support |
| `process.exit` | ✅ Full | Native support |

### Dependencies Compatibility

| Package | Version | Bun Compatible | Notes |
|---------|---------|----------------|-------|
| `commander` | ^14.0.0 | ✅ Yes | Pure JS, works well |
| `chalk` | ^5.6.0 | ✅ Yes | ESM, fully compatible |
| `cli-cursor` | ^5.0.0 | ✅ Yes | ESM, fully compatible |
| `blessed` | ^0.1.81 | ⚠️ Mostly | CommonJS, native bindings may need testing |

### Potential Concerns

1. **blessed package**: This is a CommonJS package with optional native bindings (term.js, pty.js). While Bun has good CommonJS compatibility, terminal UI libraries sometimes have edge cases.

2. **TTY handling**: Bun's TTY implementation should be compatible, but the advanced terminal rendering needs verification.

---

## 3. Migration Steps

### Phase 1: Environment Setup

#### Step 1.1: Install Bun
```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

#### Step 1.2: Initialize Bun in Project
```bash
# Remove node_modules and lock files
rm -rf node_modules pnpm-lock.yaml

# Install dependencies with Bun
bun install
```

### Phase 2: Configuration Updates

#### Step 2.1: Update package.json
- Remove `packageManager` field (pnpm specific)
- Update scripts to use `bun` instead of `npm`/`tsx`
- Remove esbuild build complexity (use Bun's bundler)

#### Step 2.2: Update/Create bunfig.toml (optional)
Create Bun-specific configuration for bundling options.

#### Step 2.3: Update tsconfig.json
Bun has native TypeScript support, but tsconfig.json should be updated for Bun's module resolution.

### Phase 3: Script Migration

#### Step 3.1: Development Scripts
| Current | Bun Equivalent |
|---------|----------------|
| `tsx src/cli.ts` | `bun run src/cli.ts` |
| `npm run build && node ./bin/pinglink` | `bun run src/cli.ts` or `bun build` |

#### Step 3.2: Build Scripts
Replace esbuild with Bun's built-in bundler:
```bash
# Current (esbuild)
esbuild src/cli.ts --bundle --platform=node --format=esm --outfile=dist/cli.js --minify ...

# Bun equivalent
bun build src/cli.ts --outdir=dist --target=bun --minify
```

### Phase 4: Binary/Entry Point Updates

#### Step 4.1: Update bin/pinglink
Change shebang and execution method:
```javascript
#!/usr/bin/env bun
import '../src/cli.ts';
```

### Phase 5: Code Changes (if needed)

Based on compatibility analysis, no source code changes should be required. All Node.js APIs used are fully supported by Bun.

---

## 4. Configuration Changes

### 4.1 package.json Changes

```diff
{
  "name": "pinglink",
  "version": "1.0.0",
  "main": "dist/index.js",
+ "module": "src/index.ts",
  "bin": {
    "pinglink": "./bin/pinglink"
  },
  "scripts": {
-   "build": "esbuild src/cli.ts --bundle --platform=node --format=esm --outfile=dist/cli.js --minify --external:blessed --external:term.js --external:pty.js --banner:js=\"import { createRequire } from 'module'; const require = createRequire(import.meta.url);\" && esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --minify --external:blessed --external:term.js --external:pty.js --banner:js=\"import { createRequire } from 'module'; const require = createRequire(import.meta.url);\"",
+   "build": "bun build src/cli.ts --outfile=dist/cli.js --target=bun --minify --external=blessed --external=term.js --external=pty.js && bun build src/index.ts --outfile=dist/index.js --target=bun --minify --external=blessed --external=term.js --external=pty.js",
-   "dev": "tsx src/cli.ts",
+   "dev": "bun run src/cli.ts",
-   "dev:watch": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js --watch",
+   "dev:watch": "bun run --watch src/cli.ts",
-   "start": "npm run build && node ./bin/pinglink",
+   "start": "bun run src/cli.ts",
-   "ping": "tsx src/cli.ts",
+   "ping": "bun run src/cli.ts",
-   "ping:google": "tsx src/cli.ts 8.8.8.8",
+   "ping:google": "bun run src/cli.ts 8.8.8.8",
-   "ping:cloudflare": "tsx src/cli.ts 1.1.1.1",
+   "ping:cloudflare": "bun run src/cli.ts 1.1.1.1",
-   "ping:demo": "tsx src/cli.ts 8.8.8.8 --count 20 --interval 500",
+   "ping:demo": "bun run src/cli.ts 8.8.8.8 --count 20 --interval 500",
-   "ping:quiet": "tsx src/cli.ts --quiet",
+   "ping:quiet": "bun run src/cli.ts --quiet",
-   "ping:detailed": "tsx src/cli.ts --detailed",
+   "ping:detailed": "bun run src/cli.ts --detailed",
    "test": "echo \"Error: no test specified\" && exit 1",
    "lint": "eslint src/**/*.ts",
-   "type-check": "tsc --noEmit",
+   "type-check": "bun run tsc --noEmit",
    "clean": "rm -rf dist/",
-   "prepare": "npm run build",
+   "prepare": "bun run build",
-   "install-global": "npm run build && npm link"
+   "install-global": "bun run build && bun link"
  },
  ...
  "type": "module",
  "devDependencies": {
    "@types/node": "^24.3.0",
+   "@types/bun": "latest",
    "@typescript-eslint/eslint-plugin": "^8.41.0",
    "@typescript-eslint/parser": "^8.41.0",
-   "esbuild": "^0.25.9",
    "eslint": "^9.34.0",
-   "ts-node": "^10.9.2",
-   "tsx": "^4.20.5",
    "typescript": "^5.9.2"
  },
- "packageManager": "pnpm@10.14.0+sha512.ad27a79641b49c3e481a16a805baa71817a04bbe06a38d17e60e2eaee83f6a146c6a688125f5792e48dd5ba30e7da52a5cda4c3992b9ccf333f9ce223af84748"
}
```

### 4.2 tsconfig.json Changes

```diff
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
-   "module": "esnext",
+   "module": "ESNext",
    "target": "es2022",
-   "lib": ["es2022"],
+   "lib": ["ESNext"],
-   "types": ["node"],
+   "types": ["bun-types", "node"],
-   "moduleResolution": "node",
+   "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4.3 bin/pinglink Changes

```diff
-#!/usr/bin/env node
-
-import('../dist/cli.js').catch(err => {
-  console.error('Failed to start PingLink:', err);
-  process.exit(1);
-});
+#!/usr/bin/env bun
+import '../src/cli.ts';
```

### 4.4 New File: bunfig.toml (optional)

```toml
[install]
# Use exact versions for reproducibility
exact = true

[bundle]
# Default bundle settings
target = "bun"
minify = true
```

---

## 5. Dependency Analysis

### Dependencies to Keep
| Package | Reason |
|---------|--------|
| `commander` | CLI argument parsing - works perfectly with Bun |
| `chalk` | Terminal colors - ESM compatible |
| `cli-cursor` | Cursor control - ESM compatible |
| `blessed` | Terminal UI - CommonJS but Bun compatible |
| `@types/blessed` | Type definitions |

### Dev Dependencies to Remove
| Package | Reason |
|---------|--------|
| `esbuild` | Replaced by Bun's bundler |
| `tsx` | Replaced by Bun's native TS support |
| `ts-node` | Replaced by Bun's native TS support |

### Dev Dependencies to Add
| Package | Reason |
|---------|--------|
| `@types/bun` | Bun-specific type definitions |

### Dev Dependencies to Keep
| Package | Reason |
|---------|--------|
| `typescript` | Type checking (tsc --noEmit) |
| `eslint` | Linting |
| `@typescript-eslint/*` | TypeScript ESLint support |
| `@types/node` | Node.js types (still needed for compatibility) |

---

## 6. Risk Assessment

### Low Risk
| Item | Mitigation |
|------|------------|
| commander.js compatibility | Well-tested with Bun, no changes needed |
| chalk compatibility | Pure ESM, fully compatible |
| Basic Node.js APIs | Bun has excellent Node.js compatibility |

### Medium Risk
| Item | Mitigation |
|------|------------|
| blessed package | Test thoroughly; fallback to simple renderer if issues |
| TTY edge cases | Test on multiple terminal emulators |
| Signal handling | Verify SIGINT/SIGTERM behavior matches Node.js |

### Considerations
| Item | Notes |
|------|-------|
| Cross-platform spawning | Test `ping` command execution on macOS, Linux, Windows |
| Audio playback | Test `afplay`, `paplay`, `aplay` spawning on each platform |

---

## 7. Testing Strategy

### 7.1 Functionality Tests

Run each test after migration:

```bash
# Basic ping functionality
bun run ping

# Different hosts
bun run ping:google
bun run ping:cloudflare

# Demo mode (count limited)
bun run ping:demo

# Different view modes
bun run src/cli.ts --simple
bun run src/cli.ts --detailed
bun run src/cli.ts --quiet

# Sound features
bun run src/cli.ts --sound
bun run src/cli.ts --no-sound
bun run src/cli.ts --frequency-sound

# Time views
bun run src/cli.ts --view 5m
bun run src/cli.ts --view 1h

# Build and run from dist
bun run build
bun run ./dist/cli.js
```

### 7.2 Performance Comparison

Measure and compare:
- Startup time: `time bun run src/cli.ts --help` vs `time tsx src/cli.ts --help`
- Memory usage during operation
- Build time: `time bun run build` vs `time npm run build`

### 7.3 Terminal UI Tests

Verify in multiple terminals:
- [ ] iTerm2
- [ ] Terminal.app
- [ ] VS Code integrated terminal
- [ ] tmux/screen sessions

Check for:
- [ ] Correct character rendering (·, ∙, ▪, ■, □)
- [ ] Color display
- [ ] Cursor visibility
- [ ] Screen clearing
- [ ] Scroll behavior

### 7.4 Signal Handling Tests

```bash
# Test Ctrl+C handling
bun run src/cli.ts
# Press Ctrl+C - should exit cleanly

# Test terminal restoration
bun run src/cli.ts
# Press Ctrl+C - terminal should be restored to normal state
```

---

## 8. Rollback Plan

If migration fails, rollback is straightforward:

### Immediate Rollback
```bash
# Switch back to main branch
git checkout main

# Reinstall with pnpm
pnpm install

# Verify working
pnpm run start
```

### Partial Rollback (keep Bun for dev, Node for prod)
If Bun works for development but not production builds:
1. Keep `bun run src/cli.ts` for development
2. Restore esbuild for production builds
3. Use `node ./bin/pinglink` for production execution

---

## Migration Checklist

### Pre-Migration
- [ ] Ensure all tests pass on Node.js
- [ ] Create feature branch (`feature/bun-migration`)
- [ ] Document current performance metrics

### Migration
- [ ] Install Bun globally
- [ ] Remove node_modules and pnpm-lock.yaml
- [ ] Update package.json scripts and dependencies
- [ ] Update tsconfig.json
- [ ] Update bin/pinglink shebang
- [ ] Run `bun install`
- [ ] Create bunfig.toml (optional)

### Post-Migration
- [ ] Run all functionality tests
- [ ] Compare performance metrics
- [ ] Test on multiple terminals
- [ ] Test signal handling
- [ ] Test build output
- [ ] Update CLAUDE.md with new commands
- [ ] Update README.md with Bun instructions

### Merge
- [ ] Create pull request
- [ ] Review changes
- [ ] Merge to main

---

## Appendix: Quick Reference

### Command Mapping

| Action | Before (Node/pnpm) | After (Bun) |
|--------|-------------------|-------------|
| Install deps | `pnpm install` | `bun install` |
| Dev mode | `pnpm run dev` | `bun run dev` |
| Run directly | `tsx src/cli.ts` | `bun src/cli.ts` |
| Build | `pnpm run build` | `bun run build` |
| Type check | `pnpm run type-check` | `bun run type-check` |
| Lint | `pnpm run lint` | `bun run lint` |
| Global install | `npm link` | `bun link` |

### Useful Bun Commands

```bash
# Run TypeScript directly
bun run src/cli.ts

# Run with watch mode
bun run --watch src/cli.ts

# Build for production
bun build src/cli.ts --outfile=dist/cli.js --target=bun --minify

# Check Bun version
bun --version

# Upgrade Bun
bun upgrade
```
