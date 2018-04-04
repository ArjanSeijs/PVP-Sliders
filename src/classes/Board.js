"use strict";
var Tile = require("./Tile");
var Board = /** @class */ (function () {
    /**
     *
     * @param {number} width
     * @param {number} height
     */
    function Board(width, height) {
        this.width = width;
        this.height = height;
        this.metadata = { playerAmount: -1, mapData: {} };
        this.tiles = [];
        this.makeBoard();
    }
    /**
     *
     */
    Board.prototype.makeBoard = function () {
        for (var x = 0; x < this.width; x++) {
            this.tiles[x] = [];
            for (var y = 0; y < this.height; y++) {
                this.tiles[x][y] = new Tile(x, y);
            }
        }
    };
    /**
     *
     * @param {number} x
     * @param {number} y
     * @return {Tile}
     */
    Board.prototype.getTileAt = function (x, y) {
        return this.tiles[x][y];
    };
    /**
     *
     * @return {{width: number, height: number, tiles: {x: number, y: number, wall: boolean}[][]}}
     */
    Board.prototype.toJson = function () {
        return {
            width: this.width,
            height: this.height,
            tiles: this.tiles.map(function (x) { return x.map(function (y) { return y.toJson(); }); })
        };
    };
    return Board;
}());
module.exports = Board;
//# sourceMappingURL=Board.js.map