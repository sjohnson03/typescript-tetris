# Tetris in TypeScript
Originally created as part of an assignment for a functional programming course. This is a simple recreation of the popular game Tetris built TypeScript with RxJS.

A large focus on the code was immutability. This helped to write safer code and eliminate unpredictable behavior. This heavy emphasis on immutability was supported with the extensive use of RxJS functions.


## Usage

Setup (requires node.js):
```
> npm install
```

Serve up the App (and ctrl-click the URL that appears in the console)
```
> npm run dev
```

## Gameplay
Game starts with an empty 20 x 10 grid. A random piece is chosen and is spawned from the top of the grid. The piece then slowly moves down the board to the bottom of the screen. While it is moving it is able to be controlled by the player with movement left, right, and down as well as rotation both anti-clockwise and clockwise. Once a piece touches the ground it cannot move.

Once a piece is placed another piece is spawned. The next piece is displayed in the preview window. The next piece is always randomly selected from a small group of total pieces. Once a peice lands on another piece (cannot move down past it) the piece is locked in place and cannot move.

Everytime an entire row is filled with blocks a line clear occurs. This increases the players overall score and clear the blocks from the grid. After enough points are earned by the player, the level of the game increases. This ramps up the difficulty and multiplies the points the player gains. The game is over when a new block is unable to be spawned as it is being blocked by another block.


## TODO
 - Improve visual design (styling, scary)
