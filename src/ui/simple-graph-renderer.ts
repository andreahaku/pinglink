import type { PingResult, PingStats } from '../types/index.js';
import { categorizeLatency, LatencyCategory, COLOR_SCHEMES, RESET_COLOR } from '../utils/color-schemes.js';
import { formatTime } from '../utils/time-utils.js';
import { TerminalControl } from '../utils/terminal-control.js';
import { DotHistory } from '../utils/dot-history.js';

export class SimpleGraphRenderer {
  private dotHistory: DotHistory;
  private host: string;
  private interval: number;
  private timeout: number;
  private currentStats: PingStats | null = null;
  private isFirstRender: boolean = true;
  private headerHeight: number = 5;
  private graphTop: number = 6;
  private graphHeight: number;
  private graphWidth: number;
  private isInitialized: boolean = false;

  constructor(host: string, interval: number, timeout: number) {
    this.host = host;
    this.interval = interval;
    this.timeout = timeout;
    
    const { width, height } = TerminalControl.getTerminalSize();
    this.graphWidth = width;
    this.graphHeight = Math.max(1, height - 8); // Reserve space for header and stats
    
    this.dotHistory = new DotHistory(this.graphWidth, this.graphHeight);
    
    if (TerminalControl.isTTY()) {
      TerminalControl.setupCleanExit();
      this.initializeDisplay();
      this.setupResizeHandler();
    } else {
      this.initializeFallbackDisplay();
    }
  }

  private initializeDisplay(): void {
    if (!this.isInitialized) {
      TerminalControl.enterAltScreen();
      TerminalControl.hideCursor();
      this.isInitialized = true;
    }
    
    this.drawStaticHeader();
    this.isFirstRender = false;
  }

  private initializeFallbackDisplay(): void {
    console.clear();
    this.showStaticHeader();
    this.isFirstRender = false;
  }

  private setupResizeHandler(): void {
    process.stdout.on('resize', () => {
      const { width, height } = TerminalControl.getTerminalSize();
      const newGraphHeight = Math.max(1, height - 8);
      
      if (width !== this.graphWidth || newGraphHeight !== this.graphHeight) {
        this.graphWidth = width;
        this.graphHeight = newGraphHeight;
        this.dotHistory.resize(width, newGraphHeight);
        this.redrawAfterResize();
      }
    });
  }

  private drawStaticHeader(): void {
    const { default: colors } = COLOR_SCHEMES;
    
    let output = '';
    output += TerminalControl.moveTo(1, 1);
    output += `🔗 PingLink v1.0.0 - Visual Ping Monitor (Running continuously)`;
    output += TerminalControl.moveTo(2, 1);
    output += `Target: ${this.host} | Interval: ${this.interval}ms | Timeout: ${this.timeout}ms | Press Ctrl+C to quit`;
    output += TerminalControl.moveTo(4, 1);
    output += `${colors.excellent}· 0-50${RESET_COLOR} ` +
             `${colors.good}∙ 50-100${RESET_COLOR} ` +
             `${colors.fair}▪ 100-200${RESET_COLOR} ` +
             `${colors.poor}■ 200-500${RESET_COLOR} ` +
             `${colors.verypoor}■ >500${RESET_COLOR} ` +
             `${colors.failed}□ FAIL${RESET_COLOR} (ms)`;
    
    process.stdout.write(output);
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
    const dot = this.dotHistory.addPing(result);
    
    if (TerminalControl.isTTY()) {
      this.renderIncrementalUpdate(dot);
    }
  }

  public updateStats(stats: PingStats): void {
    this.currentStats = stats;
    
    if (TerminalControl.isTTY()) {
      this.updateStatsDisplay(stats);
    } else {
      this.renderFallbackUpdate();
    }
  }

  private renderIncrementalUpdate(dot: { char: string; colorCode: string; ping: PingResult }): void {
    const writeCount = this.dotHistory.getWriteCount();
    const { col, row, justWrapped } = this.dotHistory.getCurrentPosition();
    
    let output = '';
    
    if (writeCount <= this.dotHistory.getCapacity()) {
      const displayRow = this.graphTop + row;
      const displayCol = col + 1;
      output += TerminalControl.moveTo(displayRow, displayCol);
      output += dot.colorCode;
    } else {
      if (col === 0 && writeCount > this.dotHistory.getCapacity()) {
        output += TerminalControl.setScrollRegion(this.graphTop, this.graphTop + this.graphHeight - 1);
        output += TerminalControl.scrollUp(1);
        output += TerminalControl.moveTo(this.graphTop + this.graphHeight - 1, 1);
        output += dot.colorCode;
      } else {
        output += TerminalControl.moveTo(this.graphTop + this.graphHeight - 1, col + 1);
        output += dot.colorCode;
      }
    }

    process.stdout.write(output);
    this.renderLatestPing(dot.ping);
  }

  private redrawAfterResize(): void {
    if (!TerminalControl.isTTY()) return;
    
    process.stdout.write(TerminalControl.clearScreen());
    this.drawStaticHeader();
    
    const scrollRegion = TerminalControl.setScrollRegion(this.graphTop, this.graphTop + this.graphHeight - 1);
    process.stdout.write(scrollRegion);
    
    const allDots = this.dotHistory.getAllDots();
    this.replayDotsForResize(allDots);
  }

  private replayDotsForResize(dots: any[]): void {
    let output = '';
    
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const col = i % this.graphWidth;
      const row = Math.floor(i / this.graphWidth);
      
      if (row < this.graphHeight) {
        output += TerminalControl.moveTo(this.graphTop + row, col + 1);
        output += dot.colorCode;
      } else {
        if (col === 0) {
          output += TerminalControl.scrollUp(1);
          output += TerminalControl.moveTo(this.graphTop + this.graphHeight - 1, 1);
        } else {
          output += TerminalControl.moveTo(this.graphTop + this.graphHeight - 1, col + 1);
        }
        output += dot.colorCode;
      }
    }
    
    process.stdout.write(output);
  }

  private updateStatsDisplay(stats: PingStats): void {
    const terminalHeight = TerminalControl.getTerminalSize().height;
    const statsRow = terminalHeight - 1;
    
    let output = '';
    output += TerminalControl.moveTo(statsRow, 1);
    output += TerminalControl.clearLine();
    
    const { default: colors } = COLOR_SCHEMES;
    const statsContent = 
      `Runtime: ${colors.good}${stats.elapsedTime}${RESET_COLOR} | ` +
      `Total: ${stats.totalPings} | ` +
      `Success: ${colors.excellent}${(100 - stats.packetLoss).toFixed(1)}%${RESET_COLOR} | ` +
      `Loss: ${colors.failed}${stats.packetLoss.toFixed(1)}%${RESET_COLOR} | ` +
      `Avg: ${colors.good}${stats.averageLatency.toFixed(1)}ms${RESET_COLOR}`;

    let finalStats = statsContent;
    if (stats.averageLatency > 0) {
      finalStats += 
        ` | Min: ${colors.excellent}${stats.minLatency.toFixed(1)}ms${RESET_COLOR}` +
        ` | Max: ${colors.poor}${stats.maxLatency.toFixed(1)}ms${RESET_COLOR}`;
    }

    output += finalStats;
    process.stdout.write(output);
  }

  private renderFallbackUpdate(): void {
    if (this.dotHistory.getWriteCount() === 0) return;

    console.clear();
    this.showStaticHeader();
    
    this.renderPingBlocksFallback();
    
    const allDots = this.dotHistory.getAllDots();
    if (allDots.length > 0) {
      const latest = allDots[allDots.length - 1];
      this.renderLatestPing(latest.ping);
    }
    
    if (this.currentStats) {
      this.renderStats();
    }
  }

  private renderPingBlocksFallback(): void {
    const allDots = this.dotHistory.getAllDots();
    if (allDots.length === 0) return;
    
    let output = '';
    let currentCol = 0;
    
    for (const dot of allDots) {
      output += dot.colorCode;
      currentCol++;
      
      if (currentCol >= this.graphWidth) {
        output += '\n';
        currentCol = 0;
      }
    }
    
    if (currentCol > 0) {
      output += '\n';
    }
    
    console.log(output);
  }


  private renderLatestPing(ping: PingResult): void {
    if (!TerminalControl.isTTY()) {
      this.renderLatestPingFallback(ping);
      return;
    }
    
    const terminalHeight = TerminalControl.getTerminalSize().height;
    const pingRow = terminalHeight - 2;
    
    const timestamp = formatTime(ping.timestamp);
    const { default: colors } = COLOR_SCHEMES;
    
    let output = '';
    output += TerminalControl.moveTo(pingRow, 1);
    output += TerminalControl.clearLine();
    
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
      
      output += `[${timestamp}] ${this.host}: ${color}${ping.latency?.toFixed(1)}ms${RESET_COLOR}`;
    } else {
      output += `[${timestamp}] ${this.host}: ${colors.failed}${ping.error || 'TIMEOUT'}${RESET_COLOR}`;
    }
    
    process.stdout.write(output);
  }

  private renderLatestPingFallback(ping: PingResult): void {
    const timestamp = formatTime(ping.timestamp);
    const { default: colors } = COLOR_SCHEMES;
    
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
    if (TerminalControl.isTTY()) {
      this.dotHistory.clear();
      this.redrawAfterResize();
    } else {
      console.clear();
      this.initializeFallbackDisplay();
    }
  }

  public destroy(): void {
    if (TerminalControl.isTTY()) {
      TerminalControl.showCursor();
      TerminalControl.exitAltScreen();
    }
    console.log('\n👋 Visual monitor ended.');
  }
}