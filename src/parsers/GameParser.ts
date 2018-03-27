import Game = require("../classes/Game");
import Player = require("../classes/entities/Player");
import Board = require("../classes/Board");

class GameParser {
    static create(board: Board, players: number): Game {
        //TODO improve.
        const cellSize = 100;
        let game = new Game(board);

        // TODO
        function temp(i) {
            return i < players / 2 ? "red" : "yellow";
        }

        let i = 0;
        while (i < players) {
            //P1
            let pos = board.metadata.mapData[i];
            game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, i, temp(i));
            i++;
            // if (i >= players) break;
            // //P2
            // if (UUIDs.uuid2) {
            //     let pos = board.mapData[i];
            //     game.entities[UUIDs.uuid2] = new Player(pos.x * cellSize, pos.y * cellSize, i, temp(i));
            //     i++;
            //     if (i >= players) break;
            // }
        }
        return game;
    }
}

export = GameParser;