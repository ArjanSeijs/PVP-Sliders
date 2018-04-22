import Game = require("../classes/Game");
import Board = require("../classes/Board");
import Player = require("../classes/entities/Player");

interface map {
    [p: string]: { ids: { id: number, name: string, ready: boolean, team: string }[] }
}

class GameParser {
    /**
     * From the given board and sessions return a game with the correct entities.
     * @param {Board} board
     * @param {number} players
     * @param {map} sessions
     * @param {{bots: boolean}} options
     * @return {Game}
     */
    static create(board: Board, players: number, sessions: map, options: { bots: boolean }): Game {
        const cellSize = 100;
        let game = new Game(board);
        let i = 0;
        for (let key in sessions) {
            if (!sessions.hasOwnProperty(key)) continue;
            for (let j = 0; j < sessions[key].ids.length; j++) {
                let pos = board.metadata.mapData[i];
                let session = sessions[key].ids[j];
                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, session.id, session.team, session.name);
                i++;
            }
        }
        //TODO BOTS;
        return game;
    }
}

export = GameParser;