# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PingLink is a visual ping monitoring CLI tool built with TypeScript and Node.js. It provides real-time network monitoring with terminal-based visualization, audio alerts, and comprehensive statistics tracking.

## Development Commands

### Core Development
- `npm run dev` - Run in development mode (uses tsx)
- `npm run build` - Build for production using esbuild
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint on src/**/*.ts
- `npm run clean` - Remove dist/ directory

### Testing & Quality
- Run `npm run type-check && npm run lint` after any code changes
- No test framework is currently configured (test script exits with error)

### Quick Ping Commands
- `npm run ping` - Ping 1.1.1.1 (default)
- `npm run ping:google` - Ping 8.8.8.8
- `npm run ping:demo` - Demo with 20 pings at 500ms interval
- `npm run dev [host]` - Run with custom host in development

## Architecture

### Core Structure
```
src/
├── core/           # Core functionality
│   ├── ping-engine.ts      # PingEngine class - main ping logic using child_process
│   ├── data-manager.ts     # Data history storage and retrieval
│   └── sound-engine.ts     # Audio alerts and recovery sounds
├── ui/             # User interface components
│   ├── terminal-renderer.ts    # Advanced blessed-based terminal UI
│   ├── simple-graph-renderer.ts # Size-based visual ping display
│   └── graph-visualizer.ts     # Graph visualization components
├── utils/          # Utilities
│   ├── time-utils.ts       # Time calculations and formatting
│   └── color-schemes.ts    # Color palettes and latency categorization
├── types/
│   └── index.ts           # TypeScript interfaces and enums
├── cli.ts                 # Commander.js CLI entry point
└── index.ts              # Main application entry point
```

### Key Classes & Interfaces

#### Core Types (src/types/index.ts)
- `PingResult` - Single ping result with timestamp, success, latency
- `PingConfig` - Configuration interface matching CLI options
- `PingStats` - Aggregated statistics (success rate, packet loss, etc.)
- `TimeFrame` - Enum for time view options (5m, 10m, 15m, 1h, 6h, 1d)
- `LatencyCategory` - Enum for categorizing ping performance

#### Core Classes
- `PingEngine` (src/core/ping-engine.ts) - EventEmitter-based ping execution using child_process
- `TerminalRenderer` (src/ui/terminal-renderer.ts) - blessed-based terminal UI with real-time updates
- Visual system uses size-based symbols that scale with latency (· ∙ ▪ ■ □)

### Build System
- Uses esbuild for bundling with ES modules
- TypeScript target: es2022, module: esnext
- External dependencies: child_process, node:events, blessed, term.js, pty.js
- Binary output: dist/cli.js (main executable)

### Technology Stack
- **CLI**: Commander.js for argument parsing
- **UI**: blessed for terminal interface, chalk for colors
- **Audio**: Built-in sound system for alerts
- **Build**: esbuild, TypeScript, tsx for development
- **Ping**: Uses system ping command via child_process.spawn()

### Visual System Architecture
The visualization uses a tiered symbol system:
- Excellent (0-50ms): `·` (Middle Dot) - Green
- Good (50-100ms): `∙` (Bullet Operator) - Yellow  
- Fair (100-200ms): `▪` (Black Small Square) - Orange
- Poor (200-500ms): `■` (Black Square) - Red
- Very Poor (>500ms): `■` (Black Square) - Purple
- Failed: `□` (White Square) - Gray

## Development Notes

### Package Manager
- Uses pnpm (specified in packageManager field)
- pnpm-lock.yaml is present but gitignored

### Module System
- Pure ES modules (type: "module" in package.json)
- Uses .js imports for TypeScript files (ESM compatibility)
- verbatimModuleSyntax enabled in tsconfig.json

### Platform Support
- Cross-platform ping implementation in PingEngine
- Handles different ping command formats per OS (process.platform)

### Configuration
- CLI options defined in src/cli.ts using Commander.js
- Default host: 1.1.1.1 (Cloudflare DNS)
- Default interval: 1000ms, timeout: 1000ms
- Supports time views from 5 minutes to 1 day