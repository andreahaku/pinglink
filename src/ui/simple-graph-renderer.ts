import type { PingResult, PingStats } from '../types/index.js';
import { categorizeLatency, LatencyCategory, COLOR_SCHEMES, RESET_COLOR } from '../utils/color-schemes.js';
import { formatTime } from '../utils/time-utils.js';

export class SimpleGraphRenderer {
  private pingHistory: PingResult[] = [];
  private maxHistorySize: number;
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
    
    // Calculate maximum history size based on terminal dimensions
    // Use a generous buffer to ensure we have enough history for large terminals
    const terminalHeight = process.stdout.rows || 24;
    const terminalWidth = process.stdout.columns || 80;
    const availableRows = Math.max(1, terminalHeight - 8);
    const blockWidth = 1; // Each block is 1 character
    const blocksPerRow = terminalWidth;
    // Use 3x the display area to ensure smooth scrolling and enough history
    this.maxHistorySize = Math.max(1000, availableRows * blocksPerRow * 3);
    
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
      `${colors.excellent}· 0-50${RESET_COLOR} ` +
      `${colors.good}∙ 50-100${RESET_COLOR} ` +
      `${colors.fair}▪ 100-200${RESET_COLOR} ` +
      `${colors.poor}■ 200-500${RESET_COLOR} ` +
      `${colors.verypoor}■ >500${RESET_COLOR} ` +
      `${colors.failed}□ FAIL${RESET_COLOR} (ms)`
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
    if (this.pingHistory.length === 0) return;
    
    const terminalWidth = process.stdout.columns || 80;
    const terminalHeight = process.stdout.rows || 24;
    const availableRows = Math.max(1, terminalHeight - 8); // Reserve space for header and stats
    
    // Each block is now 1 character wide
    const blockWidth = 1;
    const blocksPerRow = terminalWidth;
    
    let output = '';
    let currentRow = 0;
    
    // Start from the most recent pings that fit in the available space
    const maxBlocksToShow = availableRows * blocksPerRow;
    const startIndex = Math.max(0, this.pingHistory.length - maxBlocksToShow);
    
    for (let i = startIndex; i < this.pingHistory.length; i++) {
      const blockPosition = i - startIndex;
      
      output += this.getPingBlock(this.pingHistory[i]);
      
      // Add newline when row is full
      if ((blockPosition + 1) % blocksPerRow === 0) {
        output += '\n';
        currentRow++;
        
        // Stop if we've filled all available rows
        if (currentRow >= availableRows) {
          break;
        }
      }
    }
    
    console.log(output);
  }

  private getPingBlock(ping: PingResult): string {
    const { default: colors } = COLOR_SCHEMES;
    
    if (!ping.success) {
      return `${colors.failed}□${RESET_COLOR}`; // U+25A1 White Square for failures
    }

    const category = categorizeLatency(ping.latency);
    
    switch (category) {
      case LatencyCategory.EXCELLENT: // 0-50ms
        return `${colors.excellent}·${RESET_COLOR}`; // U+00B7 Middle Dot (smallest)
      case LatencyCategory.GOOD: // 50-100ms
        return `${colors.good}∙${RESET_COLOR}`; // U+2219 Bullet Operator
      case LatencyCategory.FAIR: // 100-200ms
        return `${colors.fair}▪${RESET_COLOR}`; // U+25AA Black Small Square
      case LatencyCategory.POOR: // 200-500ms
        return `${colors.poor}■${RESET_COLOR}`; // U+25A0 Black Square
      case LatencyCategory.VERY_POOR: // >500ms
        return `${colors.verypoor}■${RESET_COLOR}`; // U+25A0 Black Square
      default:
        return `${colors.failed}□${RESET_COLOR}`; // U+25A1 White Square for failures
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
      `Runtime: ${colors.good}${stats.elapsedTime}${RESET_COLOR} | ` +
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