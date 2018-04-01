declare let io: any;

const images = [
    "assets/block.png", "assets/background.png",
    "assets/player_blue.png", "assets/player_green.png",
    "assets/player_red.png", "assets/player_yellow.png"
];
let screen_width = window.innerWidth - 1;
let screen_height = window.innerHeight - 1;

let app, game, socket;
let ids = [];
let session_id = null;
window.onload = function () {
    let type = "WebGL";
    if (!PIXI.utils.isWebGLSupported()) {
        type = "canvas"
    }
    PIXI.utils.sayHello(type);

    //Setup app
    app = new PIXI.Application({width: 1024, height: 512});
    app.renderer.backgroundColor = 0x061639;
    app.renderer.view.style.position = "absolute";
    app.renderer.view.style.display = "block";
    app.renderer.autoResize = true;
    app.renderer.resize(screen_width, screen_height);
    PIXI.loader.add(images).load(init);
    document.body.appendChild(app.view);
    //TODO https://github.com/kittykatattack/learningPixi#monitoring-load-progress
};

document.onkeypress = function (e) {
    if (!socket || !game) return;
    let code = e.key;
    let data = {id: -1, direction: "NONE", session_id: session_id};
    switch (code.toLowerCase()) {
        case 'w' :
            data.id = ids[0].id;
            data.direction = "NORTH";
            break;
        case 'a' :
            data.id = ids[0].id;
            data.direction = "WEST";
            break;
        case 's' :
            data.id = ids[0].id;
            data.direction = "SOUTH";
            break;
        case 'd' :
            data.id = ids[0].id;
            data.direction = "EAST";
            break;
        case 'arrowleft' :
            data.id = ids[1].id;
            data.direction = "WEST";
            break;
        case 'arrowup' :
            data.id = ids[1].id;
            data.direction = "NORTH";
            break;
        case 'arrowright' :
            data.id = ids[1].id;
            data.direction = "EAST";
            break;
        case 'arrowdown' :
            data.id = ids[1].id;
            data.direction = "SOUTH";
            break;
    }
    if (data.id === -1) return;
    socket.emit("move", data);
};

function initSocket() {
    if (socket) socket.disconnect();
    socket = io("http://localhost:3000");
    socket.on("start", function (data) {
        document.getElementById('wrapper').style.display = 'none';
        console.log("Hello?");
        game = data.game;
        displayGame();
    });
    socket.on("update", function (entities) {
        game.entities = entities;
        displayPlayers();
    });
    socket.on("failed", function (data) {
        alert(data);
        location.reload();
    });
    socket.on('joined', function (data) {
        ids = data.ids;
        session_id = data.session_id;
        document.getElementById("lobby-id").innerHTML = "Lobby-Id:" + data.lobby_id;
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'inherit';
    });
    socket.on('players', function (data) {
        console.log(JSON.stringify(data));
        let string = "<ol>";
        for (let i = 0; i < data.length; i++) {
            string += "<li>" + data[i].name + ":" + data[i].ready + "</li>";
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
    })
}

let ready = false;

function toggleReady() {
    ready = !ready;
    socket.emit('ready', {session_id: session_id, ready: ready});
}

function init() {
    let background = loadImage("background.png");
    background.width = window.innerWidth;
    background.height = window.innerHeight;
    app.stage.addChild(background);
}

function loadImage(image: string) {
    let texture = PIXI.loader.resources["assets/" + image].texture;
    return new PIXI.Sprite(texture);
}

function displayGame() {
    let width = game.board.width;
    let height = game.board.height;
    let size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));

    let offsetX = (screen_width - width * size) / 2;
    let offsetY = (screen_height - height * size) / 2;

    let graphics = new PIXI.Graphics();
    graphics.lineStyle(2, 0x8B4513);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            graphics.drawRect(offsetX + x * size, offsetY + y * size, size, size);

            if (game.board.tiles[x][y].wall) {
                let block = loadImage("block.png");
                block.x = offsetX + x * size;
                block.y = offsetY + y * size;
                block.width = block.height = size;
                app.stage.addChild(block);
            }
        }
    }

    app.stage.addChild(graphics);
}

let entitySprites = [];

function displayPlayers() {
    let width = game.board.width;
    let height = game.board.height;
    let size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));

    let offsetX = (screen_width - width * size) / 2;
    let offsetY = (screen_height - height * size) / 2;

    for (let entity of entitySprites) {
        app.stage.removeChild(entity);
    }
    entitySprites = [];
    for (let entity of game.entities) {
        let sprite = loadImage("player_" + entity.team + ".png");
        //TODO cellSize
        sprite.width = sprite.height = size;
        sprite.x = offsetX + (entity.pos.x / 100) * size;
        sprite.y = offsetY + (entity.pos.y / 100) * size;
        entitySprites.push(sprite);

        app.stage.addChild(sprite);
    }
}

function host() {
    initSocket();
    let username = (document.getElementById("username") as HTMLInputElement).value;
    let multiplayer = (document.getElementById("multiplayer") as HTMLInputElement).checked;
    socket.emit('host', {username: username, multiplayer: multiplayer});
}

function join() {
    initSocket();
    let username = (document.getElementById("username") as HTMLInputElement).value;
    let multiplayer = (document.getElementById("multiplayer") as HTMLInputElement).checked;
    let lobby = (document.getElementById("lobby") as HTMLInputElement).value;
    socket.emit('join', {username: username, multiplayer: multiplayer, lobby: lobby});
}