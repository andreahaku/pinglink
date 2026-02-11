import { Box, Text, useInput } from 'ink';
import { LineGraph, BarChart } from '@pppp606/ink-chart';
import type { PingStats } from '../types/index.js';

export interface EventLogEntry {
  id: number;
  time: string;
  success: boolean;
  latency?: number;
  error?: string;
}

export interface DashboardProps {
  host: string;
  latencyHistory: number[];
  avgHistory: number[];
  bucketData: Array<{ label: string; value: number; color: string }>;
  stats: PingStats | null;
  eventLog: EventLogEntry[];
  isPaused: boolean;
  onQuit: () => void;
  onClear: () => void;
  onTogglePause: () => void;
}

function GaugeBar({ percent, width }: { percent: number; width: number }) {
  const barWidth = Math.max(10, width);
  const filled = Math.round((barWidth * percent) / 100);
  const empty = barWidth - filled;
  const color = percent >= 99 ? 'green' : percent >= 95 ? 'yellow' : 'red';
  return (
    <Box>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
      <Text> {percent.toFixed(1)}%</Text>
    </Box>
  );
}

function StatsPanel({ stats }: { stats: PingStats }) {
  const successRate = stats.totalPings > 0 ? 100 - stats.packetLoss : 0;
  const rateColor = successRate >= 99 ? 'green' : successRate >= 95 ? 'yellow' : 'red';

  return (
    <Box flexDirection="column">
      <Text>
        <Text bold>Total:   </Text>
        <Text>{stats.totalPings.toLocaleString()}</Text>
      </Text>
      <Text>
        <Text bold>Success: </Text>
        <Text color="green">{stats.successfulPings.toLocaleString()}</Text>
      </Text>
      <Text>
        <Text bold>Failed:  </Text>
        <Text color="red">{stats.failedPings.toLocaleString()}</Text>
      </Text>
      <Text>
        <Text bold>Rate:    </Text>
        <Text color={rateColor}>{successRate.toFixed(1)}%</Text>
      </Text>
      <Text> </Text>
      <Text>
        <Text bold>Avg:     </Text>
        <Text>{stats.averageLatency.toFixed(1)}ms</Text>
      </Text>
      <Text>
        <Text bold>Min:     </Text>
        <Text color="green">{stats.minLatency.toFixed(1)}ms</Text>
      </Text>
      <Text>
        <Text bold>Max:     </Text>
        <Text color="red">{stats.maxLatency.toFixed(1)}ms</Text>
      </Text>
      <Text> </Text>
      <Text>
        <Text bold>Runtime: </Text>
        <Text>{stats.elapsedTime}</Text>
      </Text>
    </Box>
  );
}

function EventLogPanel({
  entries,
  maxEntries,
}: {
  entries: EventLogEntry[];
  maxEntries: number;
}) {
  const visible = entries.slice(-Math.max(1, maxEntries));
  return (
    <Box flexDirection="column">
      {visible.map((entry) => (
        <Text key={entry.id}>
          <Text dimColor>{entry.time} </Text>
          {entry.success ? (
            <>
              <Text color="green">OK  </Text>
              <Text color={getLatencyColor(entry.latency ?? 0)}>
                {entry.latency?.toFixed(1)}ms
              </Text>
            </>
          ) : (
            <>
              <Text color="red">FAIL </Text>
              <Text>{entry.error ?? 'timeout'}</Text>
            </>
          )}
        </Text>
      ))}
    </Box>
  );
}

function getLatencyColor(latency: number): string {
  if (latency <= 50) return 'green';
  if (latency <= 100) return 'yellow';
  if (latency <= 200) return '#ff8800';
  if (latency <= 500) return 'red';
  return 'magenta';
}

export function Dashboard(props: DashboardProps) {
  const isTTY = process.stdin.isTTY === true;

  useInput(
    (input, key) => {
      if (input === 'q' || key.escape) {
        props.onQuit();
      } else if (input === 'c' || input === 'C') {
        props.onClear();
      } else if (input === 'p' || input === 'P') {
        props.onTogglePause();
      }
    },
    { isActive: isTTY },
  );

  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  const rightColWidth = Math.max(24, Math.floor(cols * 0.3));
  const leftColWidth = cols - rightColWidth - 2;
  const chartWidth = Math.max(20, leftColWidth - 4);
  const lineChartHeight = Math.max(4, Math.floor((rows - 8) * 0.55));
  const logMaxEntries = Math.max(3, rows - lineChartHeight - 14);
  const gaugeWidth = Math.max(10, rightColWidth - 14);

  const lineData = [];
  if (props.latencyHistory.length > 0) {
    lineData.push({ values: props.latencyHistory, color: 'green' });
    if (props.avgHistory.length > 0) {
      lineData.push({ values: props.avgHistory, color: 'yellow' });
    }
  }

  return (
    <Box flexDirection="column" width={cols} height={rows}>
      {/* Header */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        justifyContent="center"
      >
        <Text bold>PingLink v1.0.0</Text>
        <Text> -- Monitoring </Text>
        <Text color="green">{props.host}</Text>
      </Box>

      {/* Main content */}
      <Box flexGrow={1} flexDirection="row">
        {/* Left column: charts */}
        <Box flexDirection="column" width={leftColWidth}>
          {/* Line chart */}
          <Box
            flexGrow={1}
            borderStyle="single"
            borderColor="cyan"
            flexDirection="column"
          >
            <Text bold> Latency (ms) </Text>
            {lineData.length > 0 ? (
              <LineGraph
                data={lineData}
                width={chartWidth}
                height={lineChartHeight}
                showYAxis
              />
            ) : (
              <Text color="gray"> Waiting for data...</Text>
            )}
          </Box>

          {/* Bar chart */}
          <Box
            borderStyle="single"
            borderColor="cyan"
            flexDirection="column"
          >
            <Text bold> Latency Distribution </Text>
            {props.bucketData.some((d) => d.value > 0) ? (
              <BarChart
                data={props.bucketData}
                showValue="right"
                width={chartWidth}
              />
            ) : (
              <Text color="gray"> Waiting for data...</Text>
            )}
          </Box>
        </Box>

        {/* Right column: stats, gauge, log */}
        <Box flexDirection="column" width={rightColWidth}>
          {/* Stats panel */}
          <Box
            borderStyle="single"
            borderColor="cyan"
            flexDirection="column"
            paddingX={1}
          >
            <Text bold> Statistics </Text>
            {props.stats ? (
              <StatsPanel stats={props.stats} />
            ) : (
              <Text color="gray">Waiting for data...</Text>
            )}
          </Box>

          {/* Gauge */}
          <Box
            borderStyle="single"
            borderColor="cyan"
            flexDirection="column"
            paddingX={1}
          >
            <Text bold> Success Rate </Text>
            <GaugeBar
              percent={
                props.stats && props.stats.totalPings > 0
                  ? 100 - props.stats.packetLoss
                  : 0
              }
              width={gaugeWidth}
            />
          </Box>

          {/* Event log */}
          <Box
            flexGrow={1}
            borderStyle="single"
            borderColor="cyan"
            flexDirection="column"
            paddingX={1}
          >
            <Text bold> Event Log </Text>
            <EventLogPanel
              entries={props.eventLog}
              maxEntries={logMaxEntries}
            />
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderColor="cyan" justifyContent="center">
        <Text dimColor>
          [q] Quit [c] Clear [p] Pause/Resume [Esc] Quit
        </Text>
        {props.isPaused && (
          <Text color="red" bold>
            {' '}
            | PAUSED
          </Text>
        )}
      </Box>
    </Box>
  );
}
