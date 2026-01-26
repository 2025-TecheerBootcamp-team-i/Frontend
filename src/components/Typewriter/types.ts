export interface TypewriterConfig {
  speed: number;
  startDelay: number;
  cursorChar: string;
  cursorBlinkSpeed: number;
  smoothness: number; // 0 for mechanical, 1 for varied human-like
  loop: boolean;
}

export const CursorStyle = {
  Pipe: "|",
  Block: "█",
  None: "",
} as const;

export type CursorStyle = (typeof CursorStyle)[keyof typeof CursorStyle];
