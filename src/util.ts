import "./consts.ts";	// Constants

import "./style.css";
import { addBlockToCanvas } from "./movement.ts";
import { State } from "./state.ts";
import { Tetromino, Colour, createBlock} from "./block.ts";
import { Constants } from "./consts.ts";
import { Canvas } from "./canvas.ts";


/**
 * 
 * @param canvas Canvas to check collision in
 * @param tetromino Tetromino to check collision for
 * @param direction Direction to check collision in
 * @returns 
 */
export const checkCollision = (canvas: Canvas) => (blocks: { x: number; y: number; }[], direction: { x: number; y: number }): boolean => {
    const collision = blocks.reduce((acc, block) => {
      const x = block.x;
      const y = block.y;
      // check if we are trying to move below or above the canvas, if so there is definitely a collision
      if (direction.y + y >= Constants.GRID_HEIGHT + 2 || direction.y + y <= 0) { return true || acc; }
      if (canvas[direction.y + y][direction.x + x] || direction.x + x < 0 || direction.x + x >= Constants.GRID_WIDTH) {
  
        if (canvas[direction.y + y][direction.x + x]?.isActive) {
          return false || acc;
        }
        // if the block we see is active, we return false to allow movement
        // Otherwise, we return true:
        return true || acc;
      }
      return acc;
    }, false);
    return collision;
  };
  
  export const checkForTetris = (state: State): State => {
    const updatedCanvas = state.canvas.reduce((acc, row, rowIndex): Canvas => {
      const isTetris = row.reduce((acc, block, colIndex) => {
  
        if (block && !block.isActive) {
          return true && acc;
        }
        return false && acc;
      }, true);
  
      if (isTetris) {
        return [[...new Array(Constants.GRID_WIDTH).fill(undefined)], ...acc]; // Add a new empty row at the top so we can move all the rows down
      }
      // otherwise we keep the row as is
      return [...acc, row];
    }, [] as Canvas);
  
  
    // Calculate how many rows were moved down
    const rowsReplaced = state.canvas.filter((row, rowIndex) => {
      const isTetris = row.reduce((acc, block, colIndex) => {
        if (block && !block.isActive) {
          return true && acc;
        }
        return false && acc;
      }, true);
      return isTetris;
    }).length;
  
    // Update the score and level
    const score = state.score + rowsReplaced * (100 * state.level / 2);
    const level = Math.floor(score / 500) + 1; // level up every 500 points
    return {
      ...state,
      // new canvas with the rows removed
      canvas: [...updatedCanvas, ...new Array(rowsReplaced).fill(new Array(Constants.GRID_WIDTH).fill(undefined))],
      score,
      level,
    };
  };
  
  
  /**
   * Makes all the blocks in the canvas inactive
   * @param state State to make all blocks inactive in
   * @returns New canvas with all blocks inactive
  */
 export const makeAllBlocksInactive = (state: State): State => {
    const updatedCanvas = state.canvas.map((row) => {
      return row.map((block) => {
        if (block) {
            return {
                ...block,
                isActive: false,
            }
        }
        return block;
      });
    });
    return {
      ...state,
      canvas: updatedCanvas,
      activeBlockPositions: [],
    };
  };

  /**
 * Function used to spawn a new tetromino on the canvas
 * @param canvas Canvas to add tetromino to
 * @returns new canvas with tetromino added
 */
export const spawnTetromino = (canvas: Canvas) => (tetromino: Tetromino) => (x: number, y: number, colour?: Colour): Canvas => {
    const updatedCanvas = tetromino.blocks.reduce((acc, block) => {
      const blockToAdd = createBlock(colour ? colour : block[0].colour, true);
      const blockX = block[1];
      const blockY = block[2];
      return addBlockToCanvas(acc)(blockToAdd)(blockX + x, blockY + y);
    }, canvas);
    return updatedCanvas;
  };

