interface Game {
    entities: { pos: { x: number, y: number, team: string, name: string } }[]
    board: {
        width: number; height: number; tiles: { x: number; y: number; tile_type: string }[][]
    }
}

let game: Game = {
    entities: [],
    board: {
        width: 4,
        height: 4,
        tiles: []
    }
};

class MockClient implements ClientInterface {
    canMove(entity: any, speed: number): void {

    }

    end(): void {
    }

    getGame(): any {
        return game;
    }

    getId(key: string): number {
        return 0;
    }

    indexInBounds(x: number, y: number): boolean {
        return false;
    }

    isMulti(): boolean {
        return false;
    }

    setIds(data: any): void {
    }

    setReady(data: any): void {
    }

    start(data: any): void {
    }

    stop(entity: any): void {
    }

    toggleReady(): boolean {
        return false;
    }

    reset(): void {

    }

    isLocal(id: number): boolean {
        return false;
    }

    move(id: number, direction: string): void {
    }

    setKeys(p1: { up: string; down: string; left: string; right: string }, p2: { up: string; down: string; left: string; right: string }): void {
    }

    getDirection(key: string): string {
        return "";
    }
}

function initialBoard(width?: number, height?: number) {
    if (!width) width = 4;
    if (!height) height = 4;
    let board = {
        width: width,
        height: height,
        tiles: []
    };
    for (let x = 0; x < width; x++) {
        board.tiles[x] = [];
        for (let y = 0; y < height; y++) {
            board.tiles[x].push({
                x: x,
                y: y,
                tile_type: "none"
            })
        }
    }
    return board;
}

function decreaseWidth() {
    if (game.board.width <= 4) return;
    game.board.width -= 1;
    view.resize();
}

function increaseWidth() {
    if (game.board.width >= 100) return;
    game.board.width += 1;
    //Code goes here
    addTiles(game.board);
    view.resize();
}

function decreaseHeight() {
    if (game.board.height <= 4) return;
    game.board.height -= 1;
    view.resize();
}

function increaseHeight() {
    if (game.board.height >= 100) return;
    game.board.height += 1;
    //Code goes here.
    addTiles(game.board);
    view.resize();
}

function addTiles(board: { width: number; height: number; tiles: { x: number; y: number; tile_type: string }[][] }) {
    let width = board.width;
    let height = board.height;
    for (let x = 0; x < width; x++) {
        if (!board.tiles[x])
            board.tiles[x] = [];
        for (let y = 0; y < height; y++) {
            if (!board.tiles[x][y]) {
                board.tiles[x][y] = {
                    x: x,
                    y: y,
                    tile_type: "none"
                }
            }
        }
    }
}

window.onload = function () {
    client = new MockClient();
    game.board = initialBoard();
    view = new View(() => view.resize(),
        "assets/block.png",
        "assets/player_blue.png",
        "assets/player_green.png",
        "assets/player_red.png",
        "assets/player_yellow.png",
        "assets/board_background.png",
        "assets/stop.png");


};

function toggleType(tile: { x: number; y: number; tile_type: string }) {
    let types = ["none", "wall", "stop", "player"];
    let i = types.indexOf(tile.tile_type);
    if (i === -1) return;
    i = (i + 1) % types.length;
    tile.tile_type = types[i];
}

window.onkeypress = function (e) {
    let key = e.key.toLowerCase();
    switch (key) {
        case 's':
            save();
            break;
        case 'l':
            load();
            break;
        case ']':
            increaseWidth();
            break;
        case '[':
            decreaseWidth();
            break;
        case '{':
            decreaseHeight();
            break;
        case '}':
            increaseHeight();
            break;
        case 'c':
            listSaves();
            break;
        case 'r':
            removeSave();
            break;
        case "e":
            let encoded = encodeMap();
            alert("Base64 encoding:" + encoded);
            console.log(encoded);
            break;
        case "d":
            let base64 = prompt("Base64 encoding");
            if(!base64) return;
            decodeMap(atob(base64));
            view.resize();
            break;
    }
};

function encodeMap() {
    let players = 0;
    let string = "";
    for (let y = 0; y < game.board.height; y++) {
        for (let x = 0; x < game.board.width; x++) {
            let tile = game.board.tiles[x][y];
            if (tile.tile_type === "player") {
                if (players >= 16) continue;
                string += players.toString(16);
                players++;
            } else if (tile.tile_type === "stop") {
                string += "+"
            } else if (tile.tile_type === "wall") {
                string += "#"
            } else {
                string += "."
            }
        }
        string += "\n";
    }
    if(players >= 16) {
        alert("Warning max of 16 players adding more will result in in some players disappearing in the actual game");
    }
    console.log("--- Map ---");
    console.log(string);
    return btoa(string);
}

function decodeMap(map: string) {
    let strings = map.split(/\r?\n/);
    const width = strings[0].length;
    const height = strings.length - 1;
    game.board = initialBoard(width, height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const c = strings[y].charAt(x);
            if ('0123456789ABCDEFabcdef'.indexOf(c) !== -1) {
                game.board.tiles[x][y].tile_type = "player"
            } else if (c === '#') {
                game.board.tiles[x][y].tile_type = "wall"
            } else if (c === '+') {
                game.board.tiles[x][y].tile_type = "stop"
            }
        }
    }
}

function save() {
    let name = prompt("Save as", "save1");
    let maps = Cookies.getJSON("maps");
    maps = maps ? maps : {};
    if (maps[name]) {
        let overwrite = prompt("Overwrite old save? (y/n)", "n");
        if (overwrite.length === 0 || overwrite.charAt(0) !== 'y') return;
    }
    maps[name] = encodeMap();
    alert("Map saved!");
    Cookies.set("maps", maps,{ expires: 100*365 })
}

function load() {
    let name = prompt("Load as", "save1");
    let map = Cookies.getJSON("maps")[name];
    if (!map) {
        alert("Map does not exist");
        return;
    }
    decodeMap(atob(map));
    alert("Map loaded!");
    view.resize();
}

function listSaves() {
    let maps = Cookies.getJSON("maps");
    if(maps) {
        let saved = Object.keys(maps).reduce((pv, cv, ci, arr) => pv + cv + ",", "Maps:\n");
        alert(saved);
    } else {
        alert("No saves!")
    }
}

function removeSave() {
    let maps = Cookies.getJSON("maps");
    let name = prompt("Remove map:", "save1");
    if (maps[name]) {
        delete maps[name];
        Cookies.set("maps", maps,{ expires: 100*365 });
        return;
    }
    alert("Map removed");
}

window.onclick = function (e) {
    if(!game || !game.board) return;
    let x = e.clientX;
    let y = e.clientY;
    let xPos = Math.floor((x - view.getValues().offsetX) / view.getValues().size);
    let yPos = Math.floor((y - view.getValues().offsetY) / view.getValues().size);
    if (xPos < 0 || yPos < 0 || xPos >= game.board.width || yPos >= game.board.height) return;
    let tile = game.board.tiles[xPos][yPos];
    toggleType(tile);
    view.resize();
};

function resize() {
    view.resize();
}