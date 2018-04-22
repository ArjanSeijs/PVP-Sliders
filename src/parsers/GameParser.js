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
        for (var key in sessions) {
            if (!sessions.hasOwnProperty(key))
                continue;
            for (var j = 0; j < sessions[key].ids.length; j++) {
                var pos = board.metadata.mapData[i];
                var session = sessions[key].ids[j];
                var team = session.team !== "random" ? session.team : GameParser.randomTeam();
                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, session.id, team, session.name);
                if (session.id > maxId)
                    maxId = session.id;
                i++;
            }
        }
        if (options.bots) {
            for (; i < board.metadata.playerAmount; i++) {
                var pos = board.metadata.mapData[i];
                game.entities[i] = new SimpleBot(pos.x * cellSize, pos.y * cellSize, maxId++, GameParser.randomTeam(), "BOT", game);
            }
        }
        return game;
    };
    GameParser.randomTeam = function () {
        var teams = ["red", "blue", "green", "yellow"];
        return teams[Math.floor(Math.random() * teams.length)];
    };
    return GameParser;
}());
module.exports = GameParser;
//# sourceMappingURL=GameParser.js.map