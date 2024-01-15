import "./util.ts"; 
import { State } from "./state.ts";
import { checkCollision, spawnTetromino,} from "./util.ts";
import { Constants } from "./consts.ts";
import { Canvas } from "./canvas.ts";
import { Block, Tetromino, createBlock } from "./block.ts";


/**
 * Moves a block at a specified position on the canvas to a new position
 * considering potential interactions with other blocks.
 * @param canvas Canvas to update
 * @param x x-coordinate of block to move
 * @param y y-coordinate of block to move
 * @param newX x-coordinate of new position
 * @param newY y-coordinate of new position
 * @param force If true, the block will be moved no matter what
 * @returns New Canvas with specified block moved to its new position
 */
export const moveBlock = (canvas: Canvas,) => (x: number, y: number,) => (newX: number, newY: number, force = false): Canvas => {
    const block = canvas[y][x];
  
    if (newX < 0 || newX >= Constants.GRID_WIDTH || newY < 0 || newY >= Constants.GRID_HEIGHT + 2) {
      return canvas; // If the new position is outside the canvas, return unchanged canvas
    }
  
    if (force) { // Add the block to the new position, regardless of whether there is a block there or not
      return addBlockToCanvas(canvas[newY][newX] ? canvas : removeBlockFromCanvas(canvas)(x, y))(block)(newX, newY);
    }
  
    if ((newX >= 0 && newX < Constants.GRID_WIDTH && !canvas[newY][newX])) {
      // Add the block to the new position if there is no block there already
      return addBlockToCanvas(canvas[newY][newX] ? canvas : removeBlockFromCanvas(canvas)(x, y))(block)(newX, newY);
    }
  
    return canvas;
  };

/**
 * Moves all currently active blocks in specified direction ensuring that no blocks collide as expected.
 * @param state The current state
 * @param direction Movement direction (e.g., { x: -1, y: 0 } for left)
 * @returns Updated state
 */
export const moveActiveTetromino = (state: State, direction: { x: number; y: number }): State => {
  const activeBlockPositions = updateActiveBlocks(state); // the positions of all active blocks

  if (activeBlockPositions.length > 0 && (direction.x < 0)) { // if we are moving left
    const updatedCanvas = activeBlockPositions.reduce((canvas, position) => { // for each active block we move it in the specified direction
        const newPosition = {
            x: position.x + direction.x,
            y: position.y + direction.y,
        };
        if (checkCollision(canvas)(activeBlockPositions, direction)) {
            return canvas;
        }
        return moveBlock(canvas)(position.x, position.y)(newPosition.x, newPosition.y);
    }, state.canvas);

    return {
      ...state,
      canvas: updatedCanvas,
      activeBlockPositions: updateActiveBlocks({
        ...state,
        canvas: updatedCanvas,
      }),
    };
  }
  else if (activeBlockPositions.length > 0 && (direction.x > 0 || direction.y > 0)) { // if we are moving right or moving down
    const updatedCanvas = activeBlockPositions.reduceRight((canvas, position) => { // for each active block we move it in the specified direction
      // we use reduceRight to read the array from right to left so the rightmost block moves before the one to its left
      // this gets the blocks out of the way of the block which is about to be moved.
      const newPosition = {
        x: position.x + direction.x,
        y: position.y + direction.y,
      };
      if (checkCollision(canvas)(activeBlockPositions, direction)) {
        return canvas;
      }
      return moveBlock(canvas)(position.x, position.y)(newPosition.x, newPosition.y);
    }, state.canvas);

    return {
      ...state,
      canvas: updatedCanvas,
      activeBlockPositions: updateActiveBlocks({
        ...state,
        canvas: updatedCanvas,
        activeBlockPositions: activeBlockPositions,
      }),
    };
  }

  return state;
};


/**
 * Performs rotation on the currently active tetromino in a specified direction (clockwise or anticlockwise)
 * @param state state which contains tetrmonio to rotate
 * @param direction direction to rotate in (1 for clockwise, -1 for anticlockwise)
 * @returns new state with rotated tetromino
 */
export const rotateTetromino = (state: State, direction: number): State => {

  /**
   * Helper function to apply rotation to a set of blocks around it's centre of rotation.
   * Function assumes blocks are centred around the origin and we apply a rotation matrix to them.
   * Idea gathered from: https://stackoverflow.com/questions/233850/tetris-piece-rotation-algorithm
   * and https://en.wikipedia.org/wiki/Rotation_matrix
   * @param blocks positions of blocks to rotate
   * @param rotationDirection direction to rotate in (1 for clockwise, -1 for anticlockwise)
   * @returns new positions of blocks after rotation
   */
  const rotationHelper = (blocks: { x: number, y: number }[], rotationDirection = direction): { x: number, y: number }[] => {
    if (rotationDirection == 1) { // rotate clockwise
      return blocks.map((block) => {
        return {
          // If a block of a piece starts at (1,2) it moves clockwise to (2,-1) and (-1,-2) and (-1, 2). 
          // Apply this for each block and the piece is rotated.
          x: block.x * 0 + block.y * 1,
          y: block.x * -1 + block.y * 0,
        }
      })
    }
    else if (rotationDirection == -1) { // rotate anticlockwise
      return blocks.map((block) => {
        return {
          x: block.x * 0 + block.y * -1,
          y: block.x * 1 + block.y * 0,
        }
      })
    }
    else {
      console.error("Error applying rotation");
      return blocks;
    }
  }

  const activeBlockPositions = updateActiveBlocks(state); // update all the positions of active blocks

  if (activeBlockPositions.length == 0) {
    return state; // no active blocks to move, no point in executing this function
  }

  // Remove the active blocks from the canvas
  // This is so we don't have to worry about pieces colliding with themselves when rotating
  const removedActiveBlock = activeBlockPositions.reduce((canvas, position) => {
    return removeBlockFromCanvas(canvas)(position.x, position.y);
  }, state.canvas);

  // first we need to find the centre of rotation
  const centreOfRotation = activeBlockPositions.reduce((acc, block) => {
    return {
      x: (acc.x + block.x),
      y: (acc.y + block.y),
    };
  }, { x: 0, y: 0 });
  centreOfRotation.x = centreOfRotation.x / activeBlockPositions.length;
  centreOfRotation.y = centreOfRotation.y / activeBlockPositions.length


  // Rotation assumes the origin is located at point (0,0) so we need to translate the blocks to the origin
  // Inspired by stackoverflow post: https://stackoverflow.com/questions/233850/tetris-piece-rotation-algorithm
  const translatedBlocks = activeBlockPositions.map((block) => {
    return {
      x: (block.x - centreOfRotation.x),
      y: (block.y - centreOfRotation.y),
    };
  });
  const rotatedBlocks = rotationHelper(translatedBlocks);

  // we now need to translate the blocks back to their original position
  const updatedBlocks = rotatedBlocks.map((block) => {
    return {
      x: Math.round(block.x + centreOfRotation.x),
      y: Math.round(block.y + centreOfRotation.y),
    };
  });

  // we now need to check if the rotated blocks will collide with anything
  if (checkCollision(state.canvas)(updatedBlocks, { x: 0, y: 0 })) {
    return state; // if they will collide, we return the state unchanged
  }

  // We store the colour of one of the active blocks so we can use it to create new roated blocks
  const colour = state.canvas[activeBlockPositions[0].y][activeBlockPositions[0].x]?.colour;

  // Create a new tetromino with the the blocks rotated
  const updatedTetronimo: Tetromino = {
    blocks: updatedBlocks.map((block) => {
      return [createBlock(colour ? colour : "blue"), block.x, block.y];
    }),

  }
  return { // Return a new state with the rotated tetromino
    ...state,
    canvas: spawnTetromino(removedActiveBlock)(updatedTetronimo)(0, 0),
    activeBlockPositions: updatedBlocks,
  }
};

/**
 * Updates the activeBlocks array stored in the state for the currently active blocks in our game
 * @param state Current state
 * @returns New activeBlocks array
*/
export const updateActiveBlocks = (state: State): { x: number; y: number }[] => {
  const activeBlocks = state.canvas.reduce((acc, row, rowIndex) => {
    return row.reduce((acc, block, colIndex) => {
      if (block && block.isActive) {
        acc.push({ x: colIndex, y: rowIndex });
      }
      return acc;
    }, acc);
  }, [] as { x: number; y: number }[]);
  return activeBlocks;
};


/**
 * Add block at specified location to our canvas matrix
 * @param canvas Canvas to add block to
 * @param block Block to add
 * @param x x-coordinate of block to add
 * @param y y-coordinate of block to add
 * @returns New canvas with added block
*/
export const addBlockToCanvas = (canvas: Canvas) => (block: Block | undefined) => (x: number, y: number): Canvas => {
    const updatedCanvas = canvas.map((row, rowIndex) =>
      row.map((currentBlock, colIndex) =>
        rowIndex === y && colIndex === x
          ? block // Add the new block at the specified position
          : currentBlock // otherwise keep the already existing block
      )
    );
    return updatedCanvas;
  };
  
  
  /**
   * Removes a block from a specified position on the canvas
   * @param canvas Canvas to remove block from
   * @param x x-coordinate of block to remove
   * @param y y-coordinate of block to remove
   * @returns New canvas with block removed
  */
export const removeBlockFromCanvas = (canvas: Canvas) => (x: number, y: number): Canvas => {
    const updatedCanvas = canvas.map((row, rowIndex) =>
      row.map((currentBlock, colIndex) =>
        rowIndex === y && colIndex === x // check if we are at the specified location
          ? undefined // remove the block at the specified position
          : currentBlock // otherwise keep the block
      )
    );
    return updatedCanvas;
  };