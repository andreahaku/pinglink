#!/usr/bin/env node

import { Command } from 'commander';
import type { PingConfig } from './types/index.js';
import { TimeFrame } from './types/index.js';
import { startPingMonitor } from './index.js';

const program = new Command();

program
  .name('pinglink')
  .description('Visual Ping Monitor CLI Tool with real-time terminal interface')
  .version('1.0.0')
  .argument('[host]', 'Host to ping (IP address or hostname)', '1.1.1.1')
  .option('-v, --view <time>', 'Time view (5m|10m|15m|1h|6h|1d)', '15m')
  .option('-i, --interval <ms>', 'Ping interval in milliseconds', '1000')
  .option('-t, --timeout <ms>', 'Ping timeout in milliseconds', '1000')
  .option('-s, --sound', 'Enable failure sound alerts', true)
  .option('-f, --frequency-sound', 'Enable frequency-based sound feedback', false)
  .option('--no-sound', 'Disable sound alerts')
  .option('--visual', 'Use advanced visual interface (default)', true)
  .option('--simple', 'Use simple text interface', false)
  .option('-c, --count <number>', 'Stop after N pings (0 = infinite)', '0')
  .option('-o, --output <file>', 'Save results to file')
  .option('-q, --quiet', 'Minimize output, show only failures', false)
  .option('-d, --detailed', 'Show detailed statistics view', false)
  .option('--no-color', 'Disable colored output')
  .option('--config <file>', 'Load custom configuration file')
  .action(async (host: string, options: any) => {
    // Validate time view option
    const validTimeFrames = Object.values(TimeFrame);
    if (!validTimeFrames.includes(options.view as TimeFrame)) {
      console.error(`Invalid time view: ${options.view}. Valid options: ${validTimeFrames.join(', ')}`);
      process.exit(1);
    }

    // Parse numeric options
    const interval = parseInt(options.interval);
    const timeout = parseInt(options.timeout);
    const count = parseInt(options.count);

    if (isNaN(interval) || interval < 100) {
      console.error('Interval must be a number >= 100ms');
      process.exit(1);
    }

    if (isNaN(timeout) || timeout < 500) {
      console.error('Timeout must be a number >= 500ms');
      process.exit(1);
    }

    if (isNaN(count) || count < 0) {
      console.error('Count must be a number >= 0');
      process.exit(1);
    }

    const config: PingConfig = {
      host,
      interval,
      timeout,
      count,
      view: options.view as TimeFrame,
      sound: options.sound,
      frequencySound: options.frequencySound,
      quiet: options.quiet,
      detailed: options.detailed,
      visual: !options.simple, // Visual is default unless --simple is specified
      simple: options.simple,
      output: options.output
    };

    try {
      await startPingMonitor(config);
    } catch (error) {
      console.error('Error starting ping monitor:', error);
      process.exit(1);
    }
  });

program.parse();