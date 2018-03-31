import Tile = require("./Tile");
import ToJson = require("../interfaces/ToJson");

class Board implements ToJson {
    tiles: Array<Array<Tile>>;
    width: number;
    height: number;
    metadata: any;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.metadata = {};
        this.tiles = [];
        this.makeBoard();
    }

    private makeBoard(): void {
        for (let x = 0; x < this.width; x++) {
            this.tiles[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.tiles[x][y] = new Tile(x, y);
            }
        }
    }

    getTileAt(x: number, y: number): Tile {
        return this.tiles[x][y];
    }

    toJson(): { width: number; height: number; tiles: { x: number; y: number; wall: boolean }[][] } {
        return {
            width: this.width,
            height: this.height,
            tiles: this.tiles.map(x => x.map(y => y.toJson()))
        }
    }
}

export = Board;