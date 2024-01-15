import { Block } from "./block";
import { Constants } from "./consts";

export type Canvas = (Block | undefined)[][];
  
export const Canvas: (Block | undefined)[][] = new Array(Constants.GRID_HEIGHT + 2).fill(new Array(Constants.GRID_WIDTH).fill(undefined));

// Canvas elements
export const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
HTMLElement;
export const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
HTMLElement;
export const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
HTMLElement;
const container = document.querySelector("#main") as HTMLElement;