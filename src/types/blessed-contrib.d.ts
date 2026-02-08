declare module 'blessed-contrib' {
  import type { Widgets } from 'blessed';

  interface GridOptions {
    rows: number;
    cols: number;
    screen: Widgets.Screen;
  }

  export interface LineData {
    title: string;
    x: string[];
    y: number[];
    style: { line: string };
  }

  export interface LineWidget extends Widgets.BoxElement {
    setData(data: LineData[]): void;
  }

  export interface BarData {
    titles: string[];
    data: number[];
  }

  export interface BarWidget extends Widgets.BoxElement {
    setData(data: BarData): void;
  }

  export interface GaugeWidget extends Widgets.BoxElement {
    setPercent(percent: number): void;
    setStack(stack: Array<{ percent: number; stroke: string }>): void;
  }

  export interface LogWidget extends Widgets.BoxElement {
    log(text: string): void;
  }

  interface GridInstance {
    set(
      row: number,
      col: number,
      rowSpan: number,
      colSpan: number,
      widgetType: unknown,
      options?: Record<string, unknown>
    ): unknown;
  }

  interface GridConstructor {
    new (options: GridOptions): GridInstance;
    (options: GridOptions): GridInstance;
  }

  export const grid: GridConstructor;
  export const line: unknown;
  export const bar: unknown;
  export const gauge: unknown;
  export const log: unknown;
}
