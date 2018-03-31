"use strict";
var Game = require("../classes/Game");
var Player = require("../classes/entities/Player");
var GameParser = /** @class */ (function () {
    function GameParser() {
    }
    GameParser.create = function (board, players, sessions) {
        //TODO improve.
        var cellSize = 100;
        var game = new Game(board);
        var i = 0;
        for (var key in sessions) {
            if (!sessions.hasOwnProperty(key))
                continue;
            for (var j = 0; j < sessions[key].ids.length; j++) {
                var pos = board.metadata.mapData[i];
                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, sessions[key].ids[j].id, temp(i));
                i++;
            }
        }
        // TODO
        function temp(i) {
            return i < players / 2 ? "red" : "yellow";
        }
        return game;
    };
    return GameParser;
}());
module.exports = GameParser;
//# sourceMappingURL=GameParser.js.map