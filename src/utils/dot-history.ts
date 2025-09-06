import type { PingResult } from '../types/index.js';
import { categorizeLatency, LatencyCategory, COLOR_SCHEMES, RESET_COLOR } from './color-schemes.js';

export interface Dot {
  char: string;
  colorCode: string;
  ping: PingResult;
}

export class DotHistory {
  private history: Dot[] = [];
  private writeCount: number = 0;
  private capacity: number;
  private graphWidth: number;
  private graphHeight: number;
  private precomputedGlyphs: Map<string, string> = new Map();

  constructor(width: number, height: number) {
    this.graphWidth = width;
    this.graphHeight = height;
    this.capacity = width * height;
    this.history = new Array(this.capacity);
    this.precomputeGlyphs();
  }

  private precomputeGlyphs(): void {
    const { default: colors } = COLOR_SCHEMES;
    
    const glyphMap: Record<LatencyCategory, string> = {
      [LatencyCategory.EXCELLENT]: '·',
      [LatencyCategory.GOOD]: '∙', 
      [LatencyCategory.FAIR]: '▪',
      [LatencyCategory.POOR]: '■',
      [LatencyCategory.VERY_POOR]: '■',
      [LatencyCategory.FAILED]: '□'
    };

    const colorMap: Record<LatencyCategory, string> = {
      [LatencyCategory.EXCELLENT]: colors.excellent,
      [LatencyCategory.GOOD]: colors.good,
      [LatencyCategory.FAIR]: colors.fair,
      [LatencyCategory.POOR]: colors.poor,
      [LatencyCategory.VERY_POOR]: colors.verypoor,
      [LatencyCategory.FAILED]: colors.failed
    };

    Object.values(LatencyCategory).forEach(category => {
      const char = glyphMap[category];
      const color = colorMap[category];
      this.precomputedGlyphs.set(category, `${color}${char}${RESET_COLOR}`);
    });
  }

  public addPing(ping: PingResult): Dot {
    const category = ping.success 
      ? categorizeLatency(ping.latency)
      : LatencyCategory.FAILED;
    
    const coloredGlyph = this.precomputedGlyphs.get(category) || '?';
    const char = coloredGlyph.match(/[·∙▪■□]/)?.[0] || '?';
    
    const dot: Dot = {
      char,
      colorCode: coloredGlyph,
      ping
    };

    const index = this.writeCount % this.capacity;
    this.history[index] = dot;
    this.writeCount++;

    return dot;
  }

  public getCurrentPosition(): { col: number; row: number; justWrapped: boolean } {
    const col = (this.writeCount - 1) % this.graphWidth;
    const row = Math.floor((this.writeCount - 1) / this.graphWidth) % this.graphHeight;
    const justWrapped = col === this.graphWidth - 1 && this.writeCount > 1;
    
    return { col, row, justWrapped };
  }

  public isFull(): boolean {
    return this.writeCount >= this.capacity;
  }

  public getWriteCount(): number {
    return this.writeCount;
  }

  public getLastDots(count: number): Dot[] {
    const result: Dot[] = [];
    const actualCount = Math.min(count, this.writeCount, this.capacity);
    
    for (let i = actualCount - 1; i >= 0; i--) {
      const index = (this.writeCount - 1 - i) % this.capacity;
      if (this.history[index]) {
        result.unshift(this.history[index]);
      }
    }
    
    return result;
  }

  public getAllDots(): Dot[] {
    return this.getLastDots(this.capacity);
  }

  public resize(newWidth: number, newHeight: number): void {
    const oldCapacity = this.capacity;
    const oldDots = this.getAllDots();
    
    this.graphWidth = newWidth;
    this.graphHeight = newHeight;
    this.capacity = newWidth * newHeight;
    this.history = new Array(this.capacity);
    this.writeCount = 0;

    const dotsToKeep = Math.min(oldDots.length, this.capacity);
    const startIndex = Math.max(0, oldDots.length - dotsToKeep);
    
    for (let i = startIndex; i < oldDots.length; i++) {
      const index = this.writeCount % this.capacity;
      this.history[index] = oldDots[i];
      this.writeCount++;
    }
  }

  public clear(): void {
    this.history = new Array(this.capacity);
    this.writeCount = 0;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getDimensions(): { width: number; height: number } {
    return { width: this.graphWidth, height: this.graphHeight };
  }
}