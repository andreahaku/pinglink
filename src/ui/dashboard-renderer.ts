import blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import type { Widgets } from 'blessed';
import type {
  LineWidget,
  BarWidget,
  GaugeWidget,
  LogWidget,
  LineData,
} from 'blessed-contrib';
import type { PingResult, PingStats, Renderer } from '../types/index.js';
import { formatTime } from '../utils/time-utils.js';

const MAX_CHART_POINTS = 60;

const LATENCY_BUCKETS = [
  { label: '0-50', min: 0, max: 50 },
  { label: '50-100', min: 50, max: 100 },
  { label: '100-200', min: 100, max: 200 },
  { label: '200-500', min: 200, max: 500 },
  { label: '500+', min: 500, max: Infinity },
];

export class DashboardRenderer implements Renderer {
  private screen: Widgets.Screen;
  private lineChart: LineWidget;
  private statsBox: Widgets.BoxElement;
  private gauge: GaugeWidget;
  private barChart: BarWidget;
  private eventLog: LogWidget;
  private header: Widgets.BoxElement;
  private footer: Widgets.BoxElement;

  private latencyHistory: number[] = [];
  private timeLabels: string[] = [];
  private bucketCounts: number[] = [0, 0, 0, 0, 0];
  private isPaused = false;
  private host: string;
  private onQuit: (() => void) | null = null;

  constructor(host: string, _interval: number, _timeout: number) {
    this.host = host;

    this.screen = blessed.screen({
      smartCSR: true,
      title: `PingLink - ${host}`,
      fullUnicode: true,
    });

    // -- Header (row 0, full width) --
    this.header = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: `{center}{bold}PingLink v1.0.0{/bold} -- Monitoring {green-fg}${host}{/green-fg}{/center}`,
      tags: true,
      style: {
        fg: 'white',
        bg: 'default',
        border: { fg: 'cyan' },
      },
      border: { type: 'line' },
    });
    this.screen.append(this.header);

    // -- Footer (bottom, full width) --
    this.footer = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '{center}[q] Quit  [c] Clear  [p] Pause/Resume  [Esc] Quit{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'default',
        border: { fg: 'cyan' },
      },
      border: { type: 'line' },
    });
    this.screen.append(this.footer);

    // Use a grid for the main content area (between header and footer)
    const g = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
    });

    // -- Line Chart (top-left, 7 rows x 8 cols) --
    this.lineChart = g.set(2, 0, 7, 8, contrib.line, {
      label: ' Latency (ms) ',
      style: {
        line: 'green',
        text: 'white',
        baseline: 'white',
        border: { fg: 'cyan' },
      },
      xLabelPadding: 3,
      xPadding: 5,
      showLegend: true,
      wholeNumbersOnly: false,
      minY: 0,
    }) as LineWidget;

    // -- Stats Panel (top-right, 4 rows x 4 cols) --
    this.statsBox = g.set(2, 8, 4, 4, blessed.box, {
      label: ' Statistics ',
      tags: true,
      content: '{center}Waiting for data...{/center}',
      style: {
        fg: 'white',
        border: { fg: 'cyan' },
      },
      padding: { left: 1, right: 1 },
    }) as Widgets.BoxElement;

    // -- Gauge (right middle, 3 rows x 4 cols) --
    this.gauge = g.set(6, 8, 3, 4, contrib.gauge, {
      label: ' Success Rate ',
      stroke: 'green',
      fill: 'white',
      style: {
        border: { fg: 'cyan' },
      },
    }) as GaugeWidget;

    // -- Bar Chart (bottom-left, 3 rows x 8 cols) --
    this.barChart = g.set(9, 0, 2, 8, contrib.bar, {
      label: ' Latency Distribution ',
      barWidth: 8,
      barSpacing: 4,
      xOffset: 0,
      maxHeight: 50,
      barBgColor: 'green',
      style: {
        border: { fg: 'cyan' },
      },
    }) as BarWidget;

    // -- Event Log (bottom-right, 3 rows x 4 cols) --
    this.eventLog = g.set(9, 8, 2, 4, contrib.log, {
      label: ' Event Log ',
      tags: true,
      style: {
        fg: 'white',
        border: { fg: 'cyan' },
      },
      bufferLength: 50,
      scrollable: true,
      scrollbar: {
        ch: ' ',
        fg: 'blue',
        track: { fg: 'grey' },
      },
    }) as LogWidget;

    this.setupKeyboard();
    this.screen.render();
  }

  private setupKeyboard(): void {
    this.screen.key(['q', 'escape'], () => {
      if (this.onQuit) {
        this.onQuit();
      } else {
        this.destroy();
        process.exit(0);
      }
    });

    this.screen.key(['c', 'C'], () => {
      this.clear();
    });

    this.screen.key(['p', 'P'], () => {
      this.isPaused = !this.isPaused;
      const status = this.isPaused ? '{red-fg}PAUSED{/red-fg}' : '{green-fg}LIVE{/green-fg}';
      this.footer.setContent(`{center}[q] Quit  [c] Clear  [p] Pause/Resume  [Esc] Quit  |  ${status}{/center}`);
      this.screen.render();
    });
  }

  public setOnQuit(fn: () => void): void {
    this.onQuit = fn;
  }

  public addPingResult(result: PingResult): void {
    if (this.isPaused) return;

    const timeLabel = formatTime(result.timestamp);

    // Update latency history for line chart
    const latency = result.success ? (result.latency ?? 0) : 0;
    this.latencyHistory.push(latency);
    this.timeLabels.push(timeLabel);

    if (this.latencyHistory.length > MAX_CHART_POINTS) {
      this.latencyHistory.shift();
      this.timeLabels.shift();
    }

    // Update line chart
    const lineData: LineData[] = [
      {
        title: 'Latency',
        x: this.timeLabels,
        y: this.latencyHistory,
        style: { line: 'green' },
      },
    ];

    // Add average line if we have data
    if (this.latencyHistory.length > 1) {
      const successLatencies = this.latencyHistory.filter((l) => l > 0);
      if (successLatencies.length > 0) {
        const avg =
          successLatencies.reduce((a, b) => a + b, 0) / successLatencies.length;
        lineData.push({
          title: `Avg (${avg.toFixed(0)}ms)`,
          x: this.timeLabels,
          y: this.timeLabels.map(() => avg),
          style: { line: 'yellow' },
        });
      }
    }

    this.lineChart.setData(lineData);

    // Update bar chart distribution
    if (result.success && result.latency !== undefined) {
      for (let i = 0; i < LATENCY_BUCKETS.length; i++) {
        const bucket = LATENCY_BUCKETS[i];
        if (result.latency >= bucket.min && result.latency < bucket.max) {
          this.bucketCounts[i]++;
          break;
        }
      }
    }

    this.barChart.setData({
      titles: LATENCY_BUCKETS.map((b) => b.label),
      data: this.bucketCounts,
    });

    // Update event log
    if (result.success) {
      const color = this.getLatencyColor(result.latency ?? 0);
      this.eventLog.log(
        `${timeLabel} {green-fg}OK{/green-fg}  {${color}-fg}${result.latency?.toFixed(1)}ms{/${color}-fg}`
      );
    } else {
      this.eventLog.log(
        `${timeLabel} {red-fg}FAIL{/red-fg} ${result.error ?? 'timeout'}`
      );
    }

    this.screen.render();
  }

  public updateStats(stats: PingStats): void {
    if (this.isPaused) return;

    const successRate = stats.totalPings > 0 ? 100 - stats.packetLoss : 0;

    // Update stats box
    const lines = [
      `{bold}Total:{/bold}    ${stats.totalPings.toLocaleString()}`,
      `{bold}Success:{/bold}  {green-fg}${stats.successfulPings.toLocaleString()}{/green-fg}`,
      `{bold}Failed:{/bold}   {red-fg}${stats.failedPings.toLocaleString()}{/red-fg}`,
      `{bold}Rate:{/bold}     ${this.colorRate(successRate)}`,
      '',
      `{bold}Avg:{/bold}      ${stats.averageLatency.toFixed(1)}ms`,
      `{bold}Min:{/bold}      {green-fg}${stats.minLatency.toFixed(1)}ms{/green-fg}`,
      `{bold}Max:{/bold}      {red-fg}${stats.maxLatency.toFixed(1)}ms{/red-fg}`,
      '',
      `{bold}Runtime:{/bold}  ${stats.elapsedTime}`,
    ];
    this.statsBox.setContent(lines.join('\n'));

    // Update gauge
    const gaugeColor = successRate >= 99 ? 'green' : successRate >= 95 ? 'yellow' : 'red';
    this.gauge.setStack([{ percent: successRate, stroke: gaugeColor }]);

    this.screen.render();
  }

  public destroy(): void {
    this.screen.destroy();
  }

  private clear(): void {
    this.latencyHistory = [];
    this.timeLabels = [];
    this.bucketCounts = [0, 0, 0, 0, 0];

    this.lineChart.setData([
      { title: 'Latency', x: [], y: [], style: { line: 'green' } },
    ]);
    this.barChart.setData({
      titles: LATENCY_BUCKETS.map((b) => b.label),
      data: [0, 0, 0, 0, 0],
    });
    this.statsBox.setContent('{center}Cleared - waiting for data...{/center}');
    this.gauge.setStack([{ percent: 0, stroke: 'green' }]);

    this.screen.render();
  }

  private getLatencyColor(latency: number): string {
    if (latency <= 50) return 'green';
    if (latency <= 100) return 'yellow';
    if (latency <= 200) return '#ff8800';
    if (latency <= 500) return 'red';
    return 'magenta';
  }

  private colorRate(rate: number): string {
    const formatted = `${rate.toFixed(1)}%`;
    if (rate >= 99) return `{green-fg}${formatted}{/green-fg}`;
    if (rate >= 95) return `{yellow-fg}${formatted}{/yellow-fg}`;
    return `{red-fg}${formatted}{/red-fg}`;
  }
}
