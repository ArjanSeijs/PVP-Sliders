"use strict";
var Tile = (function () {
    function Tile(x, y) {
        this.x = x;
        this.y = y;
        this.wall = false;
    }
    Tile.prototype.toJson = function () {
        return {
            x: this.x,
            y: this.y,
            wall: this.wall
        };
    };
    return Tile;
}());
module.exports = Tile;
