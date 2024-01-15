/**
 * Tetrominoes are the shapes that make up the game of Tetris. They are composed of four square blocks arranged in different configurations.
 * File contains all the tetrominoes used in the game.
 */

import {Tetromino, createBlock} from "./block";

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

export const allTetrominoes = [squareBlock, longBlock, rightAngleBlock, leftAngleBlock, tBlock, zBlock, sBlock];