import Tile = require("./Tile");
import ToJson = require("../interfaces/ToJson");

interface MapData {
    [index: number]: { x: number, y: number }
}

interface MetaData {
    playerAmount: number,
    mapData: MapData,
}

class Board implements ToJson {
    tiles: Array<Array<Tile>>;
    width: number;
    height: number;
    metadata: MetaData;

    /**
     *
     * @param {number} width
     * @param {number} height
     */
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.metadata = {playerAmount: -1, mapData: {}};
        this.tiles = [];
        this.makeBoard();
    }

    /**
     *
     */
    private makeBoard(): void {
        for (let x = 0; x < this.width; x++) {
            this.tiles[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.tiles[x][y] = new Tile(x, y);
            }
        }
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @return {Tile}
     */
    getTileAt(x: number, y: number): Tile {
        return this.tiles[x][y];
    }

    /**
     *
     * @return {{width: number, height: number, tiles: {x: number, y: number, wall: boolean}[][]}}
     */
    toJson(): { width: number; height: number; tiles: { x: number; y: number; tile_type: string }[][] } {
        return {
            width: this.width,
            height: this.height,
            tiles: this.tiles.map(x => x.map(y => y.toJson()))
        }
    }
}

export = Board;