import * as fs from 'fs';
import * as path from "path";
import Board = require("../classes/Board");
import Types = require("../classes/Types");

const _global: any = global;

interface BIn {
    [index: string]: Board
}

class BoardParser {
    static boards: BIn = {};

    /**
     * Read all the files in the boards directory.
     */
    static init(): void {
        fs.readdirSync(path.join(_global.rootDir, "/public/assets/games/"), "utf8").forEach(function (file) {
            BoardParser.boards[file] = BoardParser.fromFile(file);
        });
    }

    /**
     * Get a board from a file.
     * @param {string} file
     * @return {Board}
     */
    static getBoard(file: string): Board {
        if (this.boards[file]) {
            return this.boards[file];
        }
        try {
            return this.fromFile(file);
        } catch (e) {
            console.warn(e);
            return null;
        }
    }

    /**
     * Parses the file and then parses the board.
     * @param {string} file
     * @return {Board}
     */
    static fromFile(file: string): Board {
        const strings = fs.readFileSync(
            path.join(_global.rootDir, "/public/assets/games/boards/", file), "utf8"
        ).split(/\r?\n/);
        return BoardParser.fromStrings(strings);
    }

    /**
     * Checks if the board is valid
     * @param {string[]} strings
     * @return {{valid: boolean, message?: string, strings?: string[]}}
     */
    static valid(strings: string[]): { valid: boolean, message?: string, strings?: string[] } {
        if (strings.length < 4 || strings.length[0] < 4) {
            return {valid: false, message: "Length must be at least 4 by 4"};
        }
        for (let i = 1; i < strings.length; i++) {
            if (strings[i].length !== strings[0].length && strings[i].length !== 0) return {
                valid: false,
                message: "Not all lengths are the same.",
                strings: strings
            };
        }
        return {valid: true};
    }

    /**
     * Creates a board from a string array.
     * @param {string[]} strings
     * @return {Board}
     */
    static fromStrings(strings: string[]): Board {
        let valid = BoardParser.valid(strings);
        if (!valid.valid) {
            throw new Error(valid.message + "\n" + JSON.stringify(strings));
        }

        const width = strings[0].length;
        const height = strings.length;
        const board = new Board(width, height);
        const mapData = {};
        let playerAmount = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const c = strings[y].charAt(x);
                if ('0123456789ABCDEF'.indexOf(c) !== -1) {
                    let player = parseInt(c, 16);
                    mapData[player] = {x: x, y: y};
                    if (player + 1 > playerAmount) {
                        playerAmount = player + 1;
                    }
                }
                if (c === '#') {
                    board.getTileAt(x, y).tile_type = Types.Wall;
                } else if (c === '+') {
                    board.getTileAt(x, y).tile_type = Types.Stop;
                }
            }
        }
        board.metadata.mapData = mapData;
        board.metadata.playerAmount = playerAmount;
        return board;
    }
}

export = BoardParser;