import blessed from 'blessed';
import type { PingResult, PingStats } from '../types/index.js';
import { categorizeLatency, LatencyCategory } from '../utils/color-schemes.js';
import { formatTime } from '../utils/time-utils.js';

type Renderable = {
  timestamp: string;
  text: string;
};

export class DashboardRenderer {
  private screen: blessed.Widgets.Screen | null = null;
  private headerBox: blessed.Widgets.BoxElement | null = null;
  private chartBox: blessed.Widgets.BoxElement | null = null;
  private statsBox: blessed.Widgets.BoxElement | null = null;
  private historyBox: blessed.Widgets.BoxElement | null = null;
  private eventsBox: blessed.Widgets.BoxElement | null = null;
  private footerBox: blessed.Widgets.BoxElement | null = null;

  private readonly host: string;
  private readonly interval: number;
  private readonly timeout: number;

  private pingData: PingResult[] = [];
  private lastStats: PingStats | null = null;
  private eventFeed: Renderable[] = [];
  private wasOffline = false;

  private readonly maxDataPoints = 2000;
  private readonly maxEvents = 200;
  private readonly historyRows = 14;

  constructor(host: string, interval: number, timeout: number) {
    this.host = host;
    this.interval = interval;
    this.timeout = timeout;

    if (!process.stdout.isTTY) {
      console.log(`PingLink dashboard disabled (non-interactive terminal). Monitoring ${host}...`);
      return;
    }

    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: `PingLink - ${host}`
    });

    this.buildWidgets();
    this.bindKeys();
    this.layoutWidgets();
    this.renderAll();

    this.screen.on('resize', () => {
      this.layoutWidgets();
      this.renderAll();
    });
  }

  private buildWidgets(): void {
    if (!this.screen) return;

    this.headerBox = blessed.box({
      parent: this.screen,
      tags: true,
      border: 'line',
      style: {
        fg: 'white',
        border: { fg: 'cyan' }
      }
    });

    this.chartBox = blessed.box({
      parent: this.screen,
      tags: true,
      border: 'line',
      label: ' Latency Chart ',
      style: {
        fg: 'white',
        border: { fg: 'blue' }
      }
    });

    this.statsBox = blessed.box({
      parent: this.screen,
      tags: true,
      border: 'line',
      label: ' Live Stats ',
      style: {
        fg: 'white',
        border: { fg: 'green' }
      },
      scrollable: true
    });

    this.historyBox = blessed.box({
      parent: this.screen,
      tags: true,
      border: 'line',
      label: ' Recent Pings ',
      style: {
        fg: 'white',
        border: { fg: 'magenta' }
      },
      scrollable: true
    });

    this.eventsBox = blessed.box({
      parent: this.screen,
      tags: true,
      border: 'line',
      label: ' Events ',
      style: {
        fg: 'white',
        border: { fg: 'yellow' }
      },
      scrollable: true
    });

    this.footerBox = blessed.box({
      parent: this.screen,
      tags: true,
      style: { fg: 'black', bg: 'white' }
    });
  }

  private bindKeys(): void {
    if (!this.screen) return;

    this.screen.key(['q', 'escape', 'C-c'], () => {
      process.kill(process.pid, 'SIGINT');
    });

    this.screen.key(['r'], () => {
      this.clearData();
      this.pushEvent('System', 'History reset');
      this.renderAll();
    });
  }

  private layoutWidgets(): void {
    if (!this.screen || !this.headerBox || !this.chartBox || !this.statsBox || !this.historyBox || !this.eventsBox || !this.footerBox) {
      return;
    }

    const totalWidth = Number(this.screen.width);
    const totalHeight = Number(this.screen.height);

    const headerHeight = 3;
    const footerHeight = 1;
    const bodyTop = headerHeight;
    const bodyHeight = Math.max(8, totalHeight - headerHeight - footerHeight);
    const leftWidth = Math.max(40, Math.floor(totalWidth * 0.67));
    const rightWidth = Math.max(30, totalWidth - leftWidth);
    const chartHeight = Math.max(8, Math.floor(bodyHeight * 0.62));
    const lowerHeight = Math.max(5, bodyHeight - chartHeight);
    const statsHeight = Math.max(8, Math.floor(bodyHeight * 0.52));

    this.headerBox.top = 0;
    this.headerBox.left = 0;
    this.headerBox.width = totalWidth;
    this.headerBox.height = headerHeight;

    this.chartBox.top = bodyTop;
    this.chartBox.left = 0;
    this.chartBox.width = leftWidth;
    this.chartBox.height = chartHeight;

    this.historyBox.top = bodyTop + chartHeight;
    this.historyBox.left = 0;
    this.historyBox.width = leftWidth;
    this.historyBox.height = lowerHeight;

    this.statsBox.top = bodyTop;
    this.statsBox.left = leftWidth;
    this.statsBox.width = rightWidth;
    this.statsBox.height = statsHeight;

    this.eventsBox.top = bodyTop + statsHeight;
    this.eventsBox.left = leftWidth;
    this.eventsBox.width = rightWidth;
    this.eventsBox.height = Math.max(4, bodyHeight - statsHeight);

    this.footerBox.top = totalHeight - footerHeight;
    this.footerBox.left = 0;
    this.footerBox.width = totalWidth;
    this.footerBox.height = footerHeight;
  }

  public addPingResult(result: PingResult): void {
    this.pingData.push(result);
    if (this.pingData.length > this.maxDataPoints) {
      this.pingData = this.pingData.slice(-this.maxDataPoints);
    }

    if (!result.success) {
      this.pushEvent('Failure', `${result.error || 'Timeout'} (${this.host})`);
      this.wasOffline = true;
    } else {
      if (this.wasOffline) {
        this.pushEvent('Recovery', `${result.latency?.toFixed(1) || '?'}ms`);
      } else if ((result.latency || 0) >= 250) {
        this.pushEvent('Spike', `${result.latency?.toFixed(1)}ms`);
      }
      this.wasOffline = false;
    }

    this.renderChart();
    this.renderHistory();
    this.renderEvents();
    this.screen?.render();
  }

  public updateStats(stats: PingStats): void {
    this.lastStats = stats;
    this.renderHeader();
    this.renderStats();
    this.renderFooter();
    this.screen?.render();
  }

  public clearData(): void {
    this.pingData = [];
    this.lastStats = null;
    this.eventFeed = [];
    this.wasOffline = false;
    this.renderAll();
  }

  public destroy(): void {
    if (this.screen) {
      this.screen.destroy();
      this.screen = null;
    }
  }

  private renderAll(): void {
    this.renderHeader();
    this.renderChart();
    this.renderStats();
    this.renderHistory();
    this.renderEvents();
    this.renderFooter();
    this.screen?.render();
  }

  private renderHeader(): void {
    if (!this.headerBox) return;

    const latest = this.pingData[this.pingData.length - 1];
    const latestColor = this.latencyColorTag(latest?.latency);
    const latestText = !latest
      ? '{gray-fg}waiting...{/gray-fg}'
      : latest.success
        ? `{${latestColor}}${latest.latency?.toFixed(1)}ms{/${latestColor}}`
        : '{red-fg}FAILED{/red-fg}';

    this.headerBox.setContent(
      `{center}{bold}PingLink Dashboard{/bold}  {cyan-fg}${this.host}{/cyan-fg}  ` +
      `Interval ${this.interval}ms | Timeout ${this.timeout}ms | Latest ${latestText}{/center}`
    );
  }

  private renderChart(): void {
    if (!this.chartBox) return;

    const innerWidth = Math.max(14, Number(this.chartBox.width) - 2);
    const innerHeight = Math.max(4, Number(this.chartBox.height) - 2);
    const yLabelWidth = 5;
    const width = Math.max(8, innerWidth - yLabelWidth);
    const height = Math.max(3, innerHeight - 1);

    if (this.pingData.length === 0) {
      this.chartBox.setContent('{center}{gray-fg}Waiting for first ping...{/gray-fg}{/center}');
      return;
    }

    const points = this.pingData.slice(-width);
    const successLatencies = points.filter((point) => point.success && typeof point.latency === 'number').map((point) => point.latency as number);
    const maxObserved = successLatencies.length > 0 ? Math.max(...successLatencies) : 100;
    const maxScale = Math.max(100, Math.min(1200, Math.ceil(maxObserved * 1.2)));

    const grid: string[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => ' '));

    points.forEach((point, x) => {
      if (!point.success || point.latency === undefined) {
        grid[height - 1][x] = '{red-fg}×{/red-fg}';
        return;
      }

      const normalized = Math.max(0, Math.min(1, point.latency / maxScale));
      const barHeight = Math.max(1, Math.round(normalized * (height - 1)));
      const colorTag = this.latencyColorTag(point.latency);

      for (let i = 0; i < barHeight; i++) {
        const y = height - 1 - i;
        if (y >= 0 && y < height) {
          grid[y][x] = `{${colorTag}}█{/${colorTag}}`;
        }
      }
    });

    const labelRows = new Set([0, Math.floor(height / 2), height - 1]);
    const lines = grid.map((row, idx) => {
      if (labelRows.has(idx)) {
        const level = Math.round(((height - 1 - idx) / Math.max(1, height - 1)) * maxScale);
        const leftLabel = level.toString().padStart(4, ' ');
        return `{gray-fg}${leftLabel}│{/gray-fg}` + row.join('');
      }
      return '{gray-fg}    │{/gray-fg}' + row.join('');
    });

    const lossCount = points.filter((point) => !point.success).length;
    lines.push(`{gray-fg}win=${points.length} scale=0-${maxScale}ms fail=${lossCount}{/gray-fg}`);

    this.chartBox.setContent(lines.join('\n'));
  }

  private renderStats(): void {
    if (!this.statsBox) return;

    const stats = this.lastStats;
    if (!stats) {
      this.statsBox.setContent('{center}{gray-fg}Collecting stats...{/gray-fg}{/center}');
      return;
    }

    const successRate = (100 - stats.packetLoss).toFixed(1);
    const jitter = this.calculateJitter();
    const healthBar = this.makeBar(Math.max(0, Math.min(100, 100 - stats.packetLoss)), 20);

    const content = [
      `{bold}Runtime{/bold}: ${stats.elapsedTime}`,
      `{bold}Total Pings{/bold}: ${stats.totalPings}`,
      `{bold}Success Rate{/bold}: {green-fg}${successRate}%{/green-fg}`,
      `{bold}Packet Loss{/bold}: {red-fg}${stats.packetLoss.toFixed(1)}%{/red-fg}`,
      `{bold}Average{/bold}: ${this.paintLatency(stats.averageLatency)}`,
      `{bold}Minimum{/bold}: ${this.paintLatency(stats.minLatency)}`,
      `{bold}Maximum{/bold}: ${this.paintLatency(stats.maxLatency)}`,
      `{bold}Jitter{/bold}: ${this.paintLatency(jitter)}`,
      '',
      '{bold}Link Health{/bold}',
      healthBar
    ];

    this.statsBox.setContent(content.join('\n'));
  }

  private renderHistory(): void {
    if (!this.historyBox) return;

    if (this.pingData.length === 0) {
      this.historyBox.setContent('{center}{gray-fg}No samples yet{/gray-fg}{/center}');
      return;
    }

    const recent = this.pingData.slice(-this.historyRows).reverse();
    const rows = recent.map((point) => {
      const ts = formatTime(point.timestamp);
      if (!point.success || point.latency === undefined) {
        return `{gray-fg}${ts}{/gray-fg}  {red-fg}FAIL{/red-fg}  {white-fg}${point.error || 'Timeout'}{/white-fg}`;
      }

      return `{gray-fg}${ts}{/gray-fg}  ${this.paintLatency(point.latency)}`;
    });

    this.historyBox.setContent(rows.join('\n'));
  }

  private renderEvents(): void {
    if (!this.eventsBox) return;

    if (this.eventFeed.length === 0) {
      this.eventsBox.setContent('{center}{gray-fg}No events yet{/gray-fg}{/center}');
      return;
    }

    const recent = this.eventFeed.slice(-12);
    const content = recent.map((event) => `${event.timestamp} ${event.text}`);
    this.eventsBox.setContent(content.join('\n'));
  }

  private renderFooter(): void {
    if (!this.footerBox) return;

    this.footerBox.setContent(
      ' q/Ctrl+C quit | r reset view | ' +
      '{green-fg}█ <50ms{/green-fg} ' +
      '{yellow-fg}█ <100ms{/yellow-fg} ' +
      '{cyan-fg}█ <200ms{/cyan-fg} ' +
      '{red-fg}█ >=200ms{/red-fg} ' +
      '{white-fg}× fail{/white-fg}'
    );
  }

  private pushEvent(type: 'Failure' | 'Recovery' | 'Spike' | 'System', text: string): void {
    const timestamp = `{gray-fg}${formatTime(new Date())}{/gray-fg}`;
    const color = type === 'Failure' ? 'red-fg' : type === 'Recovery' ? 'green-fg' : type === 'Spike' ? 'yellow-fg' : 'cyan-fg';
    this.eventFeed.push({
      timestamp,
      text: `{${color}}[${type}]{/${color}} ${text}`
    });

    if (this.eventFeed.length > this.maxEvents) {
      this.eventFeed = this.eventFeed.slice(-this.maxEvents);
    }
  }

  private paintLatency(latency?: number): string {
    if (latency === undefined || !Number.isFinite(latency) || latency <= 0) {
      return '{gray-fg}-{/gray-fg}';
    }

    const colorTag = this.latencyColorTag(latency);
    return `{${colorTag}}${latency.toFixed(1)}ms{/${colorTag}}`;
  }

  private latencyColorTag(latency?: number): string {
    switch (categorizeLatency(latency)) {
      case LatencyCategory.EXCELLENT:
        return 'green-fg';
      case LatencyCategory.GOOD:
        return 'yellow-fg';
      case LatencyCategory.FAIR:
        return 'cyan-fg';
      case LatencyCategory.POOR:
      case LatencyCategory.VERY_POOR:
        return 'red-fg';
      case LatencyCategory.FAILED:
      default:
        return 'white-fg';
    }
  }

  private makeBar(percent: number, width: number): string {
    const clamped = Math.max(0, Math.min(100, percent));
    const fill = Math.round((clamped / 100) * width);
    const empty = Math.max(0, width - fill);
    const color = clamped >= 95 ? 'green-fg' : clamped >= 80 ? 'yellow-fg' : 'red-fg';
    return `{${color}}${'█'.repeat(fill)}{/${color}}{gray-fg}${'░'.repeat(empty)}{/gray-fg} ${clamped.toFixed(1)}%`;
  }

  private calculateJitter(): number {
    const successful = this.pingData
      .filter((point) => point.success && typeof point.latency === 'number')
      .map((point) => point.latency as number)
      .slice(-40);

    if (successful.length < 2) {
      return 0;
    }

    let totalDelta = 0;
    for (let i = 1; i < successful.length; i++) {
      totalDelta += Math.abs(successful[i] - successful[i - 1]);
    }

    return totalDelta / (successful.length - 1);
  }
}
