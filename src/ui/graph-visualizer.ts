import type { PingResult, AggregatedData } from '../types/index.js';
import { categorizeLatency, LatencyCategory } from '../utils/color-schemes.js';

export interface GraphConfig {
  width: number;
  height: number;
  maxLatency: number;
  showGrid: boolean;
  compactMode: boolean;
}

export class GraphVisualizer {
  private config: GraphConfig;
  private pingHistory: PingResult[] = [];
  private maxHistorySize: number = 1000;

  constructor(config: GraphConfig) {
    this.config = config;
  }

  public addPingResult(result: PingResult): void {
    this.pingHistory.push(result);
    
    if (this.pingHistory.length > this.maxHistorySize) {
      this.pingHistory = this.pingHistory.slice(-this.maxHistorySize);
    }
  }

  public generatePrettyPingGraph(): string {
    const { width, height } = this.config;
    const visibleData = this.pingHistory.slice(-width);
    
    if (visibleData.length === 0) {
      return this.generateEmptyGraph();
    }

    let graph = this.generateLatencyScale() + '\n';
    
    // Generate the main graph area
    for (let row = 0; row < height; row++) {
      let line = '';
      
      for (let col = 0; col < width; col++) {
        const pingIndex = col;
        
        if (pingIndex < visibleData.length) {
          const ping = visibleData[pingIndex];
          const block = this.getLatencyBlock(ping, row, height);
          line += block;
        } else {
          line += ' ';
        }
      }
      
      graph += line + '\n';
    }

    return graph;
  }

  private generateLatencyScale(): string {
    const { width } = this.config;
    let scale = '';
    
    // Generate scale markers every 10 characters
    for (let i = 0; i < width; i++) {
      if (i % 10 === 0 && i > 0) {
        const marker = i.toString();
        scale += marker.padStart(10, ' ').slice(-10);
      }
    }
    
    // Add latency legend
    const legend = '0   10   20   30   40   50   60   70   80   90  100  110  120  130  140  150  160  170  180  190  200+ ms';
    return legend.substring(0, width);
  }

  private getLatencyBlock(ping: PingResult, row: number, totalRows: number): string {
    if (!ping.success) {
      // Failed ping - show as red block or X
      return this.colorizeBlock('▓', 'red');
    }

    const latency = ping.latency || 0;
    const category = categorizeLatency(latency);
    
    // Determine if this row should show a block based on latency
    const latencyHeight = this.calculateLatencyHeight(latency, totalRows);
    const shouldShowBlock = row >= (totalRows - latencyHeight);
    
    if (shouldShowBlock) {
      const color = this.getLatencyColor(category);
      return this.colorizeBlock('█', color);
    }
    
    return ' ';
  }

  private calculateLatencyHeight(latency: number, totalRows: number): number {
    // Map latency to height (0ms = 1 row, 200ms+ = full height)
    const maxLatencyForScale = 200;
    const normalizedLatency = Math.min(latency, maxLatencyForScale) / maxLatencyForScale;
    return Math.max(1, Math.ceil(normalizedLatency * totalRows));
  }

  private getLatencyColor(category: LatencyCategory): string {
    switch (category) {
      case LatencyCategory.EXCELLENT:
        return 'green';
      case LatencyCategory.GOOD:
        return 'yellow';
      case LatencyCategory.FAIR:
        return 'cyan';
      case LatencyCategory.POOR:
        return 'red';
      case LatencyCategory.VERY_POOR:
        return 'magenta';
      case LatencyCategory.FAILED:
      default:
        return 'white';
    }
  }

  private colorizeBlock(char: string, color: string): string {
    const colorCodes: { [key: string]: string } = {
      green: '\u001b[42m',
      yellow: '\u001b[43m',
      cyan: '\u001b[46m',
      red: '\u001b[41m',
      magenta: '\u001b[45m',
      white: '\u001b[47m',
      reset: '\u001b[0m'
    };

    return `${colorCodes[color] || ''}${char}${colorCodes.reset}`;
  }

  private generateEmptyGraph(): string {
    let graph = this.generateLatencyScale() + '\n';
    
    for (let row = 0; row < this.config.height; row++) {
      graph += ' '.repeat(this.config.width) + '\n';
    }
    
    return graph;
  }

  public generateCompactGraph(): string {
    const visibleData = this.pingHistory.slice(-this.config.width);
    let graph = '';
    
    visibleData.forEach(ping => {
      if (ping.success) {
        const category = categorizeLatency(ping.latency);
        const color = this.getLatencyColor(category);
        graph += this.colorizeBlock('●', color);
      } else {
        graph += this.colorizeBlock('○', 'red');
      }
    });
    
    return graph;
  }

  public getLatestPings(count: number): PingResult[] {
    return this.pingHistory.slice(-count);
  }

  public clearHistory(): void {
    this.pingHistory = [];
  }

  public updateConfig(config: Partial<GraphConfig>): void {
    this.config = { ...this.config, ...config };
  }
}