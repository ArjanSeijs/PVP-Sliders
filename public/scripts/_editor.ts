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
}

function initialBoard() {
    for (let x = 0; x < 4; x++) {
        game.board.tiles[x] = [];
        for (let y = 0; y < 4; y++) {
            game.board.tiles[x].push({
                x: x,
                y: y,
                tile_type: "none"
            })
        }
    }
}

function decreaseWidth() {
    if (game.board.width <= 4) return;
    game.board.width -= 1;
    view.resize();
}

function increaseWidth() {
    game.board.width += 1;
    let index = game.board.width - 1;
    if (game.board.tiles.length < game.board.width) {
        let newRow = [];
        for (let y = 0; y < game.board.height; y++) {
            newRow.push({
                x: index,
                y: y,
                tile_type: "none"
            })
        }
        game.board.tiles[index] = newRow;
    }
    view.resize();
}

function decreaseHeight() {
    if (game.board.height <= 4) return;
    game.board.height -= 1;
    view.resize();
}

function increaseHeight() {
    game.board.height += 1;
    let index = game.board.height - 1;
    if (game.board.tiles[0].length < game.board.height) {
        for (let x = 0; x < game.board.width; x++) {
            game.board.tiles[x].push({
                x: x,
                y: index,
                tile_type: "none"
            })
        }
    }
    view.resize();
}

window.onload = function () {
    client = new MockClient();
    initialBoard();
    view = new View(() => view.resize(),
        "assets/block.png",
        "assets/background.png",
        "assets/player_blue.png",
        "assets/player_green.png",
        "assets/player_red.png",
        "assets/player_yellow.png",
        "assets/board_background.png",
        "assets/stop.png");
    view.getCanvas().stage.on('click', function (e) {
        console.log(e);
    });
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
        case 'd':
            increaseWidth();
            break;
        case 'a':
            decreaseWidth();
            break;
        case 'w':
            decreaseHeight();
            break;
        case 'x':
            increaseHeight();
            break
    }
};

function encodeMap() {
    let players = 0;
    let string = "";
    for (let y = 0; y < game.board.height; y++) {
        for (let x = 0; x < game.board.width; x++) {
            let tile = game.board.tiles[x][y];
            if (tile.tile_type === "player") {
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
    return btoa(string);
}

function save() {
    let name = prompt("Save as", "save1");
    Cookies.set(name, encodeMap())
}

function load() {
    let name = prompt("Load as", "save1");
    let map = atob(Cookies.get(name));
    console.log(map);
}

window.onclick = function (e) {
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