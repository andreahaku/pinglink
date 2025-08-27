import type { PingResult, AggregatedData, PingStats } from '../types/index.js';
import { TimeFrame } from '../types/index.js';

export class DataManager {
  private results: PingResult[] = [];
  private maxResults: number = 1000;
  private startTime: Date = new Date();

  saveResult(result: PingResult): void {
    this.results.push(result);
    
    // Keep only the most recent results to prevent memory issues
    if (this.results.length > this.maxResults) {
      this.results = this.results.slice(-this.maxResults);
    }
  }

  getResults(timeframe?: TimeFrame): PingResult[] {
    if (!timeframe) {
      return [...this.results];
    }

    const now = new Date();
    const cutoffTime = this.getTimeframeCutoff(now, timeframe);
    
    return this.results.filter(result => result.timestamp >= cutoffTime);
  }

  getLatestResults(count: number): PingResult[] {
    return this.results.slice(-count);
  }

  aggregateResults(results: PingResult[], bucketSize: number): AggregatedData[] {
    if (results.length === 0) return [];

    const buckets = new Map<number, PingResult[]>();
    
    results.forEach(result => {
      const bucketKey = Math.floor(result.timestamp.getTime() / (bucketSize * 60 * 1000));
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(result);
    });

    return Array.from(buckets.entries()).map(([bucketKey, bucketResults]) => {
      const successfulResults = bucketResults.filter(r => r.success && r.latency !== undefined);
      const latencies = successfulResults.map(r => r.latency!);
      
      return {
        timestamp: new Date(bucketKey * bucketSize * 60 * 1000),
        successCount: successfulResults.length,
        failureCount: bucketResults.length - successfulResults.length,
        averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
        minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
        maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0
      };
    }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  calculateStats(results?: PingResult[]): PingStats {
    const data = results || this.results;
    
    if (data.length === 0) {
      return {
        totalPings: 0,
        successfulPings: 0,
        failedPings: 0,
        averageLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        packetLoss: 0,
        startTime: this.startTime,
        elapsedTime: this.formatElapsedTime(new Date())
      };
    }

    const successfulResults = data.filter(r => r.success && r.latency !== undefined);
    const latencies = successfulResults.map(r => r.latency!);
    
    return {
      totalPings: data.length,
      successfulPings: successfulResults.length,
      failedPings: data.length - successfulResults.length,
      averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      packetLoss: data.length > 0 ? ((data.length - successfulResults.length) / data.length) * 100 : 0,
      startTime: this.startTime,
      elapsedTime: this.formatElapsedTime(new Date())
    };
  }

  clearHistory(): void {
    this.results = [];
  }

  getResultsInTimeRange(startTime: Date, endTime: Date): PingResult[] {
    return this.results.filter(result => 
      result.timestamp >= startTime && result.timestamp <= endTime
    );
  }

  private getTimeframeCutoff(now: Date, timeframe: TimeFrame): Date {
    const cutoff = new Date(now);
    
    switch (timeframe) {
      case TimeFrame.FIVE_MINUTES:
        cutoff.setMinutes(cutoff.getMinutes() - 5);
        break;
      case TimeFrame.TEN_MINUTES:
        cutoff.setMinutes(cutoff.getMinutes() - 10);
        break;
      case TimeFrame.FIFTEEN_MINUTES:
        cutoff.setMinutes(cutoff.getMinutes() - 15);
        break;
      case TimeFrame.ONE_HOUR:
        cutoff.setHours(cutoff.getHours() - 1);
        break;
      case TimeFrame.SIX_HOURS:
        cutoff.setHours(cutoff.getHours() - 6);
        break;
      case TimeFrame.ONE_DAY:
        cutoff.setDate(cutoff.getDate() - 1);
        break;
    }
    
    return cutoff;
  }

  private formatElapsedTime(currentTime: Date): string {
    const elapsedMs = currentTime.getTime() - this.startTime.getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}