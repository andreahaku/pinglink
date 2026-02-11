import type React from 'react';
import { Box, Text, useInput } from 'ink';
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

function DistributionChart({
  data,
  width,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  width: number;
}) {
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const maxLabelLen = Math.max(...data.map((d) => d.label.length));
  const maxValLen = String(maxVal).length;
  const barSpace = Math.max(5, width - maxLabelLen - maxValLen - 3);

  return (
    <Box flexDirection="column">
      {data.map((item) => {
        const barLen = Math.max(0, Math.round((item.value / maxVal) * barSpace));
        return (
          <Text key={item.label}>
            <Text color={item.color}>
              {item.label.padEnd(maxLabelLen)}
            </Text>
            <Text> </Text>
            <Text color={item.color}>
              {'\u2588'.repeat(barLen)}
              {' '.repeat(barSpace - barLen)}
            </Text>
            <Text> </Text>
            <Text>{String(item.value).padStart(maxValLen)}</Text>
          </Text>
        );
      })}
    </Box>
  );
}

const BLOCK_CHARS = [' ', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];

function LatencyHistogram({
  data,
  width,
  height,
}: {
  data: number[];
  width: number;
  height: number;
}) {
  // Each bar is 1 char wide + 1 space gap = 2 chars per bar
  const maxBars = Math.floor(width / 2);
  const visible = data.slice(-maxBars);
  const padLeft = Math.max(0, maxBars - visible.length) * 2;

  const positiveValues = visible.filter((v) => v > 0);
  const maxVal =
    positiveValues.length > 0
      ? Math.ceil(Math.max(...positiveValues) * 1.1)
      : 100;

  const maxLabel = `${maxVal}`;
  const yAxisW = maxLabel.length + 1;

  const rows: React.ReactElement[] = [];

  for (let r = 0; r < height; r++) {
    const rowTop = (maxVal * (height - r)) / height;
    const rowBottom = (maxVal * (height - r - 1)) / height;
    const isBottom = r === height - 1;

    // Y-axis label
    let yLabel: string;
    if (r === 0) yLabel = maxLabel.padStart(yAxisW - 1) + '\u2502';
    else if (isBottom) yLabel = '0'.padStart(yAxisW - 1) + '\u2502';
    else yLabel = ' '.repeat(yAxisW - 1) + '\u2502';

    // Build colored segments, grouping consecutive same-color chars
    const segments: Array<{ text: string; color: string }> = [];
    const pushChar = (ch: string, color: string) => {
      if (segments.length > 0 && segments[segments.length - 1].color === color) {
        segments[segments.length - 1].text += ch;
      } else {
        segments.push({ text: ch, color });
      }
    };

    for (let p = 0; p < padLeft; p++) pushChar(' ', 'white');

    for (const value of visible) {
      if (value <= 0) {
        pushChar(isBottom ? '\u00d7' : ' ', 'red');
      } else if (value >= rowTop) {
        pushChar('\u2588', getLatencyColor(value));
      } else if (value > rowBottom) {
        const fraction = (value - rowBottom) / (rowTop - rowBottom);
        const idx = Math.min(8, Math.ceil(fraction * 8));
        pushChar(BLOCK_CHARS[idx], getLatencyColor(value));
      } else {
        pushChar(' ', 'white');
      }
      // Gap between bars
      pushChar(' ', 'white');
    }

    rows.push(
      <Text key={r}>
        <Text dimColor>{yLabel}</Text>
        {segments.map((seg, i) => (
          <Text key={i} color={seg.color}>
            {seg.text}
          </Text>
        ))}
      </Text>,
    );
  }

  return <Box flexDirection="column">{rows}</Box>;
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
          {/* Latency histogram */}
          <Box
            flexGrow={1}
            borderStyle="single"
            borderColor="cyan"
            flexDirection="column"
          >
            <Text bold> Latency (ms) </Text>
            {props.latencyHistory.length > 0 ? (
              <LatencyHistogram
                data={props.latencyHistory}
                width={chartWidth}
                height={lineChartHeight}
              />
            ) : (
              <Text color="gray"> Waiting for data...</Text>
            )}
          </Box>

          {/* Distribution chart */}
          <Box
            flexShrink={0}
            borderStyle="single"
            borderColor="cyan"
            flexDirection="column"
          >
            <Text bold> Latency Distribution </Text>
            <DistributionChart
              data={props.bucketData}
              width={chartWidth}
            />
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
