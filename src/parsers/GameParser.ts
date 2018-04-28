import Game = require("../classes/Game");
import Board = require("../classes/Board");
import Player = require("../classes/entities/Player");
import SimpleBot = require("../classes/entities/SimpleBot");
import config = require("../lib/config");
import {isNullOrUndefined} from "util";

interface SessionMap {
    [p: string]: { ids: { id: number, name: string, ready: boolean, team: string }[] }
}

interface TeamMap {
    [k: string]: number;
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
        if (board.metadata.playerAmount < players) return null;
        for (let key in sessions) {
            if (!sessions.hasOwnProperty(key)) continue;
            for (let session of sessions[key].ids) {

                let pos = board.metadata.mapData[i];
                if (isNullOrUndefined(pos)) return null;
                let team = session.team !== "random" ? session.team : GameParser.randomTeam(teams, false, i, players);

                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, session.id, team, session.name);
                if (session.id > maxId) maxId = session.id;

                i++;
            }
        }

        if (options.bots) {
            teams.random += board.metadata.playerAmount - i;
            for (; i < board.metadata.playerAmount; i++) {
                let pos = board.metadata.mapData[i];
                game.entities[i] = new SimpleBot(pos.x * cellSize, pos.y * cellSize, maxId++, GameParser.randomTeam(teams, true, i, players), "BOT", game);
            }
        }
        return game;
    }

    static randomTeam(_teams: TeamMap, isBot: boolean, i: number, max: number): string {
        let allTeams = config.get("teams");
        let filteredTeams = GameParser.mapTeams(allTeams, _teams);
        filteredTeams = filteredTeams.filter(t => t.amount !== 0);

        //Choose random if only 0 or 1 teams already has a player
        if (filteredTeams.length === 1 || filteredTeams.length === 0) {
            if (filteredTeams.length === 1) {
                allTeams.splice(allTeams.indexOf(filteredTeams[0].team), 1);
            }
            let result = allTeams[Math.floor(Math.random() * allTeams.length)];
            _teams[result]++;
            _teams.random--;
            return result;
        } else {
            //Choose the team with least amount of players when there are more than two teams with players.
            let result = filteredTeams[0].team;
            _teams[result]++;
            _teams.random--;
            return result;
        }

    }

    private static mapTeams(allTeams: string[], _teams: TeamMap): { team: string; amount: any }[] {
        return allTeams.map(k => {
            return {team: k, amount: _teams[k]};
        }).sort((a, b) => a.amount - b.amount);
    }

    private static teamSizes(sessions: SessionMap): TeamMap {
        let teams: TeamMap = {random: 0};
        for (let team of config.get("teams")) {
            teams[team] = 0;
        }
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