"use strict";
var fs = require("fs");
var path = require("path");
var Board = require("../classes/Board");
var _global = global;
var BoardParser = (function () {
    function BoardParser() {
    }
    BoardParser.init = function () {
        fs.readdirSync(path.join(_global.rootDir, "/public/assets/games/boards/"), "utf8").forEach(function (file) {
            this.boards[file] = BoardParser.fromFile(file);
        });
    };
    BoardParser.fromFile = function (file) {
        var strings = fs.readFileSync(path.join(_global.rootDir, "/public/assets/games/boards/", file), "utf8").split("\n");
        return BoardParser.fromStrings(strings);
    };
    BoardParser.fromStrings = function (strings) {
        if (strings.length === 0) {
            throw new Error("Something went wrong");
        }
        var width = strings[0].length;
        var height = strings.length;
        var board = new Board(width, height);
        var mapData = { playerAmount: 0 };
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var c = strings[y].charAt(x);
                if ('0123456789ABCDEF'.indexOf(c) !== -1) {
                    var player = parseInt(c, 16);
                    mapData[player] = { x: x, y: y };
                    if (player + 1 > board.metadata.playerAmount) {
                        board.metadata.playerAmount = player + 1;
                    }
                }
                if (c === '#') {
                    board.getTileAt(x, y).wall = true;
                }
            }
        }
        board.metadata.mapData = mapData;
        return board;
    };
    return BoardParser;
}());
module.exports = BoardParser;
