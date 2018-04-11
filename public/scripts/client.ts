declare let io: any;

const images = [
    "assets/block.png", "assets/background.png",
    "assets/player_blue.png", "assets/player_green.png",
    "assets/player_red.png", "assets/player_yellow.png",
    "assets/board_background.png"
];

let screen_width = window.innerWidth - 1;
let screen_height = window.innerHeight - 1;

let app: any, game: any, socket: any, timer: any;
let ids: { id: number, ready: boolean }[] = [];
let session_id: string = null;
let ready = false;

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

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
};

function getUrl() {
    let index = window.location.href.indexOf('/', 'http://'.length);
    return window.location.href.substr(0, index > -1 ? index : window.location.href.length);
}

function init() {
    let background = loadImage("background.png");
    background.width = window.innerWidth;
    background.height = window.innerHeight;
    app.stage.addChild(background);

    let lobby = getParameterByName("id", window.location.href);
    (document.getElementById('lobby') as HTMLInputElement).value = lobby ? lobby : "";
}

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

/**
 * Initializes the socket.
 */
function initSocket() {
    if (socket) socket.disconnect();
    console.log(getUrl());
    socket = io(getUrl());
    /**
     * This event is fired when the game starts.
     */
    socket.on("start", function (data: any) {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'none';
        document.getElementById('wrapper').style.display = 'none';
        game = data.game;
        displayGame();
        makeSprites();
        timer = setInterval(updatePos, 15);
    });

    /**
     * This event is fired every time an update event is send.
     */
    socket.on("update", function (entities: any) {
        // game.entities;
        displayPlayers(entities);
    });

    /**
     * This event is fired on error.
     */
    socket.on("failed", function (data: any, reload: any) {
        alert(data);
        if (reload) location.reload();
    });

    /**
     * This is event is fired when the player succesfully joined the game.
     */
    socket.on('joined', function (data: any) {
        ids = data.ids;

        if (data.ids.length === 1) document.getElementById("team2").style.display = 'none';
        else document.getElementById("team2").style.display = 'inherit';

        session_id = data.session_id;
        let link = getUrl() + "?id=" + data.lobby_id;
        document.getElementById("lobby-id").innerHTML = "Join: <a href='" + link + "'>" + data.lobby_id + "</a>";
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'inherit';
    });

    /**
     * This event is fired when the map is changed.
     */
    socket.on('map', function (data: any) {
        (document.getElementById('selected-map') as HTMLDivElement).innerHTML = 'Map: ' + data;
    });

    /**
     * This event is fired when the game ends.
     */
    socket.on('end', function (data: any) {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'none';
        document.getElementById('wrapper').style.display = '';
        document.getElementById('winners').style.display = '';
        document.getElementById('team').innerHTML = data.winners;
        displayPlayers(data.entities);
        if (timer) clearInterval(timer);
    });

    /**
     * This event is fired when the game restarts.
     */
    socket.on('restart', function () {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = '';
        document.getElementById('wrapper').style.display = '';
        document.getElementById('winners').style.display = 'none';
        while (app.stage.children.length > 0) app.stage.removeChildAt(app.stage.children.length - 1);
        app.stage.addChild(loadImage("background.png"));
        ready = false;
        console.log('restart!');
    });

    /**
     * This event is fired when new players joined the game or a ready status is toggled.
     */
    socket.on('players', function (data: any) {
        console.log(JSON.stringify(data));
        let string = "<ol>";
        for (let i = 0; i < data.length; i++) {
            string += "<li>" + data[i].name + ":" + data[i].ready + ":" + data[i].team + "</li>";
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
    })
}

function toggleReady(): void {
    ready = !ready;
    socket.emit('ready', {session_id: session_id, ready: ready});
}

/**
 * Loads an image from the string.
 * @param {string} image
 * @return {PIXI.Sprite}
 */
function loadImage(image: string) {
    let texture = PIXI.loader.resources["assets/" + image].texture;
    return new PIXI.Sprite(texture);
}

/**
 * Display the game board.
 */
function displayGame() {
    let width = game.board.width;
    let height = game.board.height;

    let size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));

    let offsetX = (screen_width - width * size) / 2;
    let offsetY = (screen_height - height * size) / 2;

    let image = loadImage("board_background.png");
    image.x = offsetX;
    image.y = offsetY;
    image.width = size * width;
    image.height = size * height;
    app.stage.addChild(image);

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


function makeSprites() {
    let width = game.board.width;
    let height = game.board.height;
    let size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));

    for (let key in game.entities) {
        if (!game.entities.hasOwnProperty(key)) continue;

        let entity = game.entities[key];
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

function displayPlayers(entities: any) {
    let width = game.board.width;
    let height = game.board.height;
    let size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));

    let offsetX = (screen_width - width * size) / 2;
    let offsetY = (screen_height - height * size) / 2;
    for (let key in game.entities) {
        if (!game.entities.hasOwnProperty(key)) continue;
        let entity = game.entities[key];
        if (!entity.sprite || !entity.text) continue;
        if (entities[key]) {
            entity.pos = entities[key].pos;
            entity.direction = entities[key].direction;

            entity.sprite.visible = true;
            entity.text.visible = true;

            entity.sprite.x = offsetX + (entity.pos.x / 100) * size;
            entity.sprite.y = offsetY + (entity.pos.y / 100) * size;

            entity.text.x = offsetX + (entity.pos.x / 100) * size + (0.5 * size);
            entity.text.y = offsetY + (entity.pos.y / 100) * size;
        } else {
            entity.sprite.visible = false;
            entity.text.visible = false;
        }
    }
}

function inBounds(newX: number, newY: number, entity: any) {
    //TODO config
    const cellSize = 100;
    return newX >= 0 && newY >= 0
        && newX + entity.size < game.board.width * cellSize
        && newY + entity.size < game.board.height * cellSize;
}

const speed = 30;

function canMove(entity: any, speed: any) {
    const cellSize = 100;
    let dir = entity.direction;

    //TODO Depends ons TPS
    let newX = entity.pos.x + dir.x * speed;
    let newY = entity.pos.y + dir.y * speed;

    let tiles = game.board ? game.board.tiles : null;
    if (!tiles) {
        console.log("Board or tiles undefined");
        return false;
    }
    if (!inBounds(newX, newY, entity)) return false;
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
    } catch (error) {
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

function stop(entity: any) {
    entity.direction = {x: 0, y: 0, string: "NONE"};
    let cellSize = 100; //TODO config.
    let x = Math.round(entity.pos.x / cellSize) * cellSize;
    let y = Math.round(entity.y / cellSize) * cellSize;
    entity.pos = {
        x: x,
        y: y
    }
}

function updatePos() {
    let width = game.board.width;
    let height = game.board.height;
    let size = Math.min(Math.floor(screen_width / width), Math.floor(screen_height / height));

    let offsetX = (screen_width - width * size) / 2;
    let offsetY = (screen_height - height * size) / 2;

    for (let key in game.entities) {
        if (!game.entities.hasOwnProperty(key)) continue;
        let entity = game.entities[key];
        if (!entity.sprite || !entity.text) continue;
        if (canMove(entity, speed)) {
            let dir = entity.direction;
            entity.pos.x += dir.x * speed;
            entity.pos.y += dir.y * speed;

            entity.sprite.width = entity.sprite.height = size;
            entity.sprite.x = offsetX + (entity.pos.x / 100) * size;
            entity.sprite.y = offsetY + (entity.pos.y / 100) * size;

            entity.text.x = offsetX + (entity.pos.x / 100) * size + (0.5 * size);
            entity.text.y = offsetY + (entity.pos.y / 100) * size;
        } else {
            stop(entity);
        }
    }
}

/**
 * Host a lobby.
 */
function host() {
    initSocket();
    document.getElementById('maps').style.display = 'block';
    (document.getElementById('mapselect') as HTMLSelectElement).value = "Palooza";
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
    socket.emit('start', {session_id: session_id});
}

function setTeam(elm: HTMLSelectElement, i: number) {
    socket.emit('team', {session_id: session_id, team: elm.value, player: i});
}

/**
 * Gets the form data.
 * @return {{username: string, multiplayer: boolean, lobby: string, password: string}}
 */
function getFormData() {
    const username = (document.getElementById("username") as HTMLInputElement).value;
    const multiplayer = (document.getElementById("multiplayer") as HTMLInputElement).checked;
    const lobby = (document.getElementById("lobby") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;
    return {username: username, multiplayer: multiplayer, lobby: lobby, password: password};
}

/**
 * Change a map value.
 * @param {HTMLSelectElement} elm
 */
function changeMap(elm: HTMLSelectElement) {
    socket.emit('map', elm.value);
}

/**
 * Resize
 */
function resize() {
    screen_width = window.innerWidth - 1;
    screen_height = window.innerHeight - 1;

    while (app.stage.children.length > 0) app.stage.removeChildAt(app.stage.children.length - 1);

    app.renderer.resize(screen_width, screen_height);

    init();
    if (!game) return;
    makeSprites();
    displayGame();
    displayPlayers(game.entities);
}