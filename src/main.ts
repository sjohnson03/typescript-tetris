/**
 * Tetris in TypeScript with RxJS
 * Initial code by T. Dwyer, 2023 from Monash Univeristy
 */

import "./style.css";

import { Observable, fromEvent, interval, merge, } from "rxjs";
import { map, filter, scan, tap, mergeMap, take } from "rxjs/operators";
import { State } from "./state.ts";
import {  makeAllBlocksInactive, checkCollision, checkForTetris, spawnTetromino } from "./util.ts";
import { moveActiveTetromino, updateActiveBlocks, rotateTetromino } from "./movement.ts";
import { Constants, Viewport } from "./consts.ts";
import { allTetrominoes } from "./tetronimo.ts";
import { Canvas } from "./canvas.ts";
import { BlockSize } from "./block.ts";

/** Constants */





// Types of tetrominoes




abstract class RNG {
  private static m = 0x80000000; // 2**31
  private static a = 1103515245;
  private static c = 12345;

  public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;
  // scale has values to between 0 and length of allTetrominoes
  public static scale = (hash: number) => Math.floor(hash / RNG.m * allTetrominoes.length);
}


/** User input */

type Key = "KeyS" | "KeyA" | "KeyD" | "KeyR" | "KeyE";

type Event = "keydown" | "keyup" | "keypress";


/** Utility functions */


// ** MOVEMENT FUNCTIONS **







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
      if (row === Constants.GRID_HEIGHT + state.level || checkCollision(state.canvas)(state.activeBlockPositions, { x: 0, y: 1 })) { // check if block is at the bottom of the canvas
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


// Initial state for starting a game
const initialState: State = {
  canvas: Canvas,
  previewCanvas: Canvas,
  activeBlockPositions: [],
  score: 0,
  level: 1,
  highScore: 0,
  gameEnd: false,
  nextTetromino: allTetrominoes[RNG.scale(RNG.hash(Date.now()))],
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
  
  

  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   * 
   */

  const render = (s: State) => {
    // Render the main display canvas
    updateDisplayedCanvas(s.canvas, svg);
    // Render the preview canvas
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
              const newBlock = allTetrominoes[RNG.scale(RNG.hash(Date.now()))]; // shoutout Luke Ferrier on Ed for this idea, idk if this is pure though
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
