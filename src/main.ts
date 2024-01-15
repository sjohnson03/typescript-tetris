/**
 * Tetris in TypeScript with RxJS
 * Initial code by T. Dwyer, 2023 from Monash Univeristy
 */

import "./style.css";

import { Observable, fromEvent, interval, merge, } from "rxjs";
import { map, filter, scan, tap, mergeMap, take } from "rxjs/operators";
import { State } from "./state.ts";
import {  checkForTetris, spawnTetromino } from "./util.ts";
import { moveActiveTetromino, updateActiveBlocks, rotateTetromino, applyGravity } from "./movement.ts";
import { Constants, Viewport } from "./consts.ts";
import { allTetrominoes } from "./tetronimo.ts";
import { Canvas, gameover, preview, svg } from "./canvas.ts";
import { render, show, hide } from "./render.ts";



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



/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main() {


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
