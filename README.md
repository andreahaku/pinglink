# 🔗 PingLink

A sophisticated command-line ping monitoring tool that provides real-time visual feedback of network connectivity with time-based graphical representation and comprehensive statistics.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

## ✨ Features

- 🎨 **Visual Terminal Interface**: Color-coded blocks representing ping status over time
- ⏱️ **Real-time Monitoring**: Continuous ping monitoring with live terminal updates
- 📊 **Comprehensive Statistics**: Track packet loss, average latency, min/max values
- 🎵 **Audio Alerts**: Sound notifications for ping failures (planned)
- 🕐 **Time-Based Views**: Multiple time scales (5min, 10min, 15min, 1hr, etc.)
- 💾 **Historical Data**: Persist and display ping history across sessions (planned)
- 🖥️ **Cross-Platform**: Support for macOS, Linux, and Windows
- ⚙️ **Configurable**: Customizable intervals, timeouts, and display options

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pinglink

# Install dependencies
npm install

# Start monitoring (defaults to 1.1.1.1 - Cloudflare DNS)
npm run ping
```

### Basic Usage

```bash
# Monitor default host (1.1.1.1)
npm run ping

# Monitor Google DNS
npm run ping:google

# Quick demo with fast pings
npm run ping:demo

# Monitor a custom host
npm run dev example.com

# Monitor with custom settings
npm run dev 8.8.8.8 --interval 500 --count 20 --timeout 3000
```

## 📖 Usage

### Command Line Interface

```bash
Usage: pinglink [options] [host]

Arguments:
  host                   Host to ping (IP address or hostname) (default: "1.1.1.1")

Options:
  -V, --version          output the version number
  -v, --view <time>      Time view (5m|10m|15m|1h|6h|1d) (default: "15m")
  -i, --interval <ms>    Ping interval in milliseconds (default: "1000")
  -t, --timeout <ms>     Ping timeout in milliseconds (default: "5000")
  -s, --sound            Enable failure sound alerts (default: false)
  -f, --frequency-sound  Enable frequency-based sound feedback (default: false)
  -c, --count <number>   Stop after N pings (0 = infinite) (default: "0")
  -o, --output <file>    Save results to file
  -q, --quiet            Minimize output, show only failures (default: false)
  -d, --detailed         Show detailed statistics view (default: false)
  --no-color             Disable colored output
  --config <file>        Load custom configuration file
  -h, --help             display help for command
```

### Examples

```bash
# Basic ping monitoring
npm run ping

# Monitor specific host with custom interval
npm run dev google.com --interval 2000

# Quiet mode (show only failures)
npm run ping:quiet

# Limited ping count with fast interval
npm run dev 192.168.1.1 --count 50 --interval 200

# Monitor with longer timeout for slow networks
npm run dev remote-server.com --timeout 10000
```

## 🎨 Visual Output

PingLink provides color-coded real-time feedback:

```
🔗 PingLink v1.0.0 - Starting ping monitor for 8.8.8.8
⚙️  Interval: 1000ms | Timeout: 5000ms | View: 15m
───────────────────────────────────────────────────────────────
🚀 Starting continuous ping to 8.8.8.8...

[11:49:18] ● 8.8.8.8 - 30.3ms | Avg: 30.3ms | Loss: 0.0%
[11:49:19] ● 8.8.8.8 - 24.8ms | Avg: 27.6ms | Loss: 0.0%
[11:49:20] ○ 8.8.8.8 - TIMEOUT | Avg: 27.6ms | Loss: 33.3%

📊 Final Statistics:
   Total pings: 3
   Successful: 2 (66.7%)
   Failed: 1 (33.3%)
   Average latency: 27.6ms
   Min/Max latency: 24.8ms / 30.3ms

👋 Goodbye!
```

### Color Scheme

- 🟢 **Green (●)**: Excellent latency (< 50ms)
- 🟡 **Yellow (●)**: Good latency (50-100ms)  
- 🟠 **Orange (●)**: Fair latency (100-200ms)
- 🔴 **Red (●)**: Poor latency (200-500ms)
- 🟣 **Magenta (●)**: Very poor latency (> 500ms)
- ⚪ **White (○)**: Failed ping / Timeout

## 📝 Available Scripts

### Development
```bash
npm run dev              # Run in development mode (default host)
npm run dev:watch        # Watch mode for development
npm run build            # Build for production
npm run type-check       # TypeScript type checking
npm run lint             # Code linting
npm run clean            # Clean build files
```

### Quick Ping Commands
```bash
npm run ping             # Ping default (1.1.1.1)
npm run ping:google      # Ping Google DNS (8.8.8.8)
npm run ping:cloudflare  # Ping Cloudflare DNS (1.1.1.1)
npm run ping:demo        # Demo mode (10 pings, 500ms interval)
npm run ping:quiet       # Quiet mode (failures only)
npm run ping:detailed    # Detailed statistics view
```

### Distribution
```bash
npm start                # Build and run production binary
npm run install-global   # Install globally as 'pinglink'
```

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- TypeScript 5.0+
- npm or yarn

### Setup

```bash
# Clone and install
git clone <repository-url>
cd pinglink
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Run tests and type checking
npm run type-check
npm run lint
```

### Project Structure

```
pinglink/
├── src/
│   ├── core/
│   │   ├── ping-engine.ts          # Core ping functionality
│   │   └── data-manager.ts         # History storage and retrieval
│   ├── ui/                         # Terminal UI components (planned)
│   ├── utils/
│   │   ├── time-utils.ts          # Time calculations
│   │   └── color-schemes.ts       # Color palettes
│   ├── types/
│   │   └── index.ts               # TypeScript definitions
│   ├── cli.ts                     # CLI entry point
│   └── index.ts                   # Main application
├── bin/
│   └── pinglink                   # Executable script
├── dist/                          # Compiled output
└── config/                        # Configuration files (planned)
```

## 🔧 Configuration

### Command Line Options

- **Interval**: `--interval 1000` (milliseconds between pings)
- **Timeout**: `--timeout 5000` (ping timeout in milliseconds)
- **Count**: `--count 100` (stop after N pings, 0 = infinite)
- **View**: `--view 15m` (time scale: 5m, 10m, 15m, 1h, 6h, 1d)
- **Quiet**: `--quiet` (show only failures)
- **Detailed**: `--detailed` (enhanced statistics)

### Default Configuration

```json
{
  "host": "1.1.1.1",
  "interval": 1000,
  "timeout": 5000,
  "view": "15m",
  "sound": false,
  "quiet": false,
  "detailed": false
}
```

## 🌐 Supported Platforms

- ✅ **macOS** - Full support
- ✅ **Linux** - Full support  
- ✅ **Windows** - Full support
- ✅ **Docker** - Works in containers

## 📊 Statistics

PingLink tracks comprehensive network statistics:

- **Total Pings**: Count of all ping attempts
- **Success Rate**: Percentage of successful pings
- **Packet Loss**: Percentage of failed pings
- **Average Latency**: Mean response time
- **Min/Max Latency**: Fastest and slowest response times
- **Real-time Updates**: Live statistics during monitoring

## 🚧 Roadmap

### Phase 2 - Visual Interface (In Progress)
- [ ] Advanced terminal UI with blessed
- [ ] Time-based block visualization
- [ ] Interactive dashboard
- [ ] Responsive layout

### Phase 3 - Time Management (Planned)
- [ ] Historical data persistence
- [ ] Multiple time view switching
- [ ] Data aggregation system
- [ ] Export functionality

### Phase 4 - Audio System (Planned)  
- [ ] Sound alerts for failures
- [ ] Frequency-based audio feedback
- [ ] Configurable audio settings

### Phase 5 - Advanced Features (Planned)
- [ ] Multiple target monitoring
- [ ] Configuration file system
- [ ] Network topology discovery
- [ ] Performance optimizations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js) for CLI parsing
- Styled with [Chalk](https://github.com/chalk/chalk) for terminal colors
- Powered by [TypeScript](https://www.typescriptlang.org/) and [Node.js](https://nodejs.org/)

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/username/pinglink/issues) page
2. Create a new issue with detailed information
3. Include your OS, Node.js version, and command used

---

**Happy Pinging!** 🏓✨