var game = {
    entities: [],
    board: {
        width: 4,
        height: 4,
        tiles: []
    }
};
/**
 * This class implements a mock client so that the view class can be reused.
 */
var MockClient = /** @class */ (function () {
    function MockClient() {
    }
    MockClient.prototype.canMove = function (entity, speed) {
    };
    MockClient.prototype.end = function () {
    };
    MockClient.prototype.getGame = function () {
        return game;
    };
    MockClient.prototype.getId = function (key) {
        return 0;
    };
    MockClient.prototype.indexInBounds = function (x, y) {
        return false;
    };
    MockClient.prototype.isMulti = function () {
        return false;
    };
    MockClient.prototype.setIds = function (data) {
    };
    MockClient.prototype.setReady = function (data) {
    };
    MockClient.prototype.start = function (data) {
    };
    MockClient.prototype.stop = function (entity) {
    };
    MockClient.prototype.toggleReady = function () {
        return false;
    };
    MockClient.prototype.reset = function () {
    };
    MockClient.prototype.isLocal = function (id) {
        return false;
    };
    MockClient.prototype.move = function (id, direction) {
    };
    MockClient.prototype.setKeys = function (p1, p2) {
    };
    MockClient.prototype.getDirection = function (key) {
        return "";
    };
    MockClient.prototype.updateGame = function (filler) {
    };
    return MockClient;
}());
/**
 * Creates a new board of the given width and height
 * @param {number} width
 * @param {number} height
 * @return {{width: number, height: number, tiles: any[]}}
 */
function initialBoard(width, height) {
    if (!width)
        width = 4;
    if (!height)
        height = 4;
    var board = {
        width: width,
        height: height,
        tiles: []
    };
    for (var x = 0; x < width; x++) {
        board.tiles[x] = [];
        for (var y = 0; y < height; y++) {
            board.tiles[x].push({
                x: x,
                y: y,
                tile_type: "none"
            });
        }
    }
    return board;
}
/**
 * Decreases the width of the board with a minimum of 4
 */
function decreaseWidth() {
    if (game.board.width <= 4)
        return;
    game.board.width -= 1;
    view.resize();
}
/**
 * Increases the width of the board with a maximum of 100
 */
function increaseWidth() {
    if (game.board.width >= 100)
        return;
    game.board.width += 1;
    //Code goes here
    addTiles(game.board);
    view.resize();
}
/**
 * Decrease the height of the board with a minimum of 4
 */
function decreaseHeight() {
    if (game.board.height <= 4)
        return;
    game.board.height -= 1;
    view.resize();
}
/**
 * Increases the height of the board with a maximum of 100
 */
function increaseHeight() {
    if (game.board.height >= 100)
        return;
    game.board.height += 1;
    //Code goes here.
    addTiles(game.board);
    view.resize();
}
/**
 * Add the tiles to the board if not yet defined.
 * @param {{width: number, height: number, tiles: {x: number, y: number, tile_type: string}[][]}} board
 */
function addTiles(board) {
    var width = board.width;
    var height = board.height;
    for (var x = 0; x < width; x++) {
        if (!board.tiles[x])
            board.tiles[x] = [];
        for (var y = 0; y < height; y++) {
            if (!board.tiles[x][y]) {
                board.tiles[x][y] = {
                    x: x,
                    y: y,
                    tile_type: "none"
                };
            }
        }
    }
}
window.onload = function () {
    client = new MockClient();
    game.board = initialBoard();
    view = new View(function () { return view.resize(); }, "assets/block.png", "assets/player_blue.png", "assets/player_green.png", "assets/player_red.png", "assets/player_yellow.png", "assets/board_background.png", "assets/stop.png");
};
/**
 * Toggles between of the three types of the tile.
 * @param {{x: number, y: number, tile_type: string}} tile
 */
function toggleType(tile) {
    var types = ["none", "wall", "stop", "player"];
    var i = types.indexOf(tile.tile_type);
    if (i === -1)
        return;
    i = (i + 1) % types.length;
    tile.tile_type = types[i];
}
/**
 * Execute the function by the given key.
 * @param {KeyboardEvent} e
 */
window.onkeypress = function (e) {
    var key = e.key.toLowerCase();
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
            var encoded = encodeMap();
            alert("Base64 encoding:" + encoded);
            console.log(encoded);
            break;
        case "d":
            var base64 = prompt("Base64 encoding");
            if (!base64)
                return;
            decodeMap(atob(base64));
            view.resize();
            break;
    }
};
/**
 * Encodes the current map into a base64 string.
 * The decoded version is printed in the console.
 * @return {string}
 */
function encodeMap() {
    var players = 0;
    var string = "";
    for (var y = 0; y < game.board.height; y++) {
        for (var x = 0; x < game.board.width; x++) {
            var tile = game.board.tiles[x][y];
            if (tile.tile_type === "player") {
                if (players >= 16)
                    continue;
                string += players.toString(16);
                players++;
            }
            else if (tile.tile_type === "stop") {
                string += "+";
            }
            else if (tile.tile_type === "wall") {
                string += "#";
            }
            else {
                string += ".";
            }
        }
        string += "\n";
    }
    if (players >= 16) {
        alert("Warning max of 16 players adding more will result in in some players disappearing in the actual game");
    }
    console.log("--- Map ---");
    console.log(string);
    return btoa(string);
}
/**
 * Decode the map of the decoded!! string.
 * @param {string} map
 */
function decodeMap(map) {
    var strings = map.split(/\r?\n/);
    var width = strings[0].length;
    var height = strings.length - 1;
    game.board = initialBoard(width, height);
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var c = strings[y].charAt(x);
            if ('0123456789ABCDEFabcdef'.indexOf(c) !== -1) {
                game.board.tiles[x][y].tile_type = "player";
            }
            else if (c === '#') {
                game.board.tiles[x][y].tile_type = "wall";
            }
            else if (c === '+') {
                game.board.tiles[x][y].tile_type = "stop";
            }
        }
    }
}
/**
 * Save the current map in cookies.
 */
function save() {
    var name = prompt("Save as", "save1");
    var maps = Cookies.getJSON("maps");
    maps = maps ? maps : {};
    if (maps[name]) {
        var overwrite = prompt("Overwrite old save? (y/n)", "n");
        if (overwrite.length === 0 || overwrite.charAt(0) !== 'y')
            return;
    }
    maps[name] = encodeMap();
    alert("Map saved!");
    Cookies.set("maps", maps, { expires: 100 * 365 });
}
/**
 * Load a map from the cookies.
 */
function load() {
    var name = prompt("Load as", "save1");
    var map = Cookies.getJSON("maps")[name];
    if (!map) {
        alert("Map does not exist");
        return;
    }
    decodeMap(atob(map));
    alert("Map loaded!");
    view.resize();
}
/**
 * Display a list of all the saves.
 */
function listSaves() {
    var maps = Cookies.getJSON("maps");
    if (maps) {
        var saved = Object.keys(maps).reduce(function (pv, cv, ci, arr) { return pv + cv + ","; }, "Maps:\n");
        alert(saved);
    }
    else {
        alert("No saves!");
    }
}
/**
 * Delete a given save.
 */
function removeSave() {
    var maps = Cookies.getJSON("maps");
    var name = prompt("Remove map:", "save1");
    if (maps[name]) {
        delete maps[name];
        Cookies.set("maps", maps, { expires: 100 * 365 });
        return;
    }
    alert("Map removed");
}
/**
 * Onclick determine the tile and toggle its type.
 * @param {MouseEvent} e
 */
window.onclick = function (e) {
    if (!game || !game.board)
        return;
    var x = e.clientX;
    var y = e.clientY;
    var xPos = Math.floor((x - view.getValues().offsetX) / view.getValues().size);
    var yPos = Math.floor((y - view.getValues().offsetY) / view.getValues().size);
    if (xPos < 0 || yPos < 0 || xPos >= game.board.width || yPos >= game.board.height)
        return;
    var tile = game.board.tiles[xPos][yPos];
    toggleType(tile);
    view.resize();
};
/**
 * Resize the view.
 */
function resize() {
    view.resize();
}
//# sourceMappingURL=_editor.js.map