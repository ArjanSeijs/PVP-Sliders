"use strict";
var fs = require("fs");
var path = require("path");
var Board = require("../classes/Board");
var Types = require("../classes/Types");
var _global = global;
var EXTENSION = ".txt";
var BoardParser = (function () {
    function BoardParser() {
    }
    BoardParser.init = function () {
        fs.readdirSync(path.join(_global.rootDir, "/public/assets/games/"), "utf8").forEach(function (file) {
            if (file.substr(file.length - 3, 3) === EXTENSION)
                BoardParser.boards[file] = BoardParser.fromFile(file);
        });
    };
    BoardParser.getBoard = function (file) {
        if (this.boards[file]) {
            return this.boards[file];
        }
        try {
            return this.fromFile(file);
        }
        catch (e) {
            console.warn(e);
            return null;
        }
    };
    BoardParser.fromFile = function (file) {
        var strings = fs.readFileSync(path.join(_global.rootDir, "/public/assets/games/", file), "utf8").split(/\r?\n/);
        return BoardParser.fromStrings(strings);
    };
    BoardParser.valid = function (strings) {
        if (strings.length < 4 || strings.length[0] < 4) {
            return { valid: false, message: "Length must be at least 4 by 4" };
        }
        for (var i = 1; i < strings.length; i++) {
            if (strings[i].length !== strings[0].length && strings[i].length !== 0)
                return {
                    valid: false,
                    message: "Not all lengths are the same.",
                    strings: strings
                };
        }
        return { valid: true };
    };
    BoardParser.fromStrings = function (strings) {
        var valid = BoardParser.valid(strings);
        if (!valid.valid) {
            throw new Error(valid.message + "\n" + JSON.stringify(strings));
        }
        strings = strings.filter(function (v) { return v !== ""; });
        var width = strings[0].length;
        var height = strings.length;
        var board = new Board(width, height);
        var mapData = {};
        var playerAmount = 0;
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var c = strings[y].charAt(x);
                if ('0123456789ABCDEFabcdef'.indexOf(c) !== -1) {
                    var player = parseInt(c, 16);
                    mapData[player] = { x: x, y: y };
                    if (player + 1 > playerAmount) {
                        playerAmount = player + 1;
                    }
                }
                if (c === '#') {
                    board.getTileAt(x, y).tile_type = Types.Wall;
                }
                else if (c === '+') {
                    board.getTileAt(x, y).tile_type = Types.Stop;
                }
            }
        }
        board.metadata.mapData = mapData;
        board.metadata.playerAmount = playerAmount;
        return board;
    };
    BoardParser.boards = {};
    return BoardParser;
}());
module.exports = BoardParser;
//# sourceMappingURL=BoardParser.js.map