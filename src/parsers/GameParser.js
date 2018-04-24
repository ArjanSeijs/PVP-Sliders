"use strict";
var Game = require("../classes/Game");
var Player = require("../classes/entities/Player");
var SimpleBot = require("../classes/entities/SimpleBot");
var GameParser = (function () {
    function GameParser() {
    }
    GameParser.create = function (board, players, sessions, options) {
        var cellSize = 100;
        var game = new Game(board);
        var i = 0;
        var maxId = -1;
        var teams = GameParser.teamSizes(sessions);
        for (var key in sessions) {
            if (!sessions.hasOwnProperty(key))
                continue;
            for (var _i = 0, _a = sessions[key].ids; _i < _a.length; _i++) {
                var session = _a[_i];
                var pos = board.metadata.mapData[i];
                var team = session.team !== "random" ? session.team : GameParser.randomTeam(teams);
                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, session.id, team, session.name);
                if (session.id > maxId)
                    maxId = session.id;
                i++;
            }
        }
        if (options.bots) {
            teams.random += board.metadata.playerAmount - i;
            for (; i < board.metadata.playerAmount; i++) {
                var pos = board.metadata.mapData[i];
                game.entities[i] = new SimpleBot(pos.x * cellSize, pos.y * cellSize, maxId++, GameParser.randomTeam(teams), "BOT", game);
            }
        }
        return game;
    };
    GameParser.randomTeam = function (_teams) {
        var teams = ["red", "blue", "green", "yellow"];
        return teams[Math.floor(Math.random() * teams.length)];
    };
    GameParser.teamSizes = function (sessions) {
        var teams = { red: 0, green: 0, yellow: 0, blue: 0, random: 0 };
        for (var key in sessions) {
            if (!sessions.hasOwnProperty(key))
                continue;
            for (var _i = 0, _a = sessions[key].ids; _i < _a.length; _i++) {
                var session = _a[_i];
                teams[session.team]++;
            }
        }
        return teams;
    };
    return GameParser;
}());
module.exports = GameParser;
//# sourceMappingURL=GameParser.js.map