import ToJson = require("../interfaces/ToJson");
import Types = require("./Types");

class Tile implements ToJson {

    tile_type: Types;
    y: number;
    x: number;
    pos: { x: number, y: number };

    /**
     * @constructor
     * @param {number} x The tile x-index
     * @param {number} y The tile y-index
     */
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.tile_type = Types.None;
        this.pos = {x: 100 * x, y: 100 * y};
    }

    /**
     *
     * @return {{x: number, y: number, tile_type: string}}
     */
    toJson(): { x: number, y: number, tile_type: string } {
        return {
            x: this.x,
            y: this.y,
            tile_type: this.tile_type.toJson()
        }
    }
}

export = Tile