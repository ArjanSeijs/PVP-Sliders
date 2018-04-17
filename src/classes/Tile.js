"use strict";
var Types = require("./Types");
var Tile = (function () {
    function Tile(x, y) {
        this.x = x;
        this.y = y;
        this.tile_type = Types.None;
        this.pos = { x: 100 * x, y: 100 * y };
    }
    Tile.prototype.toJson = function () {
        return {
            x: this.x,
            y: this.y,
            tile_type: this.tile_type.toJson()
        };
    };
    return Tile;
}());
module.exports = Tile;
//# sourceMappingURL=Tile.js.map