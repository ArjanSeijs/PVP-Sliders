var images = [
    "assets/block.png", "assets/background.png",
    "assets/player_blue.png", "assets/player_green.png",
    "assets/player_red.png", "assets/player_yellow.png"
];
var screen_width = window.innerWidth;
var screen_height = window.innerHeight;
var app, game, socket;
var id = null;
window.onload = function () {
    var type = "WebGL";
    if (!PIXI.utils.isWebGLSupported()) {
        type = "canvas";
    }
    PIXI.utils.sayHello(type);
    //Setup app
    app = new PIXI.Application({ width: 1024, height: 512 });
    app.renderer.backgroundColor = 0x061639;
    app.renderer.view.style.position = "absolute";
    app.renderer.view.style.display = "block";
    app.renderer.autoResize = true;
    app.renderer.resize(window.innerWidth, window.innerHeight);
    PIXI.loader.add(images).load(init);
    document.body.appendChild(app.view);
    //TODO https://github.com/kittykatattack/learningPixi#monitoring-load-progress
};
var keys = {
    W: 87,
    A: 65,
    S: 83,
    D: 68,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40
};
window.onkeypress = function (e) {
    var code = e.keyCode ? e.keyCode : e.which;
    var data = { id: id, direction: "NONE" };
    switch (code) {
        case keys.W:
            data.direction = "NORTH";
            break;
        case keys.A:
            data.direction = "WEST";
            break;
        case keys.S:
            data.direction = "SOUTH";
            break;
        case keys.D:
            data.direction = "EAST";
            break;
        case keys.LEFT:
            data.direction = "WEST";
            break;
        case keys.UP:
            data.direction = "NORTH";
            break;
        case keys.RIGHT:
            data.direction = "EAST";
            break;
        case keys.DOWN:
            data.direction = "SOUTH";
            break;
    }
    socket.emit("move", data);
};
function initSocket() {
    socket = io("http://localhost:3000");
    socket.on("connected", function (data) {
        id = data.id;
        game = data.game;
        // console.log(JSON.stringify(data));
        displayGame();
    });
    socket.on("update", function (entities) {
        game.entities = entities;
        displayPlayers();
    });
}
function init() {
    var background = loadImage("background.png");
    background.width = window.innerWidth;
    background.height = window.innerHeight;
    app.stage.addChild(background);
    initSocket();
}
function loadImage(image) {
    var texture = PIXI.loader.resources["assets/" + image].texture;
    return new PIXI.Sprite(texture);
}
function displayGame() {
    var width = game.board.width;
    var height = game.board.height;
    var size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));
    var offsetX = (screen_width - width * size) / 2;
    var offsetY = (screen_height - height * size) / 2;
    var graphics = new PIXI.Graphics();
    graphics.lineStyle(2, 0x8B4513);
    for (var x = 0; x < width; x++) {
        for (var y = 0; y < height; y++) {
            graphics.drawRect(offsetX + x * size, offsetY + y * size, size, size);
            if (game.board.tiles[x][y].wall) {
                var block = loadImage("block.png");
                block.x = offsetX + x * size;
                block.y = offsetY + y * size;
                block.width = block.height = size;
                app.stage.addChild(block);
            }
        }
    }
    app.stage.addChild(graphics);
}
var entities = [];
function displayPlayers() {
    var width = game.board.width;
    var height = game.board.height;
    var size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));
    var offsetX = (screen_width - width * size) / 2;
    var offsetY = (screen_height - height * size) / 2;
    for (var _i = 0, entities_1 = entities; _i < entities_1.length; _i++) {
        var entity = entities_1[_i];
        app.stage.removeChild(entity);
    }
    entities = [];
    for (var _a = 0, _b = game.entities; _a < _b.length; _a++) {
        var entity = _b[_a];
        var sprite = loadImage("player_" + entity.team + ".png");
        //TODO cellSize
        sprite.width = sprite.height = size;
        sprite.x = offsetX + (entity.pos.x / 100) * size;
        sprite.y = offsetY + (entity.pos.y / 100) * size;
        entities.push(sprite);
        app.stage.addChild(sprite);
    }
}
