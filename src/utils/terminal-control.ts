export class TerminalControl {
  private static readonly ANSI = {
    // Screen control
    ENTER_ALT_SCREEN: '\x1b[?1049h',
    EXIT_ALT_SCREEN: '\x1b[?1049l',
    CLEAR_SCREEN: '\x1b[2J',
    CLEAR_LINE: '\x1b[K',
    
    // Cursor control
    HIDE_CURSOR: '\x1b[?25l',
    SHOW_CURSOR: '\x1b[?25h',
    SAVE_CURSOR: '\x1b[s',
    RESTORE_CURSOR: '\x1b[u',
    
    // Scrolling control
    SCROLL_UP: '\x1b[1S',
    SCROLL_DOWN: '\x1b[1T',
    RESET_SCROLL_REGION: '\x1b[r',
  };

  private static inAltScreen: boolean = false;
  private static cursorHidden: boolean = false;

  public static enterAltScreen(): void {
    if (!this.inAltScreen && process.stdout.isTTY) {
      process.stdout.write(this.ANSI.ENTER_ALT_SCREEN);
      this.inAltScreen = true;
    }
  }

  public static exitAltScreen(): void {
    if (this.inAltScreen && process.stdout.isTTY) {
      process.stdout.write(this.ANSI.EXIT_ALT_SCREEN);
      this.inAltScreen = false;
    }
  }

  public static hideCursor(): void {
    if (!this.cursorHidden && process.stdout.isTTY) {
      process.stdout.write(this.ANSI.HIDE_CURSOR);
      this.cursorHidden = true;
    }
  }

  public static showCursor(): void {
    if (this.cursorHidden && process.stdout.isTTY) {
      process.stdout.write(this.ANSI.SHOW_CURSOR);
      this.cursorHidden = false;
    }
  }

  public static moveTo(row: number, col: number): string {
    return `\x1b[${row};${col}H`;
  }

  public static setScrollRegion(top: number, bottom: number): string {
    return `\x1b[${top};${bottom}r`;
  }

  public static resetScrollRegion(): string {
    return this.ANSI.RESET_SCROLL_REGION;
  }

  public static scrollUp(lines: number = 1): string {
    return `\x1b[${lines}S`;
  }

  public static scrollDown(lines: number = 1): string {
    return `\x1b[${lines}T`;
  }

  public static clearScreen(): string {
    return this.ANSI.CLEAR_SCREEN;
  }

  public static clearLine(): string {
    return this.ANSI.CLEAR_LINE;
  }

  public static clearGraphArea(top: number, height: number): string {
    let output = '';
    for (let i = 0; i < height; i++) {
      output += this.moveTo(top + i, 1) + this.clearLine();
    }
    return output;
  }

  public static getTerminalSize(): { width: number; height: number } {
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    };
  }

  public static setupCleanExit(): void {
    const cleanup = () => {
      this.showCursor();
      this.exitAltScreen();
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (err) => {
      cleanup();
      console.error('Uncaught exception:', err);
      process.exit(1);
    });
  }

  public static isTTY(): boolean {
    return process.stdout.isTTY || false;
  }
}