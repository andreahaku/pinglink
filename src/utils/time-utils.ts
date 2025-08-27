import type { TimeScale } from '../types/index.js';
import { TimeFrame } from '../types/index.js';

export const TIME_SCALES: Record<TimeFrame, TimeScale> = {
  [TimeFrame.FIVE_MINUTES]: {
    duration: 5,
    bucketSize: 0.1,
    refreshRate: 1000,
    maxDataPoints: 50
  },
  [TimeFrame.TEN_MINUTES]: {
    duration: 10,
    bucketSize: 0.2,
    refreshRate: 2000,
    maxDataPoints: 50
  },
  [TimeFrame.FIFTEEN_MINUTES]: {
    duration: 15,
    bucketSize: 0.3,
    refreshRate: 3000,
    maxDataPoints: 50
  },
  [TimeFrame.ONE_HOUR]: {
    duration: 60,
    bucketSize: 1.2,
    refreshRate: 5000,
    maxDataPoints: 50
  },
  [TimeFrame.SIX_HOURS]: {
    duration: 360,
    bucketSize: 7.2,
    refreshRate: 10000,
    maxDataPoints: 50
  },
  [TimeFrame.ONE_DAY]: {
    duration: 1440,
    bucketSize: 28.8,
    refreshRate: 30000,
    maxDataPoints: 50
  }
};

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes === 0) {
    return 'now';
  } else if (diffMinutes === 1) {
    return '1 min ago';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} mins ago`;
  } else {
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) {
      return '1 hour ago';
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  }
}

export function getTimeScale(timeframe: TimeFrame): TimeScale {
  return TIME_SCALES[timeframe];
}