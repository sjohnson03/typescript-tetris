import { Block, Tetromino } from "./block";

export type State = Readonly<{
    canvas: (Block | undefined)[][];
    previewCanvas: (Block | undefined)[][];
    activeBlockPositions: { x: number; y: number }[];
    gameEnd: boolean;
    score: number;
    level: number;
    highScore?: number;
    nextTetromino: Tetromino;
  }>;