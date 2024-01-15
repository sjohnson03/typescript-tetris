import { Block } from "./block";
import { Constants } from "./consts";

export type Canvas = (Block | undefined)[][];
  
export const Canvas: (Block | undefined)[][] = new Array(Constants.GRID_HEIGHT + 2).fill(new Array(Constants.GRID_WIDTH).fill(undefined));