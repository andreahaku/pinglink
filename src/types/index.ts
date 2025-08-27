export interface PingResult {
  timestamp: Date;
  host: string;
  success: boolean;
  latency?: number;
  error?: string;
}

export interface AggregatedData {
  timestamp: Date;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
}

export enum TimeFrame {
  FIVE_MINUTES = '5m',
  TEN_MINUTES = '10m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  SIX_HOURS = '6h',
  ONE_DAY = '1d'
}

export interface TimeScale {
  duration: number;
  bucketSize: number;
  refreshRate: number;
  maxDataPoints: number;
}

export interface PingConfig {
  host: string;
  interval: number;
  timeout: number;
  count: number;
  view: TimeFrame;
  sound: boolean;
  frequencySound: boolean;
  quiet: boolean;
  detailed: boolean;
  visual: boolean;
  simple: boolean;
  output?: string;
}

export interface AppConfig {
  display: {
    defaultView: TimeFrame;
    colorScheme: string;
    refreshRate: number;
    compactMode: boolean;
  };
  network: {
    defaultInterval: number;
    defaultTimeout: number;
    retryAttempts: number;
  };
  audio: {
    enabled: boolean;
    volume: number;
    failureAlert: {
      frequency: number;
      duration: number;
    };
    frequencyMapping: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
      verypoor: number;
    };
  };
  storage: {
    historyPath: string;
    maxHistoryDays: number;
    autoSave: boolean;
  };
}

export interface PingStats {
  totalPings: number;
  successfulPings: number;
  failedPings: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  packetLoss: number;
  startTime: Date;
  elapsedTime: string;
}

export enum LatencyCategory {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  VERY_POOR = 'verypoor',
  FAILED = 'failed'
}

export interface ColorScheme {
  excellent: string;
  good: string;
  fair: string;
  poor: string;
  verypoor: string;
  failed: string;
}