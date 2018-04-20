var game = {
    entities: [],
    board: {
        width: 4,
        height: 4,
        tiles: []
    }
};
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
    return MockClient;
}());
function initialBoard() {
    for (var x = 0; x < 4; x++) {
        game.board.tiles[x] = [];
        for (var y = 0; y < 4; y++) {
            game.board.tiles[x].push({
                x: x,
                y: y,
                tile_type: "none"
            });
        }
    }
}
function decreaseWidth() {
    if (game.board.width <= 4)
        return;
    game.board.width -= 1;
    view.resize();
}
function increaseWidth() {
    game.board.width += 1;
    var index = game.board.width - 1;
    if (game.board.tiles.length < game.board.width) {
        var newRow = [];
        for (var y = 0; y < game.board.height; y++) {
            newRow.push({
                x: index,
                y: y,
                tile_type: "none"
            });
        }
        game.board.tiles[index] = newRow;
    }
    view.resize();
}
function decreaseHeight() {
    if (game.board.height <= 4)
        return;
    game.board.height -= 1;
    view.resize();
}
function increaseHeight() {
    game.board.height += 1;
    var index = game.board.height - 1;
    if (game.board.tiles[0].length < game.board.height) {
        for (var x = 0; x < game.board.width; x++) {
            game.board.tiles[x].push({
                x: x,
                y: index,
                tile_type: "none"
            });
        }
    }
    view.resize();
}
window.onload = function () {
    client = new MockClient();
    initialBoard();
    view = new View(function () { return view.resize(); }, "assets/block.png", "assets/background.png", "assets/player_blue.png", "assets/player_green.png", "assets/player_red.png", "assets/player_yellow.png", "assets/board_background.png", "assets/stop.png");
    view.getCanvas().stage.on('click', function (e) {
        console.log(e);
    });
};
function toggleType(tile) {
    var types = ["none", "wall", "stop", "player"];
    var i = types.indexOf(tile.tile_type);
    if (i === -1)
        return;
    i = (i + 1) % types.length;
    tile.tile_type = types[i];
}
window.onkeypress = function (e) {
    var key = e.key.toLowerCase();
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
            break;
    }
};
function encodeMap() {
    var players = 0;
    var string = "";
    for (var y = 0; y < game.board.height; y++) {
        for (var x = 0; x < game.board.width; x++) {
            var tile = game.board.tiles[x][y];
            if (tile.tile_type === "player") {
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
    return btoa(string);
}
function save() {
    var name = prompt("Save as", "save1");
    Cookies.set(name, encodeMap());
}
function load() {
    var name = prompt("Load as", "save1");
    var map = atob(Cookies.get(name));
    console.log(map);
}
window.onclick = function (e) {
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
function resize() {
    view.resize();
}
//# sourceMappingURL=_editor.js.map