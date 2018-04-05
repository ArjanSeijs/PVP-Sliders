var images = [
    "assets/block.png", "assets/background.png",
    "assets/player_blue.png", "assets/player_green.png",
    "assets/player_red.png", "assets/player_yellow.png"
];
var screen_width = window.innerWidth - 1;
var screen_height = window.innerHeight - 1;
var app, game, socket, timer;
var ids = [];
var session_id = null;
var ready = false;
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
    app.renderer.resize(screen_width, screen_height);
    PIXI.loader.add(images).load(init);
    document.body.appendChild(app.view);
    //TODO https://github.com/kittykatattack/learningPixi#monitoring-load-progress
};
function init() {
    var background = loadImage("background.png");
    background.width = window.innerWidth;
    background.height = window.innerHeight;
    app.stage.addChild(background);
}
document.onkeypress = function (e) {
    if (!socket || !game)
        return;
    var code = e.key;
    var data = { id: -1, direction: "NONE", session_id: session_id };
    switch (code.toLowerCase()) {
        case 'w':
            data.id = ids[0].id;
            data.direction = "NORTH";
            break;
        case 'a':
            data.id = ids[0].id;
            data.direction = "WEST";
            break;
        case 's':
            data.id = ids[0].id;
            data.direction = "SOUTH";
            break;
        case 'd':
            data.id = ids[0].id;
            data.direction = "EAST";
            break;
        case 'arrowleft':
            data.id = ids[1].id;
            data.direction = "WEST";
            break;
        case 'arrowup':
            data.id = ids[1].id;
            data.direction = "NORTH";
            break;
        case 'arrowright':
            data.id = ids[1].id;
            data.direction = "EAST";
            break;
        case 'arrowdown':
            data.id = ids[1].id;
            data.direction = "SOUTH";
            break;
    }
    if (data.id === -1)
        return;
    socket.emit("move", data);
};
/**
 * Initializes the socket.
 */
function initSocket() {
    if (socket)
        socket.disconnect();
    socket = io(window.location.href);
    /**
     * This event is fired when the game starts.
     */
    socket.on("start", function (data) {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'none';
        document.getElementById('wrapper').style.display = 'none';
        game = data.game;
        makeSprites();
        displayGame();
        timer = setInterval(updatePos, 15);
    });
    /**
     * This event is fired every time an update event is send.
     */
    socket.on("update", function (entities) {
        // game.entities;
        displayPlayers(entities);
    });
    /**
     * This event is fired on error.
     */
    socket.on("failed", function (data, reload) {
        alert(data);
        if (reload)
            location.reload();
    });
    /**
     * This is event is fired when the player succesfully joined the game.
     */
    socket.on('joined', function (data) {
        ids = data.ids;
        session_id = data.session_id;
        document.getElementById("lobby-id").innerHTML = "Lobby-Id:" + data.lobby_id;
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'inherit';
    });
    /**
     * This event is fired when the map is changed.
     */
    socket.on('map', function (data) {
        document.getElementById('selected-map').innerHTML = 'Map: ' + data;
    });
    /**
     * This event is fired when the game ends.
     */
    socket.on('end', function (data) {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'none';
        document.getElementById('wrapper').style.display = '';
        document.getElementById('winners').style.display = '';
        document.getElementById('team').innerHTML = data;
        if (timer)
            clearInterval(timer);
    });
    /**
     * This event is fired when the game restarts.
     */
    socket.on('restart', function () {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = '';
        document.getElementById('wrapper').style.display = '';
        document.getElementById('winners').style.display = 'none';
        while (app.stage.children.length > 0)
            app.stage.removeChildAt(0);
        app.stage.addChild(loadImage("background.png"));
        ready = false;
        console.log('restart!');
    });
    /**
     * This event is fired when new players joined the game or a ready status is toggled.
     */
    socket.on('players', function (data) {
        console.log(JSON.stringify(data));
        var string = "<ol>";
        for (var i = 0; i < data.length; i++) {
            string += "<li>" + data[i].name + ":" + data[i].ready + ":" + data[i].team + "</li>";
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
    });
}
function toggleReady() {
    ready = !ready;
    socket.emit('ready', { session_id: session_id, ready: ready });
}
/**
 * Loads an image from the string.
 * @param {string} image
 * @return {PIXI.Sprite}
 */
function loadImage(image) {
    var texture = PIXI.loader.resources["assets/" + image].texture;
    return new PIXI.Sprite(texture);
}
/**
 * Display the game board.
 */
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
function makeSprites() {
    var width = game.board.width;
    var height = game.board.height;
    var size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));
    for (var key in game.entities) {
        if (!game.entities.hasOwnProperty(key))
            continue;
        var entity = game.entities[key];
        entity.sprite = loadImage("player_" + entity.team + ".png");
        entity.text = new PIXI.Text(entity.name, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xff1010,
            align: 'center'
        });
        entity.sprite.width = entity.sprite.height = size;
        entity.sprite.visible = false;
        entity.text.visible = false;
        entity.text.anchor.set(0.5, 1);
        app.stage.addChild(entity.sprite);
        app.stage.addChild(entity.text);
    }
}
function displayPlayers(entities) {
    var width = game.board.width;
    var height = game.board.height;
    var size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));
    var offsetX = (screen_width - width * size) / 2;
    var offsetY = (screen_height - height * size) / 2;
    for (var key in game.entities) {
        if (!game.entities.hasOwnProperty(key))
            continue;
        var entity = game.entities[key];
        if (!entity.sprite || !entity.text)
            continue;
        if (entities[key]) {
            entity.pos = entities[key].pos;
            entity.direction = entities[key].direction;
            entity.sprite.visible = true;
            entity.text.visible = true;
            entity.sprite.x = offsetX + (entity.pos.x / 100) * size;
            entity.sprite.y = offsetY + (entity.pos.y / 100) * size;
            entity.text.x = offsetX + (entity.pos.x / 100) * size + (0.5 * size);
            entity.text.y = offsetY + (entity.pos.y / 100) * size;
        }
        else {
            entity.sprite.visible = false;
            entity.text.visible = false;
        }
    }
}
function inBounds(newX, newY, entity) {
    //TODO config
    var cellSize = 100;
    return newX >= 0 && newY >= 0
        && newX + entity.size < game.board.width * cellSize
        && newY + entity.size < game.board.height * cellSize;
}
var speed = 30;
function canMove(entity, speed) {
    var cellSize = 100;
    var dir = entity.direction;
    //TODO Depends ons TPS
    var newX = entity.pos.x + dir.x * speed;
    var newY = entity.pos.y + dir.y * speed;
    var tiles = game.board ? game.board.tiles : null;
    if (!tiles) {
        console.log("Board or tiles undefined");
        return false;
    }
    if (!inBounds(newX, newY, entity))
        return false;
    try {
        switch (entity.direction.string) {
            case "NORTH":
            case "WEST":
                return !tiles[Math.floor(newX / cellSize)][Math.floor(newY / cellSize)].wall;
            case "EAST":
                return !tiles[Math.floor((newX + entity.size) / cellSize)][Math.floor(newY / cellSize)].wall;
            case "SOUTH":
                return !tiles[Math.floor(newX / cellSize)][Math.floor((newY + entity.size) / cellSize)].wall;
            default:
                return true;
        }
    }
    catch (error) {
        console.log("x,y,dirx,diry,entity,entity.size");
        console.log(newX);
        console.log(newY);
        console.log(dir.x);
        console.log(dir.y);
        console.log(entity);
        console.log(entity.size);
        console.warn(error);
    }
}
function stop(entity) {
    entity.direction = { x: 0, y: 0, string: "NONE" };
    var cellSize = 100; //TODO config.
    var x = Math.round(entity.pos.x / cellSize) * cellSize;
    var y = Math.round(entity.y / cellSize) * cellSize;
    entity.pos = {
        x: x,
        y: y
    };
}
function updatePos() {
    var width = game.board.width;
    var height = game.board.height;
    var size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));
    var offsetX = (screen_width - width * size) / 2;
    var offsetY = (screen_height - height * size) / 2;
    for (var key in game.entities) {
        if (!game.entities.hasOwnProperty(key))
            continue;
        var entity = game.entities[key];
        if (!entity.sprite || !entity.text)
            continue;
        if (canMove(entity, speed)) {
            var dir = entity.direction;
            entity.pos.x += dir.x * speed;
            entity.pos.y += dir.y * speed;
            entity.sprite.width = entity.sprite.height = size;
            entity.sprite.x = offsetX + (entity.pos.x / 100) * size;
            entity.sprite.y = offsetY + (entity.pos.y / 100) * size;
            entity.text.x = offsetX + (entity.pos.x / 100) * size + (0.5 * size);
            entity.text.y = offsetY + (entity.pos.y / 100) * size;
        }
        else {
            stop(entity);
        }
    }
}
// let entitySprites = [];
// let texts = [];
//
// /**
//  * Update the sprites
//  * TODO Update location instead of remove.
//  */
// function displayPlayers(entities: any) {
//     let width = game.board.width;
//     let height = game.board.height;
//     let size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));
//
//     let offsetX = (screen_width - width * size) / 2;
//     let offsetY = (screen_height - height * size) / 2;
//
//     for (let entity of entitySprites) {
//         app.stage.removeChild(entity.sprite);
//     }
//     for (let text of texts) {
//         app.stage.removeChild(text);
//     }
//     entitySprites = [];
//     for (let entity of entities) {
//         let sprite = loadImage("player_" + entity.team + ".png");
//         let text = new PIXI.Text(entity.name, {
//             fontFamily: 'Arial',
//             fontSize: Math.ceil(size * 4 / entity.name.length),
//             fill: 0xff1010,
//             align: 'center'
//         });
//         text.anchor.set(0.5, 0);
//         //TODO cellSize
//         sprite.width = sprite.height = size;
//         sprite.x = offsetX + (entity.pos.x / 100) * size;
//         sprite.y = offsetY + (entity.pos.y / 100) * size;
//
//         text.x = offsetX + (entity.pos.x / 100) * size + (0.5 * size);
//         text.y = offsetY + (entity.pos.y / 100) * size;
//
//
//         entitySprites.push({sprite: sprite, entity: entity});
//         texts.push(text);
//
//         app.stage.addChild(text);
//         app.stage.addChild(sprite);
//     }
// }
/**
 * Host a lobby.
 */
function host() {
    initSocket();
    document.getElementById('maps').style.display = 'block';
    document.getElementById('mapselect').value = "Palooza";
    socket.emit('host', getFormData());
}
/**
 * Join a lobby.
 */
function join() {
    initSocket();
    socket.emit('join', getFormData());
}
function start() {
    socket.emit('start', { session_id: session_id });
}
function setTeam(elm, i) {
    socket.emit('team', { session_id: session_id, team: elm.value, player: i });
}
/**
 * Gets the form data.
 * @return {{username: string, multiplayer: boolean, lobby: string, password: string}}
 */
function getFormData() {
    var username = document.getElementById("username").value;
    var multiplayer = document.getElementById("multiplayer").checked;
    var lobby = document.getElementById("lobby").value;
    var password = document.getElementById("password").value;
    return { username: username, multiplayer: multiplayer, lobby: lobby, password: password };
}
/**
 * Change a map value.
 * @param {HTMLSelectElement} elm
 */
function changeMap(elm) {
    socket.emit('map', elm.value);
}
//# sourceMappingURL=client.js.map