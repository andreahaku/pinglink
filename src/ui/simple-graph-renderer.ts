import type { PingResult, PingStats } from '../types/index.js';
import { categorizeLatency, LatencyCategory, COLOR_SCHEMES, RESET_COLOR } from '../utils/color-schemes.js';
import { formatTime } from '../utils/time-utils.js';

export class SimpleGraphRenderer {
  private pingHistory: PingResult[] = [];
  private maxHistorySize: number = 200;
  private host: string;
  private interval: number;
  private timeout: number;
  private currentStats: PingStats | null = null;
  private isFirstRender: boolean = true;
  private headerHeight: number = 5;

  constructor(host: string, interval: number, timeout: number) {
    this.host = host;
    this.interval = interval;
    this.timeout = timeout;
    this.initializeDisplay();
  }

  private initializeDisplay(): void {
    console.clear();
    this.showStaticHeader();
    this.isFirstRender = false;
  }

  private showStaticHeader(): void {
    const { default: colors } = COLOR_SCHEMES;
    
    console.log(`🔗 PingLink v1.0.0 - Visual Ping Monitor (Running continuously)`);
    console.log(`Target: ${this.host} | Interval: ${this.interval}ms | Timeout: ${this.timeout}ms | Press Ctrl+C to quit`);
    console.log();
    console.log(
      `${colors.excellent}0-50${RESET_COLOR} ` +
      `${colors.good}50-100${RESET_COLOR} ` +
      `${colors.fair}100-200${RESET_COLOR} ` +
      `${colors.poor}200-500${RESET_COLOR} ` +
      `${colors.verypoor}>500${RESET_COLOR} ` +
      `${colors.failed}FAIL${RESET_COLOR} (ms)`
    );
    console.log();
  }

  public addPingResult(result: PingResult): void {
    this.pingHistory.push(result);
    
    if (this.pingHistory.length > this.maxHistorySize) {
      this.pingHistory = this.pingHistory.slice(-this.maxHistorySize);
    }
  }

  public updateStats(stats: PingStats): void {
    this.currentStats = stats;
    this.renderUpdate();
  }

  private renderUpdate(): void {
    if (this.pingHistory.length === 0) return;

    // For now, use a simple approach - clear and redraw everything
    console.clear();
    this.showStaticHeader();
    
    // Render ping blocks
    this.renderPingBlocks();
    
    // Show latest ping result
    const latest = this.pingHistory[this.pingHistory.length - 1];
    this.renderLatestPing(latest);
    
    // Show statistics
    if (this.currentStats) {
      this.renderStats();
    }
  }

  private renderPingBlocks(): void {
    const terminalWidth = process.stdout.columns || 80;
    const blocksPerRow = terminalWidth;
    
    let output = '';
    for (let i = 0; i < this.pingHistory.length; i++) {
      output += this.getPingBlock(this.pingHistory[i]);
      
      // Add newline when row is full
      if ((i + 1) % blocksPerRow === 0) {
        output += '\n';
      }
    }
    
    // Add final newline if needed
    if (this.pingHistory.length % blocksPerRow !== 0) {
      output += '\n';
    }
    
    console.log(output.trim());
  }

  private getPingBlock(ping: PingResult): string {
    const { default: colors } = COLOR_SCHEMES;
    
    if (!ping.success) {
      return `${colors.failed}▓${RESET_COLOR}`;
    }

    const category = categorizeLatency(ping.latency);
    
    switch (category) {
      case LatencyCategory.EXCELLENT:
        return `${colors.excellent}█${RESET_COLOR}`;
      case LatencyCategory.GOOD:
        return `${colors.good}█${RESET_COLOR}`;
      case LatencyCategory.FAIR:
        return `${colors.fair}█${RESET_COLOR}`;
      case LatencyCategory.POOR:
        return `${colors.poor}█${RESET_COLOR}`;
      case LatencyCategory.VERY_POOR:
        return `${colors.verypoor}█${RESET_COLOR}`;
      default:
        return `${colors.failed}▓${RESET_COLOR}`;
    }
  }

  private renderLatestPing(ping: PingResult): void {
    const timestamp = formatTime(ping.timestamp);
    const { default: colors } = COLOR_SCHEMES;
    
    console.log(); // Empty line
    
    if (ping.success) {
      const category = categorizeLatency(ping.latency);
      let color = colors.excellent;
      
      switch (category) {
        case LatencyCategory.GOOD:
          color = colors.good;
          break;
        case LatencyCategory.FAIR:
          color = colors.fair;
          break;
        case LatencyCategory.POOR:
          color = colors.poor;
          break;
        case LatencyCategory.VERY_POOR:
          color = colors.verypoor;
          break;
      }
      
      console.log(`[${timestamp}] ${this.host}: ${color}${ping.latency?.toFixed(1)}ms${RESET_COLOR}`);
    } else {
      console.log(`[${timestamp}] ${this.host}: ${colors.failed}${ping.error || 'TIMEOUT'}${RESET_COLOR}`);
    }
  }

  private renderStats(): void {
    if (!this.currentStats) return;
    
    const stats = this.currentStats;
    const { default: colors } = COLOR_SCHEMES;
    
    let statsLine = 
      `Total: ${stats.totalPings} | ` +
      `Success: ${colors.excellent}${(100 - stats.packetLoss).toFixed(1)}%${RESET_COLOR} | ` +
      `Loss: ${colors.failed}${stats.packetLoss.toFixed(1)}%${RESET_COLOR} | ` +
      `Avg: ${colors.good}${stats.averageLatency.toFixed(1)}ms${RESET_COLOR}`;
    
    if (stats.averageLatency > 0) {
      statsLine += 
        ` | Min: ${colors.excellent}${stats.minLatency.toFixed(1)}ms${RESET_COLOR}` +
        ` | Max: ${colors.poor}${stats.maxLatency.toFixed(1)}ms${RESET_COLOR}`;
    }
    
    console.log(statsLine);
  }

  public clearScreen(): void {
    console.clear();
    this.initializeDisplay();
  }

  public destroy(): void {
    console.log('\n👋 Visual monitor ended.');
  }
}