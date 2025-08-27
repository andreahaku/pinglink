import { spawn } from 'child_process';
import type { PingResult } from '../types/index.js';
import { categorizeLatency, LatencyCategory } from '../utils/color-schemes.js';

export interface SoundConfig {
  enabled: boolean;
  volume: number;
  failureAlert: {
    frequency: number;
    duration: number;
  };
  recoveryAlert: {
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
  frequencySoundEnabled: boolean;
}

export class SoundEngine {
  private config: SoundConfig;
  private lastFailureTime: number = 0;
  private failureCooldown: number = 500; // Reduced to 500ms for faster response
  private lastPingSuccess: boolean | null = null; // Track last ping state (null = no previous pings)
  private consecutiveFailures: number = 0; // Count consecutive failures

  constructor(config: SoundConfig) {
    this.config = config;
  }

  public async playFailureAlert(): Promise<void> {
    if (!this.config.enabled) return;

    const now = Date.now();
    if (now - this.lastFailureTime < this.failureCooldown) {
      return; // Prevent spam
    }
    this.lastFailureTime = now;

    // Use immediate terminal bell for fastest response
    process.stdout.write('\u0007');
    
    // Also try system sound in background (non-blocking)
    this.playSystemBeep().catch(() => {
      // Ignore errors, terminal bell already played
    });
  }

  public async playRecoveryAlert(): Promise<void> {
    if (!this.config.enabled) return;

    // Play double terminal bell for recovery (different pattern)
    process.stdout.write('\u0007');
    setTimeout(() => process.stdout.write('\u0007'), 100);
    
    // Also try recovery system sound in background (non-blocking)
    this.playRecoverySystemSound().catch(() => {
      // Ignore errors, terminal bell already played
    });
  }

  public async playLatencySound(result: PingResult): Promise<void> {
    if (!this.config.enabled || !this.config.frequencySoundEnabled) return;
    if (!result.success || result.latency === undefined) return;

    const category = categorizeLatency(result.latency);
    const frequency = this.getFrequencyForCategory(category);

    try {
      await this.playTone(frequency, 100); // Short 100ms tone
    } catch (error) {
      // Silently fail if sound isn't available
    }
  }

  public processResult(result: PingResult): boolean {
    // Returns true if this is a recovery (ping succeeded after failures)
    // Only consider it a recovery if:
    // 1. Current ping is successful
    // 2. Previous ping was a failure (lastPingSuccess === false)
    // 3. We had consecutive failures (> 0)
    const wasRecovery = this.lastPingSuccess === false && result.success && this.consecutiveFailures > 0;
    
    if (result.success) {
      this.consecutiveFailures = 0;
      this.lastPingSuccess = true;
    } else {
      this.consecutiveFailures++;
      this.lastPingSuccess = false;
    }
    
    return wasRecovery;
  }

  private getFrequencyForCategory(category: LatencyCategory): number {
    switch (category) {
      case LatencyCategory.EXCELLENT:
        return this.config.frequencyMapping.excellent;
      case LatencyCategory.GOOD:
        return this.config.frequencyMapping.good;
      case LatencyCategory.FAIR:
        return this.config.frequencyMapping.fair;
      case LatencyCategory.POOR:
        return this.config.frequencyMapping.poor;
      case LatencyCategory.VERY_POOR:
        return this.config.frequencyMapping.verypoor;
      default:
        return 200;
    }
  }

  private async playSystemBeep(): Promise<void> {
    const platform = process.platform;

    switch (platform) {
      case 'darwin': // macOS - use faster, lighter sound
        await this.execCommand('afplay', ['/System/Library/Sounds/Tink.aiff']);
        break;
      case 'linux':
        // Try multiple approaches for better compatibility
        try {
          await this.execCommand('paplay', ['/usr/share/sounds/alsa/Front_Left.wav']);
        } catch {
          try {
            await this.execCommand('aplay', ['/usr/share/sounds/alsa/Front_Left.wav']);
          } catch {
            await this.execCommand('beep', ['-f', '800', '-l', '100']);
          }
        }
        break;
      case 'win32': // Windows - faster method
        await this.execCommand('powershell', ['-c', '[Console]::Beep(800, 100)']);
        break;
      default:
        // Already played terminal bell
        break;
    }
  }

  private async playRecoverySystemSound(): Promise<void> {
    const platform = process.platform;

    switch (platform) {
      case 'darwin': // macOS - use pleasant recovery sound
        await this.execCommand('afplay', ['/System/Library/Sounds/Glass.aiff']);
        break;
      case 'linux':
        // Play positive recovery sound sequence
        try {
          await this.execCommand('beep', ['-f', '600', '-l', '100']);
          await this.execCommand('beep', ['-f', '800', '-l', '100']);
        } catch {
          // Fallback already handled by terminal bell
        }
        break;
      case 'win32': // Windows - pleasant two-tone recovery
        await this.execCommand('powershell', ['-c', '[Console]::Beep(600, 100); [Console]::Beep(800, 100)']);
        break;
      default:
        // Already played terminal bell
        break;
    }
  }

  private async playTone(frequency: number, duration: number): Promise<void> {
    const platform = process.platform;

    switch (platform) {
      case 'darwin': // macOS
        // Use a simple approach - just play the system sound for now
        await this.execCommand('afplay', ['/System/Library/Sounds/Pop.aiff']);
        break;
      case 'linux':
        if (await this.commandExists('beep')) {
          await this.execCommand('beep', ['-f', frequency.toString(), '-l', duration.toString()]);
        }
        break;
      case 'win32': // Windows
        await this.execCommand('powershell', ['-c', `[Console]::Beep(${frequency}, ${duration})`]);
        break;
      default:
        // Fallback to terminal bell
        process.stdout.write('\u0007');
    }
  }

  private async execCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'ignore' // Ignore output for faster execution
      });

      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Command timeout'));
      }, 300); // Reduced timeout for faster response

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve(); // Always resolve for non-blocking behavior
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async commandExists(command: string): Promise<boolean> {
    try {
      await this.execCommand('which', [command]);
      return true;
    } catch {
      return false;
    }
  }

  public updateConfig(config: Partial<SoundConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public enable(): void {
    this.config.enabled = true;
  }

  public disable(): void {
    this.config.enabled = false;
  }

  public toggleFrequencySound(): void {
    this.config.frequencySoundEnabled = !this.config.frequencySoundEnabled;
  }
}