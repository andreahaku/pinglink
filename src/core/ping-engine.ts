import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import type { PingResult } from '../types/index.js';

export class PingEngine extends EventEmitter {
  private host: string;
  private interval: number;
  private timeout: number;
  private isRunning: boolean = false;
  private pingProcess: NodeJS.Timeout | null = null;
  private platform: string;

  constructor(host: string, interval: number = 1000, timeout: number = 5000) {
    super();
    this.host = host;
    this.interval = interval;
    this.timeout = timeout;
    this.platform = process.platform;
  }

  async ping(): Promise<PingResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const timestamp = new Date();

      const pingCommand = this.getPingCommand();
      const pingProcess = spawn(pingCommand.command, pingCommand.args);

      let output = '';
      let errorOutput = '';

      const timeoutId = setTimeout(() => {
        pingProcess.kill();
        resolve({
          timestamp,
          host: this.host,
          success: false,
          error: 'Timeout'
        });
      }, this.timeout);

      pingProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pingProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pingProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (code === 0) {
          const latency = this.parseLatency(output);
          resolve({
            timestamp,
            host: this.host,
            success: true,
            latency
          });
        } else {
          resolve({
            timestamp,
            host: this.host,
            success: false,
            error: errorOutput || 'Ping failed'
          });
        }
      });

      pingProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          timestamp,
          host: this.host,
          success: false,
          error: error.message
        });
      });
    });
  }

  startContinuousPing(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    const doPing = async () => {
      if (!this.isRunning) return;
      
      try {
        const result = await this.ping();
        this.emit('result', result);
      } catch (error) {
        this.emit('error', error);
      }

      if (this.isRunning) {
        this.pingProcess = setTimeout(doPing, this.interval);
      }
    };

    doPing();
  }

  stopPing(): void {
    this.isRunning = false;
    if (this.pingProcess) {
      clearTimeout(this.pingProcess);
      this.pingProcess = null;
    }
  }

  setHost(host: string): void {
    this.host = host;
  }

  setInterval(interval: number): void {
    this.interval = interval;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  private getPingCommand(): { command: string; args: string[] } {
    const count = '1';
    const timeoutSec = Math.ceil(this.timeout / 1000);

    switch (this.platform) {
      case 'darwin': // macOS
        return {
          command: 'ping',
          args: ['-c', count, '-W', this.timeout.toString(), this.host]
        };
      case 'linux':
        return {
          command: 'ping',
          args: ['-c', count, '-W', timeoutSec.toString(), this.host]
        };
      case 'win32': // Windows
        return {
          command: 'ping',
          args: ['-n', count, '-w', this.timeout.toString(), this.host]
        };
      default:
        return {
          command: 'ping',
          args: ['-c', count, this.host]
        };
    }
  }

  private parseLatency(output: string): number | undefined {
    // Parse latency from ping output based on platform
    let latencyMatch: RegExpMatchArray | null;

    if (this.platform === 'win32') {
      // Windows: "time=1ms" or "time<1ms"
      latencyMatch = output.match(/time[<=](\d+(?:\.\d+)?)ms/i);
    } else {
      // macOS/Linux: "time=1.23 ms"
      latencyMatch = output.match(/time=(\d+(?:\.\d+)?)\s*ms/i);
    }

    if (latencyMatch) {
      return parseFloat(latencyMatch[1]);
    }

    return undefined;
  }
}