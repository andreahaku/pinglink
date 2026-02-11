import { PingEngine } from './core/ping-engine.js';
import { DataManager } from './core/data-manager.js';
import { SoundEngine } from './core/sound-engine.js';
import { SimpleGraphRenderer } from './ui/simple-graph-renderer.js';
import { DashboardRenderer } from './ui/dashboard-renderer.js';
import type { PingConfig, PingResult, Renderer } from './types/index.js';
import { formatLatencyWithColor, getStatusBlock, COLOR_SCHEMES } from './utils/color-schemes.js';
import { formatTime } from './utils/time-utils.js';

export async function startPingMonitor(config: PingConfig): Promise<void> {
  const pingEngine = new PingEngine(config.host, config.interval, config.timeout);
  const dataManager = new DataManager();
  
  // Initialize sound engine
  const soundConfig = {
    enabled: config.sound,
    volume: 0.5,
    failureAlert: {
      frequency: 800,
      duration: 200
    },
    recoveryAlert: {
      frequency: 1000,
      duration: 100
    },
    frequencyMapping: {
      excellent: 800,
      good: 600,
      fair: 400,
      poor: 300,
      verypoor: 200
    },
    frequencySoundEnabled: config.frequencySound
  };
  const soundEngine = new SoundEngine(soundConfig);
  
  // Initialize UI based on config
  let graphRenderer: Renderer | null = null;
  let dashboard: DashboardRenderer | null = null;

  if (config.visual && !config.simple) {
    dashboard = new DashboardRenderer(config.host, config.interval, config.timeout);
    graphRenderer = dashboard;
  } else if (config.simple) {
    graphRenderer = new SimpleGraphRenderer(config.host, config.interval, config.timeout);
  } else {
    console.log(`\n🔗 PingLink v1.0.0 - Starting ping monitor for ${config.host}`);
    console.log(`⚙️  Interval: ${config.interval}ms | Timeout: ${config.timeout}ms | View: ${config.view}`);
    console.log(`🔊 Sound alerts: ${config.sound ? 'ON' : 'OFF'}`);
    console.log('───────────────────────────────────────────────────────────────');
  }

  let pingCount = 0;
  const maxPings = config.count || 0;

  // Handle graceful shutdown
  const shutdown = () => {
    if (graphRenderer) {
      graphRenderer.destroy();
    } else {
      console.log('\n\n📊 Final Statistics:');
      const stats = dataManager.calculateStats();
      console.log(`   Runtime: ${stats.elapsedTime}`);
      console.log(`   Total pings: ${stats.totalPings}`);
      console.log(`   Successful: ${stats.successfulPings} (${(100 - stats.packetLoss).toFixed(1)}%)`);
      console.log(`   Failed: ${stats.failedPings} (${stats.packetLoss.toFixed(1)}%)`);
      if (stats.averageLatency > 0) {
        console.log(`   Average latency: ${stats.averageLatency.toFixed(1)}ms`);
        console.log(`   Min/Max latency: ${stats.minLatency.toFixed(1)}ms / ${stats.maxLatency.toFixed(1)}ms`);
      }
      console.log('\n👋 Goodbye!');
    }
    
    pingEngine.stopPing();
    process.exit(0);
  };

  // Wire dashboard quit handler now that shutdown is defined
  if (dashboard) {
    dashboard.setOnQuit(shutdown);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Handle ping results
  pingEngine.on('result', async (result: PingResult) => {
    dataManager.saveResult(result);
    pingCount++;
    
    // Handle sound alerts (non-blocking for faster response)
    const isRecovery = soundEngine.processResult(result);
    
    if (!result.success) {
      soundEngine.playFailureAlert(); // Don't await - let it run in background
    } else if (isRecovery) {
      soundEngine.playRecoveryAlert(); // Don't await - recovery sound for ping coming back
    } else if (config.frequencySound) {
      soundEngine.playLatencySound(result); // Don't await - let it run in background
    }
    
    // Update visual interface
    if (graphRenderer) {
      graphRenderer.addPingResult(result);
      const stats = dataManager.calculateStats();
      graphRenderer.updateStats(stats);
    } else {
      // Simple text interface
      if (!config.quiet) {
        const timestamp = formatTime(result.timestamp);
        const status = getStatusBlock(result.success, result.latency);
        const latencyStr = formatLatencyWithColor(result.latency);
        const stats = dataManager.calculateStats();
        
        if (result.success) {
          console.log(`[${timestamp}] ${status} ${config.host} - ${latencyStr} | Runtime: ${stats.elapsedTime} | Avg: ${stats.averageLatency.toFixed(1)}ms | Loss: ${stats.packetLoss.toFixed(1)}%`);
        } else {
          console.log(`[${timestamp}] ${status} ${config.host} - ${result.error || 'FAILED'} | Runtime: ${stats.elapsedTime} | Loss: ${stats.packetLoss.toFixed(1)}%`);
        }
      } else if (!result.success) {
        // Show only failures in quiet mode
        const timestamp = formatTime(result.timestamp);
        console.log(`[${timestamp}] ❌ ${config.host} - ${result.error || 'FAILED'}`);
      }
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
  if (!graphRenderer) {
    console.log(`🚀 Starting continuous ping to ${config.host}...\n`);
  }
  pingEngine.startContinuousPing();
}

// Export for use as a module
export { PingEngine, DataManager };