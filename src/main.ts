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

import { Observable, fromEvent, interval, merge } from "rxjs";
import { map, filter, scan, tap, takeUntil } from "rxjs/operators";

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
}
/** Creates a single block at specified coordinates of specified colour
  * @param x x-coordinate of block relative to each other
  * @param y y-coordinate of block relative to each other
  * @param colour colour of block
  * @returns Block object
*/
const createBlock = (colour: Colour) : Block => ({
  colour
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





/** State processing */

type State = Readonly<{
  canvas: (Block | undefined)[][];
  gameEnd: boolean;
}>;

const initialState: State = {
  canvas: Canvas,
  gameEnd: false,
} as const;

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
  const action$ = merge(left$, right$, down$)
    .subscribe()


  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS);
  


  /**
  Add a block to the canvas
  * @param block BlockSize to draw
  * @returns SVG element representing the block
  */
  const addBlockToCanvas = (canvas:Canvas) => (block: Block | undefined) => (x: number, y: number): Canvas => {
    const updatedCanvas = canvas.map((row, rowIndex) =>
      row.map((currentBlock, colIndex) =>
        rowIndex === y && colIndex === x
          ? block // Add the new block at the specified position
          : currentBlock // otherwise keep the already existing block
      )
    );
    return updatedCanvas;
  };

  const removeBlockFromCanvas = (canvas: Canvas) => (x: number, y: number): Canvas => {
    const updatedCanvas = canvas.map((row, rowIndex) =>
      row.map((currentBlock, colIndex) =>
        rowIndex === y && colIndex === x
          ? undefined // remove the block at the specified position
          : currentBlock // otherwise keep the block
      )
    );
    return updatedCanvas;
  };

  const moveBlock = (canvas: Canvas) => (x: number, y: number) => (newX: number, newY: number): Canvas => {
    const tempCanvas = addBlockToCanvas(canvas)(canvas[y][x])(newX, newY);
    const updatedCanvas = removeBlockFromCanvas(tempCanvas)(x, y);

    return updatedCanvas;
  };


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
            height: '0',
            width: '0',
            x: '0',
            y: '0',
            style: "fill: black",
          });
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
    transformCanvasToSVG(canvas).map((row) => {
      row.map((block) => {
        if (block){svg.appendChild(block)}
      });
    });
  };

  // function applyGravity(state: State) {
  //   const newState = {
  //     canvas: state.canvas.map((row, rowIndex) => {
  //       return row.map((block, colIndex) => {
  //         if (block) {
  //           if (
  //             rowIndex === Constants.GRID_HEIGHT - 1 || // If at the bottom
  //             state.canvas[rowIndex + 1][colIndex] // If there is a block below
  //           ) {
  //             return block; // Block can't move down
  //           } else {
  //             removeBlockFromCanvas(newState.canvas)(rowIndex, colIndex); // Remove the block from its current location
  //             addBlockToCanvas(newState.canvas)(createBlock(block.colour))(rowIndex, colIndex); // Move the block down
  //           }
  //         } else {
  //           return block;
  //         }
  //       });
  //     })
  //   };
  //   console.log(newState.canvas)
  //   return newState;
  // }
  
  
  

const gravityTest = {
  canvas: addBlockToCanvas(Canvas)(createBlock("aqua"))(5,0),
  gameEnd: false
}


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


    // const cube = createSvgElement(svg.namespaceURI, "rect", {
    //   height: `${BlockSize.HEIGHT}`,
    //   width: `${BlockSize.WIDTH}`,
    //   x: "0",
    //   y: "0",
    //   style: "fill: green",
    // });
    // svg.appendChild(cube);
    // const cube2 = createSvgElement(svg.namespaceURI, "rect", {
    //   height: `${BlockSize.HEIGHT}`,
    //   width: `${BlockSize.WIDTH}`,
    //   x: `${BlockSize.WIDTH * (3 - 1)}`,
    //   y: `${BlockSize.HEIGHT * (20 - 1)}`,
    //   style: "fill: red",
    // });
    // svg.appendChild(cube2);
    // const cube3 = createSvgElement(svg.namespaceURI, "rect", {
    //   height: `${BlockSize.HEIGHT}`,
    //   width: `${BlockSize.WIDTH}`,
    //   x: `${BlockSize.WIDTH * (4 - 1)}`,
    //   y: `${BlockSize.HEIGHT * (20 - 1)}`,
    //   style: "fill: blue",
    // })
    // svg.appendChild(cube3);

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

  const source$ = merge(tick$)  
    .pipe(
      scan((s: State) => ({ 
      canvas: moveBlock(s.canvas)(5, 0)(5, 1),
      gameEnd: false
    }), gravityTest
    ),
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
