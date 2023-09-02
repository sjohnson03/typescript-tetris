/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import { Observable, fromEvent, interval, merge, } from "rxjs";
import { map, filter, scan, tap, mergeMap, take } from "rxjs/operators";

/** Constants */

const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
  PREVIEW_WIDTH: 160,
  PREVIEW_HEIGHT: 80,
} as const;

const Constants = {
  TICK_RATE_MS: 500,
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
} as const;

const BlockSize = {
  WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
  HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
};

type Canvas = (Block | undefined)[][];

const Canvas: (Block | undefined)[][] = new Array(Constants.GRID_HEIGHT + 2).fill(new Array(Constants.GRID_WIDTH).fill(undefined));

type Colour = "aqua" | "red" | "blue" | "green" | "yellow" | "purple" | "orange" | "grey";

type Block = {
  colour: Colour;
  isActive?: boolean; // status indicating if the block is currently controlled by the player
}

type Tetromino = {
  blocks: [Block, number, number][]; // array of blocks and their positions
}


/**
  * Creates a block with the specified colour and status
  * @param colour Colour of the block
  * @param status Status of the block expressed as a boolean
  * @returns Block with the specified colour and status
*/
const createBlock = (colour: Colour, status = true): Block => ({
  colour,
  isActive: status,
});

// Types of tetrominoes

const squareBlock: Tetromino =
// [][]
// [][]
{
  blocks: [
    [createBlock("aqua"), 0, 0],
    [createBlock("aqua",), 1, 0],
    [createBlock("aqua",), 0, 1],
    [createBlock("aqua",), 1, 1]
  ],
};


const longBlock: Tetromino =
// [][][][]
{
  blocks: [
    [createBlock("red"), 0, 0],
    [createBlock("red"), 1, 0],
    [createBlock("red"), 2, 0],
    [createBlock("red"), 3, 0]
  ],
};

const rightAngleBlock: Tetromino =
{
  // [][][]
  //     []
  blocks: [
    [createBlock("blue"), 0, 0],
    [createBlock("blue"), 1, 0],
    [createBlock("blue"), 2, 0],
    [createBlock("blue"), 2, 1]
  ],
};

const leftAngleBlock: Tetromino = {
  //
  //  [][][]
  //  []
  blocks: [
    [createBlock("green"), 0, 0],
    [createBlock("green"), 0, 1],
    [createBlock("green"), 1, 0],
    [createBlock("green"), 2, 0]
  ],
}

const tBlock: Tetromino = {
  //
  //  [][][]
  //    []
  blocks: [
    [createBlock("yellow"), 0, 0],
    [createBlock("yellow"), 1, 0],
    [createBlock("yellow"), 2, 0],
    [createBlock("yellow"), 1, 1]
  ],
}

const zBlock: Tetromino = {
  // [][]
  //   [][]
  blocks: [
    [createBlock("purple"), 0, 0],
    [createBlock("purple"), 1, 0],
    [createBlock("purple"), 1, 1],
    [createBlock("purple"), 2, 1]
  ],
}

const sBlock: Tetromino = {
  //   [][]
  // [][]
  blocks: [
    [createBlock("orange"), 0, 1],
    [createBlock("orange"), 1, 1],
    [createBlock("orange"), 1, 0],
    [createBlock("orange"), 2, 0]
  ],
}

const allTetrominoes = [squareBlock, longBlock, rightAngleBlock, leftAngleBlock, tBlock, zBlock, sBlock];

abstract class RNG {
  private static m = 0x80000000; // 2**31
  private static a = 1103515245;
  private static c = 12345;

  public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;
  // scale has values to between 0 and length of allBlocks[]
  public static scale = (hash: number) => Math.floor(hash / RNG.m * allTetrominoes.length);
}


/** User input */

type Key = "KeyS" | "KeyA" | "KeyD" | "KeyR" | "KeyE";

type Event = "keydown" | "keyup" | "keypress";


/** Utility functions */

/**
 * 
 * @param canvas Canvas to check collision in
 * @param tetromino Tetromino to check collision for
 * @param direction Direction to check collision in
 * @returns 
 */
const checkCollision = (canvas: Canvas) => (blocks: { x: number; y: number; }[], direction: { x: number; y: number }): boolean => {
  const collision = blocks.reduce((acc, block) => {
    const x = block.x;
    const y = block.y;
    // check if we are trying to mvoe below or above the canvas, if so there is definitely a collision
    if (direction.y + y >= Constants.GRID_HEIGHT + 2 || direction.y + y <= 0) { return true || acc; } 
    if (canvas[direction.y + y][direction.x + x] || direction.x + x < 0 || direction.x + x >= Constants.GRID_WIDTH) {

      if (canvas[direction.y + y][direction.x + x]?.isActive) {
        return false || acc;
      }
      // if the block we see is active, we return false to allow movement
      // Otherwise, we return true:
      return true || acc;
    }
    // else if (canvas[direction.y + y][direction.x + x]?.isActive){
    //   return false || acc;
    // }
    return acc;
  }, false);
  return collision;
};

const checkForTetris = (state: State): State => {
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
  const score = state.score + rowsReplaced * 100;
  console.log(rowsReplaced)
  const level = Math.floor(score / 1000) + 1; // level up every 1000 points
  return {
    ...state,
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

const makeAllBlocksInactive = (state: State): State => {
  const updatedCanvas = state.canvas.map((row) => {
    return row.map((block) => {
      if (block) {
        block.isActive = false;
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

// ** MOVEMENT FUNCTIONS **

/**
 * Moves all currently active blocks in specified direction ensuring that no blocks collide as expected.
 * @param state The current state
 * @param direction Movement direction (e.g., { x: -1, y: 0 } for left)
 * @returns Updated state
 */
const moveActiveTetromino = (state: State, direction: { x: number; y: number }): State => {
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
      return moveBlock(canvas)(
        position.x,
        position.y
      )(newPosition.x, newPosition.y);
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
      return moveBlock(canvas)(
        position.x,
        position.y
      )(newPosition.x, newPosition.y);
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
const rotateTetromino = (state: State, direction: number): State => {

  /**
   * Helper function to apply rotation to a set of blocks around it's centre of rotation
   * Idea gathered from: https://stackoverflow.com/questions/233850/tetris-piece-rotation-algorithm
   * and https://en.wikipedia.org/wiki/Rotation_matrix
   * @param blocks positions of blocks to rotate
   * @param rotationDirection direction to rotate in (1 for clockwise, -1 for anticlockwise)
   * @returns new positions of blocks after rotation
   */
  const rotationHelper = (blocks: {x: number, y: number}[], rotationDirection = direction): {x: number, y: number}[] => {
    if (rotationDirection == 1) { // rotate clockwise
    return blocks.map((block) => {
    return {
      // If a block of a piece starts at (1,2) it moves clockwise to (2,-1) and (-1,-2) and (-1, 2). 
      // Apply this for each block and the piece is rotated.
      x: block.x * 0 + block.y * 1,
      y: block.x * -1 + block.y * 0,
    }})}
    else if (rotationDirection == -1) { // rotate anticlockwise
      return blocks.map((block) => {
      return {
        x: block.x * 0 + block.y * -1,
        y: block.x * 1 + block.y * 0,
      }
    })}
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
  const updateActiveBlocks = (state: State): { x: number; y: number }[] => {
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
  const addBlockToCanvas = (canvas: Canvas) => (block: Block | undefined) => (x: number, y: number): Canvas => {
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
  const removeBlockFromCanvas = (canvas: Canvas) => (x: number, y: number): Canvas => {
    const updatedCanvas = canvas.map((row, rowIndex) =>
      row.map((currentBlock, colIndex) =>
        rowIndex === y && colIndex === x // check if we are at the specified location
          ? undefined // remove the block at the specified position
          : currentBlock // otherwise keep the block
      )
    );
    return updatedCanvas;
  };

  /**
   * Function used to spawn a new tetromino on the canvas
   * @param canvas Canvas to add tetromino to
   * @returns new canvas with tetromino added
   */
  const spawnTetromino = (canvas: Canvas) => (tetromino: Tetromino) => (x: number, y: number, colour?: Colour): Canvas => {
    const updatedCanvas = tetromino.blocks.reduce((acc, block) => {
      const blockToAdd = createBlock(colour ? colour : block[0].colour, true);
      const blockX = block[1];
      const blockY = block[2];
      return addBlockToCanvas(acc)(blockToAdd)(blockX + x, blockY + y);
    }, canvas);
    return updatedCanvas;
  };




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
  const moveBlock = (canvas: Canvas,) => (x: number, y: number,) => (newX: number, newY: number, force = false): Canvas => {
    const block = canvas[y][x];

    if (newX < 0 || newX >= Constants.GRID_WIDTH || newY < 0 || newY >= Constants.GRID_HEIGHT + 2) {
      return canvas; // If the new position is outside the canvas, return unchanged canvas
    }

    if (force){ // if force is true we move the block no matter what
      return addBlockToCanvas(canvas[newY][newX] ? canvas : removeBlockFromCanvas(canvas)(x, y))(block)(newX, newY);
    }

    if ((newX >= 0 && newX < Constants.GRID_WIDTH && !canvas[newY][newX])) {
      return addBlockToCanvas(canvas[newY][newX] ? canvas : removeBlockFromCanvas(canvas)(x, y))(block)(newX, newY);
    }


    return canvas;
  };

  /**
   * Applies gravity to the currently active (controlled by the player) blocks on the canvas.
   * This is done recursively starting from the bottom row and making our way up
   * @param state Current state
   * @param row Current row to process, by default the bottom row
   * @param col Current column to process, by default the leftmost column
   * @returns Updated state
  */
  function applyGravity(state: State, row: number = Constants.GRID_HEIGHT + 1, col: number = 0): State {
    if (row < 0) {
      return state; // Base case: we have processed all rows
    }

    if (col >= Constants.GRID_WIDTH) {
      return applyGravity(state, row - 1, 0); // Move to the next row
    }

    const currBlock = state.canvas[row][col];

    if (currBlock !== undefined) {
      if ("colour" in currBlock && currBlock.isActive) { // check to see if of type block and if block is active
        if (row === Constants.GRID_HEIGHT + 1 || checkCollision(state.canvas)(state.activeBlockPositions, { x: 0, y: 1 })) { // check if block is at the bottom of the canvas
          return makeAllBlocksInactive(state); // make all blocks inactive
        }

        else { // move the block down by one row
          const updatedState = moveActiveTetromino(state, { x: 0, y: 1 }); // move all active blocks down 1
          return applyGravity({
            ...state,
            canvas: updatedState.canvas,
          }, row - 1, col);
        }
      }
    }
    return applyGravity(state, row, col + 1); // Move to the next column
  }

  /** State processing */

  type State = Readonly<{
    canvas: (Block | undefined)[][];
    previewCanvas: (Block | undefined)[][];
    activeBlockPositions: { x: number; y: number }[];
    gameEnd: boolean;
    score: number;
    level: number;
    highScore?: number;
    nextTetromino: Tetromino;
  }>;

  // Initial state for starting a game
  const initialState: State = {
    canvas: Canvas,
    previewCanvas: Canvas,
    activeBlockPositions: [],
    score: 0,
    level: 1,
    highScore: 0,
    gameEnd: false,
    nextTetromino: squareBlock
  };

  /**
   * Updates the state by proceeding with one time step.
   *
   * @param s Current state
   * @returns Updated state
   */
  const tick = (s: State) => s;

  /** Rendering (side effects) */

  /**
   * Displays a SVG element on the canvas. Brings to foreground.
   * @param elem SVG element to display
   */
  const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible");
    elem.parentNode!.appendChild(elem);
  };

  /**
   * Hides a SVG element on the canvas.
   * @param elem SVG element to hide
   */
  const hide = (elem: SVGGraphicsElement) =>
    elem.setAttribute("visibility", "hidden");

  /**
   * Creates an SVG element with the given properties.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
   * element names and properties.
   *
   * @param namespace Namespace of the SVG element
   * @param name SVGElement name
   * @param props Properties to set on the SVG element
   * @returns SVG element
   */
  const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {}
  ) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
  };

  /**
   * Transforms the canvas into a 2D array of SVG elements.
   * @param canvas Canvas to transform
   * @returns 2D array of SVG elements
   * 
  */
  const transformCanvasToSVG = (canvas: Canvas, svg: SVGGraphicsElement & HTMLElement): SVGElement[][] => {
    // Create a 2D array of SVG elements
    const SVGElements: SVGElement[][] = canvas.map((row, index) => {// for each row in the input canvas
      return row.map((block, colIndex) => { // for each block in the row
        if (block) { // check if there is a block
          const cube = createSvgElement(svg.namespaceURI, "rect", { // create an element for the block
            height: `${BlockSize.HEIGHT}`,
            width: `${BlockSize.WIDTH}`,
            x: `${BlockSize.WIDTH * (colIndex)}`,
            y: `${BlockSize.HEIGHT * (index - 2)}`,
            style: "fill: " + block.colour,
          });
          return cube; // Return the created SVG element
        } else { // Create an empty SVG element for spaces in our canvas with no blocks, this makes TS happy
          const emptyCube = createSvgElement(svg.namespaceURI, "rect", {
            height: `${BlockSize.HEIGHT}`,
            width: `${BlockSize.WIDTH}`,
            x: `${BlockSize.WIDTH * (colIndex)}`,
            y: `${BlockSize.HEIGHT * (index)}`,
            style: "fill: black",
          });
          emptyCube.setAttribute("visibility", "hidden"); // Hide the empty SVG element
          return emptyCube; // Return empty SVG element
        }
      });
    });
    return SVGElements; // return matrix of SVG elements
  };

  /**
   * Updates the SVG canvas with a new canvas - impure function
   * @param canvas Canvas to update the SVG canvas with
  */
  const updateDisplayedCanvas = (canvas: Canvas, svg: SVGGraphicsElement & HTMLElement) => {
    // Clear the SVG canvas by removing all child nodes
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const svgElements = transformCanvasToSVG(canvas, svg); // Transform the canvas to SVG elements

    svgElements.forEach((row) => {
      row.forEach((block) => {
        if (block) {
          svg.appendChild(block); // Append each SVG element to the SVG canvas
        }
      });
    });
  };

  /**
   * This is the function called on page load. Your main game loop
   * should be called here.
   */
  export function main() {


    // Canvas elements
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
      HTMLElement;
    const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
      HTMLElement;
    const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
      HTMLElement;
    const container = document.querySelector("#main") as HTMLElement;

    svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
    svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
    preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
    preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

    // Text fields
    const levelText = document.querySelector("#levelText") as HTMLElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;
    const highScoreText = document.querySelector("#highScoreText") as HTMLElement;

    /** User input */

    const key$ = fromEvent<KeyboardEvent>(document, "keypress");

    const fromKey = (keyCode: Key) =>
      key$.pipe(filter(({ code }) => code === keyCode));

    const left$ = fromKey("KeyA");
    const right$ = fromKey("KeyD");
    const down$ = fromKey("KeyS");
    const rClockwise$ = fromKey("KeyR");
    const rAntiClockwise$ = fromKey("KeyE");

    /** Observables */
    const moveLeft$ = left$.pipe(map(() => ({ x: -1, y: 0 })));
    const moveRight$ = right$.pipe(map(() => ({ x: 1, y: 0 })));
    const moveDown$ = down$.pipe(map(() => ({ x: 0, y: 1 })));
    const rotateClockwise$ = rClockwise$.pipe(map(() => 1));
    const rotateAntiClockwise$ = rAntiClockwise$.pipe(map(() => -1));


    const movement$ = merge(moveLeft$, moveRight$, moveDown$).pipe(
      map((movement) => ({ type: "movement", direction: movement }))
    );

    const rotation$ = merge(rotateClockwise$, rotateAntiClockwise$).pipe(
      map((rotation) => ({ type: "rotation", direction: rotation }))
    );

    /** Determines the rate of time steps */
    const tick$ = interval(Constants.TICK_RATE_MS);


    const gravityTest = {
      // canvas: addBlockToCanvas(addBlockToCanvas(addBlockToCanvas(Canvas)(createBlock("aqua", true))(4, 0))(createBlock("red", true))(5, 0))(createBlock("green", true))(6, 0),
      canvas: Canvas,
      previewCanvas: Canvas,
      nextTetromino: squareBlock,
      activeBlockPositions: [],
      gameEnd: false
    };

    /**
     * Renders the current state to the canvas.
     *
     * In MVC terms, this updates the View using the Model.
     *
     * @param s Current state
     * 
     */

    const render = (s: State) => {
      // Add blocks to the main grid canvas
      updateDisplayedCanvas(s.canvas, svg);
      // Add blocks to the preview canvas
      updateDisplayedCanvas(s.previewCanvas, preview);
    };


    const source$ = merge(tick$, movement$, rotation$)
      .pipe(
        scan(
          (state: State, event: any) => {

            if (state.gameEnd) {
              if (event.type === "rotation") {
                return {
                  ...initialState,
                  highScore: state.highScore,
                }
              }
              return { // return a new state will all block coloured grey
                ...state,
                canvas: state.canvas.map((row) => {
                  return row.map((block) => {
                    if (block) {
                      block.colour = "grey";
                    }
                    return block;
                  })
                })

              }
            }

            if (event.type !== "movement" && event.type !== "rotation") {
              if (updateActiveBlocks(state).length === 0) { // if all blocks are now inactive
                const updatedState = checkForTetris(state);
                const newBlock = allTetrominoes[RNG.scale(RNG.hash(Date.now()))]; // shoutout Luke Ferrier on Ed for this idea
                const topRowOccupied = updatedState.canvas[0].some((block) => block && !block.isActive); // check if the top row is occupied

                if (topRowOccupied) {
                  return {
                    ...updatedState,
                    highScore: updatedState.score,
                    gameEnd: true, // Set the gameEnd flag to true
                  };
                }

                return {
                  ...updatedState,
                  canvas: spawnTetromino(updatedState.canvas)(updatedState.nextTetromino)(4, 0),
                  previewCanvas: spawnTetromino(Canvas)(newBlock)(2, 3),
                  activeBlockPositions: updateActiveBlocks(updatedState),
                  nextTetromino: newBlock,
                };
              }
              // Just apply gravity
              return {
                ...state,
                canvas: applyGravity(state).canvas,
                previewCanvas: state.previewCanvas,
                activeBlockPositions: updateActiveBlocks(state),
                nextTetromino: state.nextTetromino,
              };
            } else if (event.type === "movement") {
              // return moveMultipleBlocks(state.canvas)(state.activeBlockPositions, event.direction);
              return moveActiveTetromino(state, event.direction);
            }
            else if (event.type === "rotation") {
              // return rotateTetromino(state, event.direction);
              return rotateTetromino(state, event.direction);
            }
            return state;
          },
          initialState
        )
      )

      .subscribe((s: State) => {
        render(s);
        levelText.innerHTML = s.level.toString();
        scoreText.innerHTML = s.score.toString();
        highScoreText.innerHTML = s.highScore ? s.highScore.toString() : "0";


        if (s.gameEnd) {
          svg.appendChild(gameover);
          show(gameover);
        } else {
          hide(gameover);
        }
      });

  }


  // The following simply runs your main function on window load.  Make sure to leave it in place.
  if (typeof window !== "undefined") {
    window.onload = () => {
      main();

    };
  }
