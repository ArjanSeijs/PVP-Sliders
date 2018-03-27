import * as fs from 'fs';
import * as path from "path";
import Board = require("../classes/Board");

const _global: any = global;

interface BIn {
    [index: string]: Board
}

class BoardParser {
    static boards: BIn;

    static init(): void {
        fs.readdirSync(path.join(_global.rootDir, "/public/assets/games/boards/"), "utf8").forEach(function (file) {
            this.boards[file] = BoardParser.fromFile(file);
        })
    }

    static fromFile(file: string): Board {
        const strings = fs.readFileSync(path.join(_global.rootDir, "/public/assets/games/boards/", file), "utf8").split("\n");
        return BoardParser.fromStrings(strings);
    }

    static fromStrings(strings: string[]): Board {
        if (strings.length === 0) {
            throw new Error("Something went wrong");
        }
        const width = strings[0].length;
        const height = strings.length;
        const board = new Board(width, height);
        const mapData = {playerAmount: 0};

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const c = strings[y].charAt(x);
                if ('0123456789ABCDEF'.indexOf(c) !== -1) {
                    let player = parseInt(c, 16);
                    mapData[player] = {x: x, y: y};
                    if (player + 1 > board.metadata.playerAmount) {
                        board.metadata.playerAmount = player + 1;
                    }
                }
                if (c === '#') {
                    board.getTileAt(x, y).wall = true;
                }
            }
        }
        board.metadata.mapData = mapData;
        return board;
    }
}

export = BoardParser;