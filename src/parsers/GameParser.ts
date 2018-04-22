import Game = require("../classes/Game");
import Board = require("../classes/Board");
import Player = require("../classes/entities/Player");
import SimpleBot = require("../classes/entities/SimpleBot");

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
        let maxId = -1;
        for (let key in sessions) {
            if (!sessions.hasOwnProperty(key)) continue;
            for (let j = 0; j < sessions[key].ids.length; j++) {
                let pos = board.metadata.mapData[i];
                let session = sessions[key].ids[j];
                let team = session.team !== "random" ? session.team : GameParser.randomTeam();
                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, session.id, team, session.name);
                if (session.id > maxId) maxId = session.id;
                i++;
            }
        }
        if (options.bots) {
            for (; i < board.metadata.playerAmount; i++) {
                let pos = board.metadata.mapData[i];
                game.entities[i] = new SimpleBot(pos.x * cellSize, pos.y * cellSize, maxId++, GameParser.randomTeam(), "BOT", game);
            }
        }
        return game;
    }

    private static randomTeam(): string {
        let teams = ["red", "blue", "green", "yellow"];
        return teams[Math.floor(Math.random() * teams.length)];
    }
}

export = GameParser;