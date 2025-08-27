import type { ColorScheme } from '../types/index.js';
import { LatencyCategory } from '../types/index.js';

export const COLOR_SCHEMES = {
  default: {
    excellent: '\u001b[32m', // Green
    good: '\u001b[33m',      // Yellow  
    fair: '\u001b[38;5;208m', // Orange
    poor: '\u001b[31m',      // Red
    verypoor: '\u001b[35m',  // Magenta
    failed: '\u001b[37m'     // White/Gray
  },
  monochrome: {
    excellent: '',
    good: '',
    fair: '',
    poor: '',
    verypoor: '',
    failed: ''
  }
};

export const RESET_COLOR = '\u001b[0m';

export function categorizeLatency(latency?: number): LatencyCategory {
  if (latency === undefined) {
    return LatencyCategory.FAILED;
  }
  
  if (latency < 50) return LatencyCategory.EXCELLENT;
  if (latency < 100) return LatencyCategory.GOOD;
  if (latency < 200) return LatencyCategory.FAIR;
  if (latency < 500) return LatencyCategory.POOR;
  return LatencyCategory.VERY_POOR;
}

export function getColorForLatency(latency?: number, scheme: ColorScheme = COLOR_SCHEMES.default): string {
  const category = categorizeLatency(latency);
  return scheme[category];
}

export function formatLatencyWithColor(latency?: number, scheme: ColorScheme = COLOR_SCHEMES.default): string {
  if (latency === undefined) {
    return `${scheme.failed}TIMEOUT${RESET_COLOR}`;
  }
  
  const color = getColorForLatency(latency, scheme);
  return `${color}${latency.toFixed(1)}ms${RESET_COLOR}`;
}

export function getStatusBlock(success: boolean, latency?: number, scheme: ColorScheme = COLOR_SCHEMES.default): string {
  if (success && latency !== undefined) {
    const color = getColorForLatency(latency, scheme);
    return `${color}●${RESET_COLOR}`;
  } else {
    return `${scheme.failed}○${RESET_COLOR}`;
  }
}