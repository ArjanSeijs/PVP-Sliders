"use strict";
var Tile = require("./Tile");
var Board = (function () {
    function Board(width, height) {
        this.width = width;
        this.height = height;
        this.metadata = { playerAmount: -1, mapData: {} };
        this.tiles = [];
        this.makeBoard();
    }
    Board.prototype.makeBoard = function () {
        for (var x = 0; x < this.width; x++) {
            this.tiles[x] = [];
            for (var y = 0; y < this.height; y++) {
                this.tiles[x][y] = new Tile(x, y);
            }
        }
    };
    Board.prototype.getTileAt = function (x, y) {
        return this.tiles[x][y];
    };
    Board.prototype.toJson = function () {
        return {
            players: this.metadata.playerAmount,
            width: this.width,
            height: this.height,
            tiles: this.tiles.map(function (x) { return x.map(function (y) { return y.toJson(); }); })
        };
    };
    Board.prototype.clone = function () {
        var board = new Board(this.width, this.height);
        board.metadata = this.metadata;
        for (var x = 0; x < board.width; x++) {
            for (var y = 0; y < board.height; y++) {
                board.tiles[x][y].tile_type = this.getTileAt(x, y).tile_type;
            }
        }
        return board;
    };
    return Board;
}());
module.exports = Board;
//# sourceMappingURL=Board.js.map