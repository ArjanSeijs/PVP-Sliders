import ToJson = require("../interfaces/ToJson");

class Tile implements ToJson {

    wall: boolean;
    y: number;
    x: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.wall = false;
    }

    toJson(): { x: number, y: number, wall: boolean } {
        return {
            x: this.x,
            y: this.y,
            wall: this.wall
        }
    }
}

export = Tile