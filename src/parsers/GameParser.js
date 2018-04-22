"use strict";
var Game = require("../classes/Game");
var Player = require("../classes/entities/Player");
var GameParser = (function () {
    function GameParser() {
    }
    GameParser.create = function (board, players, sessions, options) {
        var cellSize = 100;
        var game = new Game(board);
        var i = 0;
        for (var key in sessions) {
            if (!sessions.hasOwnProperty(key))
                continue;
            for (var j = 0; j < sessions[key].ids.length; j++) {
                var pos = board.metadata.mapData[i];
                var session = sessions[key].ids[j];
                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, session.id, session.team, session.name);
                i++;
            }
        }
        return game;
    };
    return GameParser;
}());
module.exports = GameParser;
//# sourceMappingURL=GameParser.js.map