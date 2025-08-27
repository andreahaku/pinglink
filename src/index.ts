import { PingEngine } from './core/ping-engine.js';
import { DataManager } from './core/data-manager.js';
import type { PingConfig, PingResult } from './types/index.js';
import { formatLatencyWithColor, getStatusBlock, COLOR_SCHEMES } from './utils/color-schemes.js';
import { formatTime } from './utils/time-utils.js';

export async function startPingMonitor(config: PingConfig): Promise<void> {
  console.log(`\n🔗 PingLink v1.0.0 - Starting ping monitor for ${config.host}`);
  console.log(`⚙️  Interval: ${config.interval}ms | Timeout: ${config.timeout}ms | View: ${config.view}`);
  console.log('───────────────────────────────────────────────────────────────');

  const pingEngine = new PingEngine(config.host, config.interval, config.timeout);
  const dataManager = new DataManager();
  
  let pingCount = 0;
  const maxPings = config.count || 0;
  
  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n\n📊 Final Statistics:');
    const stats = dataManager.calculateStats();
    console.log(`   Total pings: ${stats.totalPings}`);
    console.log(`   Successful: ${stats.successfulPings} (${(100 - stats.packetLoss).toFixed(1)}%)`);
    console.log(`   Failed: ${stats.failedPings} (${stats.packetLoss.toFixed(1)}%)`);
    if (stats.averageLatency > 0) {
      console.log(`   Average latency: ${stats.averageLatency.toFixed(1)}ms`);
      console.log(`   Min/Max latency: ${stats.minLatency.toFixed(1)}ms / ${stats.maxLatency.toFixed(1)}ms`);
    }
    console.log('\n👋 Goodbye!');
    
    pingEngine.stopPing();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Handle ping results
  pingEngine.on('result', (result: PingResult) => {
    dataManager.saveResult(result);
    pingCount++;
    
    if (!config.quiet) {
      const timestamp = formatTime(result.timestamp);
      const status = getStatusBlock(result.success, result.latency);
      const latencyStr = formatLatencyWithColor(result.latency);
      const stats = dataManager.calculateStats();
      
      if (result.success) {
        console.log(`[${timestamp}] ${status} ${config.host} - ${latencyStr} | Avg: ${stats.averageLatency.toFixed(1)}ms | Loss: ${stats.packetLoss.toFixed(1)}%`);
      } else {
        console.log(`[${timestamp}] ${status} ${config.host} - ${result.error || 'FAILED'} | Loss: ${stats.packetLoss.toFixed(1)}%`);
      }
    } else if (!result.success) {
      // Show only failures in quiet mode
      const timestamp = formatTime(result.timestamp);
      console.log(`[${timestamp}] ❌ ${config.host} - ${result.error || 'FAILED'}`);
    }

    // Stop if count reached
    if (maxPings > 0 && pingCount >= maxPings) {
      setTimeout(shutdown, 100);
    }
  });

  pingEngine.on('error', (error) => {
    console.error(`❌ Ping engine error: ${error}`);
  });

  // Start monitoring
  console.log(`🚀 Starting continuous ping to ${config.host}...\n`);
  pingEngine.startContinuousPing();
}

// Export for use as a module
export { PingEngine, DataManager };