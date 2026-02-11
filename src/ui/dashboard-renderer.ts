import { createElement } from 'react';
import { render, type Instance } from 'ink';
import { Dashboard } from './Dashboard.js';
import type { EventLogEntry, DashboardProps } from './Dashboard.js';
import type { PingResult, PingStats, Renderer } from '../types/index.js';
import { formatTime } from '../utils/time-utils.js';

const MAX_CHART_POINTS = 60;
const MAX_LOG_ENTRIES = 50;

const LATENCY_BUCKETS = [
  { label: '0-50', min: 0, max: 50, color: 'green' },
  { label: '50-100', min: 50, max: 100, color: 'yellow' },
  { label: '100-200', min: 100, max: 200, color: '#ff8800' },
  { label: '200-500', min: 200, max: 500, color: 'red' },
  { label: '500+', min: 500, max: Infinity, color: 'magenta' },
];

export class DashboardRenderer implements Renderer {
  private inkInstance: Instance;
  private latencyHistory: number[] = [];
  private timeLabels: string[] = [];
  private bucketCounts: number[] = [0, 0, 0, 0, 0];
  private currentStats: PingStats | null = null;
  private eventLog: EventLogEntry[] = [];
  private isPaused = false;
  private host: string;
  private onQuit: (() => void) | null = null;
  private nextLogId = 0;

  constructor(host: string, _interval: number, _timeout: number) {
    this.host = host;

    // Bun workaround: useInput requires stdin to be resumed
    // https://github.com/oven-sh/bun/issues/6862
    process.stdin.resume();

    this.inkInstance = render(
      createElement(Dashboard, this.buildProps()),
      { exitOnCtrlC: false },
    );
  }

  private buildProps(): DashboardProps {
    // Compute average line from successful latencies
    const avgHistory: number[] = [];
    if (this.latencyHistory.length > 1) {
      const successLatencies = this.latencyHistory.filter((l) => l > 0);
      if (successLatencies.length > 0) {
        const avg =
          successLatencies.reduce((a, b) => a + b, 0) /
          successLatencies.length;
        avgHistory.push(...this.latencyHistory.map(() => avg));
      }
    }

    return {
      host: this.host,
      latencyHistory: [...this.latencyHistory],
      avgHistory,
      bucketData: LATENCY_BUCKETS.map((b, i) => ({
        label: b.label,
        value: this.bucketCounts[i],
        color: b.color,
      })),
      stats: this.currentStats,
      eventLog: [...this.eventLog],
      isPaused: this.isPaused,
      onQuit: () => {
        if (this.onQuit) {
          this.onQuit();
        } else {
          this.destroy();
          process.exit(0);
        }
      },
      onClear: () => this.clear(),
      onTogglePause: () => {
        this.isPaused = !this.isPaused;
        this.rerender();
      },
    };
  }

  private rerender(): void {
    this.inkInstance.rerender(createElement(Dashboard, this.buildProps()));
  }

  public setOnQuit(fn: () => void): void {
    this.onQuit = fn;
  }

  public addPingResult(result: PingResult): void {
    if (this.isPaused) return;

    const timeLabel = formatTime(result.timestamp);
    const latency = result.success ? (result.latency ?? 0) : 0;

    this.latencyHistory.push(latency);
    this.timeLabels.push(timeLabel);

    if (this.latencyHistory.length > MAX_CHART_POINTS) {
      this.latencyHistory.shift();
      this.timeLabels.shift();
    }

    // Update bucket counts
    if (result.success && result.latency !== undefined) {
      for (let i = 0; i < LATENCY_BUCKETS.length; i++) {
        const bucket = LATENCY_BUCKETS[i];
        if (result.latency >= bucket.min && result.latency < bucket.max) {
          this.bucketCounts[i]++;
          break;
        }
      }
    }

    // Update event log
    this.eventLog.push({
      id: this.nextLogId++,
      time: timeLabel,
      success: result.success,
      latency: result.latency,
      error: result.error,
    });
    if (this.eventLog.length > MAX_LOG_ENTRIES) {
      this.eventLog.shift();
    }

    this.rerender();
  }

  public updateStats(stats: PingStats): void {
    if (this.isPaused) return;
    this.currentStats = stats;
    this.rerender();
  }

  public destroy(): void {
    this.inkInstance.unmount();
  }

  private clear(): void {
    this.latencyHistory = [];
    this.timeLabels = [];
    this.bucketCounts = [0, 0, 0, 0, 0];
    this.currentStats = null;
    this.eventLog = [];
    this.rerender();
  }
}
