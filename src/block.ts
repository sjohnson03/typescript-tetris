import { Viewport, Constants } from "./consts";

/**
  * Creates a block with the specified colour and status. Just a bit easier to instantiate blocks this way
  * @param colour Colour of the block
  * @param status Status of the block expressed as a boolean
  * @returns Block with the specified colour and status
*/
export const createBlock = (colour: Colour, status = true): Block => ({
    colour,
    isActive: status,
  });


export const BlockSize = {
    WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
    HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
  };
  
export type Colour = "aqua" | "red" | "blue" | "green" | "yellow" | "purple" | "orange" | "grey";
  
export type Block = {
    colour: Colour;
    isActive?: boolean; // status indicating if the block is currently controlled by the player
  }
  
export type Tetromino = {
    blocks: [Block, number, number][]; // array of blocks and their positions
  }