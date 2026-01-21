export interface TypewriterConfig {
  speed: number;
  startDelay: number;
  cursorChar: string;
  cursorBlinkSpeed: number;
  smoothness: number; // 0 for mechanical, 1 for varied human-like
  loop: boolean;
}

export enum CursorStyle {
  Block = '█',
  Pipe = '|',
  Underscore = '_',
  Circle = '●',
}