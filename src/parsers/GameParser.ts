import Game = require("../classes/Game");
import Board = require("../classes/Board");
import Player = require("../classes/entities/Player");
import SimpleBot = require("../classes/entities/SimpleBot");

interface SessionMap {
    [p: string]: { ids: { id: number, name: string, ready: boolean, team: string }[] }
}

interface TeamMap {
    red: number;
    green: number;
    yellow: number;
    blue: number;
    random: number
}

class GameParser {
    /**
     * From the given board and sessions return a game with the correct entities.
     * @param {Board} board
     * @param {number} players
     * @param {SessionMap} sessions
     * @param {{bots: boolean}} options
     * @return {Game}
     */
    static create(board: Board, players: number, sessions: SessionMap, options: { bots: boolean }): Game {
        const cellSize = 100;

        let game = new Game(board);
        let i = 0;
        let maxId = -1;
        let teams = GameParser.teamSizes(sessions);

        for (let key in sessions) {
            if (!sessions.hasOwnProperty(key)) continue;
            for (let session of sessions[key].ids) {

                let pos = board.metadata.mapData[i];
                let team = session.team !== "random" ? session.team : GameParser.randomTeam(teams);

                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, session.id, team, session.name);
                if (session.id > maxId) maxId = session.id;

                i++;
            }
        }

        if (options.bots) {
            teams.random += board.metadata.playerAmount - i;
            for (; i < board.metadata.playerAmount; i++) {
                let pos = board.metadata.mapData[i];
                game.entities[i] = new SimpleBot(pos.x * cellSize, pos.y * cellSize, maxId++, GameParser.randomTeam(teams), "BOT", game);
            }
        }
        return game;
    }

    private static randomTeam(_teams: TeamMap): string {
        let teams = ["red", "blue", "green", "yellow"];
        return teams[Math.floor(Math.random() * teams.length)];
    }

    private static teamSizes(sessions: SessionMap): TeamMap {
        let teams = {red: 0, green: 0, yellow: 0, blue: 0, random: 0};
        for (let key in sessions) {
            if (!sessions.hasOwnProperty(key)) continue;
            for (let session of sessions[key].ids) {
                teams[session.team]++;
            }
        }
        return teams;
    }
}

export = GameParser;