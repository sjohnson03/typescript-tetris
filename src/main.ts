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

import { Observable, fromEvent, interval, merge, of } from "rxjs";
import { map, filter, scan, tap, takeUntil, switchMap } from "rxjs/operators";

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

const Canvas: (Block | undefined)[][] = new Array(Constants.GRID_HEIGHT).fill(new Array(Constants.GRID_WIDTH).fill(undefined));

type Colour = "aqua" | "red" | "blue" | "green" | "yellow" | "purple" | "orange";

type Block = {
  colour: Colour;
  isActive?: boolean; // status indicating if the block is currently controlled by the player
}


/**
  * Creates a block with the specified colour and status
  * @param colour Colour of the block
  * @param status Status of the block
  * @returns Block with the specified colour and status
*/
const createBlock = (colour: Colour, status = true): Block => ({
  colour,
  isActive: status,
});

// Types of blocks

const squareBlock = 
  // [][]
  // [][]
  [
    { x: 0, y: 0, colour: "aqua" as Colour} as Block,
    { x: 1, y: 0, colour: "aqua" as Colour } as Block,
    { x: 0, y: 1, colour: "aqua" as Colour } as Block,
    { x: 1, y: 1, colour: "aqua" as Colour } as Block,
  ]


const longBlock = 
  // [][][][]
  [ 
    { x: 0, y: 1, colour: "red" as Colour} as Block,
    { x: 1, y: 1, colour: "red" as Colour} as Block,
    { x: 2, y: 1, colour: "red" as Colour} as Block,
    { x: 3, y: 1, colour: "red" as Colour} as Block,
  ]  

const rightAngleBlock = { 
  // [][][]
  //     []
  blocks: [
    [0,1], [1,1], [2,1], [2,0]
  ],
  colour: "blue" as Colour
};

const leftAngleBlock = {
  //
  //  [][][]
  //  []
  blocks: [
    [0,0], [0,1], [1,1], [2,1]
  ],
  colour: "green" as Colour
}

const tBlock = {
  //
  //  [][][]
  //    []
  blocks: [
    [0,1], [1,1], [2,1], [1,0]
  ],
  colour: "yellow" as Colour
}

const zBlock = {
  //
  // [][]
  //   [][]
  blocks: [
    [0,1], [1,1], [1,0], [2,0]
  ],
  colour: "purple" as Colour
}

const sBlock = {
  //
  //   [][]
  // [][]
  blocks: [
    [0,0], [1,0], [1,1], [2,1]
  ],
  colour: "orange" as Colour
}

const allBlocks = [squareBlock, longBlock, rightAngleBlock, leftAngleBlock, tBlock, sBlock, zBlock];

abstract class RNG {
  private static m = 0x80000000; // 2**31
  private static a = 1103515245;
  private static c = 12345;

  public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;
  // scale has values to between 0 and length of allBlocks[]
  public static scale = (hash: number) => Math.floor(hash / RNG.m * allBlocks.length);
}

function createRNGStreamFromSource<T>(source$: Observable<T>){
  return function createRNGStream(
    seed: number = 0,
  ): Observable<Number>{
    const randomNumberStream = source$.pipe(
      scan((acc, _) => RNG.hash(acc), seed),
      map(RNG.scale),
    );
    return randomNumberStream;
  };
}

const randomStream = createRNGStreamFromSource(interval(1000));
// we use this to create random blocks

const randomBlockStream = randomStream(5).pipe(
  // a stream of random blocks which can be spawned.
  map((randomNumber) => {
    allBlocks[+randomNumber];
  })
);


/** User input */

type Key = "KeyS" | "KeyA" | "KeyD";

type Event = "keydown" | "keyup" | "keypress";


/** Utility functions */


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
    canvas: updatedCanvas,
    activeBlockPositions: [],
    gameEnd: false,
  };
};



/**
 * Moves all currently active blocks in specified direction
 * @param state Current state of active blocks
 * @param direction Movement direction (e.g., { x: -1, y: 0 } for left)
 * @returns Updated state
 */
const moveActiveBlocks = (state: State, direction: { x: number; y: number }): State => {
  const activeBlockPositions = updateActiveBlocks(state);

  if (activeBlockPositions.length > 0 && (direction.x < 0 || direction.y > 0)) { // if we are moving left
    const updatedCanvas = activeBlockPositions.reduce((canvas, position) => { // for each active block we move it in the specified direction
      const newPosition = {
        x: position.x + direction.x,
        y: position.y + direction.y,
      };
      return moveBlock(canvas)(
        position.x,
        position.y
      )(newPosition.x, newPosition.y);
    }, state.canvas);

    return {
      canvas: updatedCanvas,
      activeBlockPositions: updateActiveBlocks({
        canvas: updatedCanvas,
        activeBlockPositions: activeBlockPositions,
        gameEnd: false,
      }),
      gameEnd: false,
    };
  }
  else if (activeBlockPositions.length > 0 && direction.x > 0) { // if we are moving right
    const updatedCanvas = activeBlockPositions.reduceRight((canvas, position) => { // for each active block we move it in the specified direction
      // we use reduceRight to read the array from right to left which prevents 
      const newPosition = {
        x: position.x + direction.x,
        y: position.y + direction.y,
      };
      return moveBlock(canvas)(
        position.x,
        position.y
      )(newPosition.x, newPosition.y);
    }, state.canvas);

    return {
      canvas: updatedCanvas,
      activeBlockPositions: updateActiveBlocks({
        canvas: updatedCanvas,
        activeBlockPositions: activeBlockPositions,
        gameEnd: false,
      }),
      gameEnd: false,
    };
  }

  return state;
};

/**
 * Updates the activeBlocks array stored in the state for the currently active blocks in our game
 * @param state Current state
 * @returns New activeBlocks array
*/
const updateActiveBlocks = (state: State): { x: number; y: number }[]  => {
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
 * Moves a block at a specified position on the canvas to a new position
 * considering potential interactions with other blocks.
 * @param canvas Canvas to update
 * @param x x-coordinate of block to move
 * @param y y-coordinate of block to move
 * @param newX x-coordinate of new position
 * @param newY y-coordinate of new position
 * @returns New Canvas with specified block moved to its new position
 */
const moveBlock = (canvas: Canvas,) => (  x: number,  y: number,) => (  newX: number,  newY: number,): Canvas => {
  const block = canvas[y][x];

  if (newX < 0 || newX >= Constants.GRID_WIDTH) {
    return canvas; // If the new position is outside the canvas, return unchanged canvas
  }

  if (newX >= 0 && newX < Constants.GRID_WIDTH && !canvas[newY][newX]) {
    const tempCanvas = removeBlockFromCanvas(canvas)(x, y);
    const updatedCanvas = addBlockToCanvas(tempCanvas)(block)(newX, newY);
    return updatedCanvas;
  } 
  // else if (block !== undefined && block.isActive) {
  //   console.log(canvas)
  //   const dirX = newX - x;
  //   const dirY = newY - y;

  //   // const updatedCanvas = addBlockToCanvas(canvas)(block)(newX, newY);

  //   const movedCanvas = moveBlock(canvas)(newX, newY)(newX + dirX, newY + dirY);
  //   console.log(movedCanvas)
  //   const tempCanvas = removeBlockFromCanvas(movedCanvas)(x, y);
  //   const updatedCanvas = addBlockToCanvas(tempCanvas)(block)(newX, newY);

  //   return updatedCanvas;
  // }

  return canvas;
};




/**
 * Moves multiple blocks in the specified direction
 * @param canvas Canvas to update
 * @param blockPositions Array of block positions to move
 * @param direction Movement direction
 * @returns Updated canvas with blocks moved
 */
const moveMultipleBlocks = (canvas: Canvas) => (blockPositions: { x: number; y: number }[], direction: { x: number; y: number }): Canvas => {
  return blockPositions.reduce((updatedCanvas, position) => {
    const { x, y } = position;
    const newX = x + direction.x;
    const newY = y + direction.y;

    return moveBlock(updatedCanvas)(x, y)(newX, newY);
  }, canvas);
};



  /**
   * Applies gravity to the currently active (controlled by the player) blocks on the canvas.
   * This is done recursively starting from the bottom row and making our way up
   * @param state Current state
   * @param row Current row to process
   * @param col Current column to process
   * @returns Updated state
  */
  function applyGravity(state: State, row: number = Constants.GRID_HEIGHT - 1, col: number = 0): State {
    if (row < 0) {
      return state; // Base case: we have processed all rows
    }
  
    if (col >= Constants.GRID_WIDTH) {
      return applyGravity(state, row - 1, 0); // Move to the previous row
    }
  
    const currBlock = state.canvas[row][col];
  
    if (currBlock !== undefined) {
      if ("colour" in currBlock && currBlock.isActive) { // check to see if of type block and if block is active
        if (row === Constants.GRID_HEIGHT - 1) { // check if block is at the bottom of the canvas
          return makeAllBlocksInactive(state); // make all blocks inactive
          
        } else if (state.canvas[row + 1][col]) { // check if there is a block below the current block
          return applyGravity(state, row, col + 1); // Move to the next column

        } else { // move the block down by one row
          const updatedCanvas = moveMultipleBlocks(state.canvas)(state.activeBlockPositions, { x: 0, y: 1 }); // move all active blocks down 1
          return applyGravity({
            canvas: updatedCanvas, gameEnd: false,
            activeBlockPositions: state.activeBlockPositions
          }, row - 1, col);
        }
      } else {
        return applyGravity(state, row, col + 1); // Move to the next column
      }
    } else {
      return applyGravity(state, row, col + 1); // Move to the next column
    }
  }

/** State processing */

type State = Readonly<{
  canvas: (Block | undefined)[][];
  activeBlockPositions: { x: number; y: number }[];
  gameEnd: boolean;
}>;

const initialState: State = {
  canvas: Canvas,
  activeBlockPositions: [],
  gameEnd: false,
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

  /** Observables */
  const moveLeft$ = left$.pipe(map(() => ({ x: -1, y: 0 })));
  const moveRight$ = right$.pipe(map(() => ({ x: 1, y: 0 })));
  const moveDown$ = down$.pipe(map(() => ({ x: 0, y: 1 })));

  const movement$ = merge(moveLeft$, moveRight$, moveDown$).pipe(
    map((movement) => ({ type: "movement", direction: movement }))
  );


  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS);

  /**
   * Transforms the canvas into a 2D array of SVG elements.
   * @param canvas Canvas to transform
   * @returns 2D array of SVG elements
   * 
  */
  const transformCanvasToSVG = (canvas: Canvas): SVGElement[][] => {
    // Create a 2D array of SVG elements
    const SVGElements: SVGElement[][] = canvas.map((row, index) => {// for each row in the input canvas
      return row.map((block, colIndex) => { // for each block in the row
        if (block) { // check if there is a block
          const cube = createSvgElement(svg.namespaceURI, "rect", { // create an element for the block
            height: `${BlockSize.HEIGHT}`,
            width: `${BlockSize.WIDTH}`,
            x: `${BlockSize.WIDTH * (colIndex)}`,
            y: `${BlockSize.HEIGHT * (index)}`,
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
  const updateDisplayedCanvas = (canvas: Canvas) => {
    // Clear the SVG canvas by removing all child nodes
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
  
    const svgElements = transformCanvasToSVG(canvas); // Transform the canvas to SVG elements
  
    svgElements.forEach((row) => {
      row.forEach((block) => {
        if (block) {
          svg.appendChild(block); // Append each SVG element to the SVG canvas
        }
      });
    });
  };



  const gravityTest = {
    canvas: addBlockToCanvas(addBlockToCanvas(addBlockToCanvas(Canvas)(createBlock("aqua", true))(4, 0))(createBlock("red", true))(5, 0))(createBlock("green", true))(6, 0),
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
    updateDisplayedCanvas(s.canvas);


    // Add a block to the preview canvas
    const cubePreview = createSvgElement(preview.namespaceURI, "rect", {
      height: `${BlockSize.HEIGHT}`,
      width: `${BlockSize.WIDTH}`,
      x: `${BlockSize.WIDTH * 2}`,
      y: `${BlockSize.HEIGHT}`,
      style: "fill: green",
    });
    preview.appendChild(cubePreview);
  };


  const source$ = merge(tick$, movement$)
  .pipe(
    scan(
      (state: State, event: any) => {
        if (event.type !== "movement") {
          return {
            canvas: applyGravity(state).canvas,
            activeBlockPositions: updateActiveBlocks(state),
            gameEnd: false,
          };
        } else if (event.type === "movement") {
          return moveActiveBlocks(state, event.direction);
        }
        return state;
      },
      gravityTest
    )
  )

  .subscribe((s: State) => {
    render(s);

    if (s.gameEnd) {
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
