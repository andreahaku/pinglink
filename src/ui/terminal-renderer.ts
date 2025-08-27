import blessed from 'blessed';
import type { PingResult, PingStats } from '../types/index.js';
import { categorizeLatency, LatencyCategory } from '../utils/color-schemes.js';
import { formatTime } from '../utils/time-utils.js';

export class TerminalRenderer {
  private screen: blessed.Widgets.Screen;
  private headerBox!: blessed.Widgets.BoxElement;
  private legendBox!: blessed.Widgets.BoxElement;
  private graphBox!: blessed.Widgets.BoxElement;
  private statsBox!: blessed.Widgets.BoxElement;
  private pingData: PingResult[] = [];
  private maxDataPoints: number = 200;
  private host: string;
  private interval: number;
  private timeout: number;

  constructor(host: string, interval: number, timeout: number) {
    this.host = host;
    this.interval = interval;
    this.timeout = timeout;
    
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'PingLink - Visual Ping Monitor'
    });

    this.setupUI();
    this.bindKeys();
  }

  private setupUI(): void {
    // Header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: `{center}{bold}PingLink v1.0.0 - Monitoring ${this.host}{/bold}{/center}\n{center}Interval: ${this.interval}ms | Timeout: ${this.timeout}ms | Press 'q' to quit{/center}`,
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      }
    });

    // Legend
    this.legendBox = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: 3,
      content: this.generateLegend(),
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      }
    });

    // Graph area
    this.graphBox = blessed.box({
      top: 6,
      left: 0,
      width: '100%',
      height: '100%-9',
      scrollable: false,
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      }
    });

    // Statistics
    this.statsBox = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      }
    });

    this.screen.append(this.headerBox);
    this.screen.append(this.legendBox);
    this.screen.append(this.graphBox);
    this.screen.append(this.statsBox);
  }

  private generateLegend(): string {
    return '{center}' +
      '{green-fg}0-50{/green-fg} ' +
      '{yellow-fg}50-100{/yellow-fg} ' +
      '{red-fg}100-200{/red-fg} ' +
      '{magenta-fg}200-500{/magenta-fg} ' +
      '{blue-fg}>500ms{/blue-fg} ' +
      '{white-fg}FAIL{/white-fg} ' +
      '(Latency in ms)' +
      '{/center}';
  }

  private bindKeys(): void {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      process.exit(0);
    });

    this.screen.key(['r'], () => {
      this.clearData();
    });
  }

  public addPingResult(result: PingResult): void {
    this.pingData.push(result);
    
    // Keep only the most recent data points
    if (this.pingData.length > this.maxDataPoints) {
      this.pingData = this.pingData.slice(-this.maxDataPoints);
    }
    
    this.updateDisplay();
  }

  public updateStats(stats: PingStats): void {
    const content = `{center}` +
      `Total: ${stats.totalPings} | ` +
      `Success: ${stats.successfulPings} ({green-fg}${(100 - stats.packetLoss).toFixed(1)}%{/green-fg}) | ` +
      `Loss: ${stats.failedPings} ({red-fg}${stats.packetLoss.toFixed(1)}%{/red-fg}) | ` +
      `Avg: {yellow-fg}${stats.averageLatency.toFixed(1)}ms{/yellow-fg}`;

    if (stats.averageLatency > 0) {
      const additionalStats = ` | Min: {green-fg}${stats.minLatency.toFixed(1)}ms{/green-fg} | Max: {red-fg}${stats.maxLatency.toFixed(1)}ms{/red-fg}`;
      this.statsBox.setContent(content + additionalStats + `{/center}`);
    } else {
      this.statsBox.setContent(content + `{/center}`);
    }

    this.screen.render();
  }

  private updateDisplay(): void {
    const graphContent = this.generateGraph();
    this.graphBox.setContent(graphContent);
    this.screen.render();
  }

  private generateGraph(): string {
    if (this.pingData.length === 0) {
      return '{center}Waiting for ping data...{/center}';
    }

    const graphWidth = (this.graphBox.width as number) - 4; // Account for borders
    const graphHeight = (this.graphBox.height as number) - 4; // Account for borders
    
    // Create a grid of blocks
    const blocks: string[][] = [];
    
    // Calculate how many data points we can show
    const visibleDataPoints = Math.min(this.pingData.length, graphWidth);
    const recentData = this.pingData.slice(-visibleDataPoints);
    
    // Initialize grid with empty spaces
    for (let row = 0; row < graphHeight; row++) {
      blocks[row] = new Array(graphWidth).fill(' ');
    }

    // Fill the grid with ping data
    recentData.forEach((ping, index) => {
      const col = index;
      if (col < graphWidth) {
        const blockColor = this.getBlockColor(ping);
        const blockChar = ping.success ? '█' : '▒';
        
        // Fill column from bottom up
        for (let row = graphHeight - 1; row >= 0; row--) {
          blocks[row][col] = `{${blockColor}}${blockChar}{/${blockColor}}`;
        }
      }
    });

    // Convert grid to string
    let result = '';
    for (let row = 0; row < graphHeight; row++) {
      result += blocks[row].join('') + '\n';
    }

    return result;
  }

  private getBlockColor(ping: PingResult): string {
    if (!ping.success) {
      return 'white-fg';
    }

    const category = categorizeLatency(ping.latency);
    
    switch (category) {
      case LatencyCategory.EXCELLENT:
        return 'green-fg';
      case LatencyCategory.GOOD:
        return 'yellow-fg';
      case LatencyCategory.FAIR:
        return 'red-fg';
      case LatencyCategory.POOR:
        return 'magenta-fg';
      case LatencyCategory.VERY_POOR:
        return 'blue-fg';
      default:
        return 'white-fg';
    }
  }

  public clearData(): void {
    this.pingData = [];
    this.updateDisplay();
  }

  public render(): void {
    this.screen.render();
  }

  public destroy(): void {
    this.screen.destroy();
  }
}