"use strict";
var Game = require("../classes/Game");
var Player = require("../classes/entities/Player");
var GameParser = (function () {
    function GameParser() {
    }
    GameParser.create = function (board, players) {
        //TODO improve.
        var cellSize = 100;
        var game = new Game(board);
        // TODO
        function temp(i) {
            return i < players / 2 ? "red" : "yellow";
        }
        var i = 0;
        while (i < players) {
            //P1
            var pos = board.metadata.mapData[i];
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
    };
    return GameParser;
}());
module.exports = GameParser;
