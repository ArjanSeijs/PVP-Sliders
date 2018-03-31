import Game = require("../classes/Game");
import Board = require("../classes/Board");
import Player = require("../classes/entities/Player");

interface map {
    [p: string]: { ids: { id: number; name: string }[] }
}

class GameParser {
    static create(board: Board, players: number, sessions: map): Game {
        //TODO improve.
        const cellSize = 100;
        let game = new Game(board);
        let i = 0;
        for (let key in sessions) {
            if (!sessions.hasOwnProperty(key)) continue;
            for (let j = 0; j < sessions[key].ids.length; j++) {
                let pos = board.metadata.mapData[i];
                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, sessions[key].ids[j].id, temp(i));
                i++;
            }
        }

        // TODO
        function temp(i) {
            return i < players / 2 ? "red" : "yellow";
        }
        return game;
    }
}

export = GameParser;