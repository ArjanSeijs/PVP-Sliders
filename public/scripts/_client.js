var Sprite = PIXI.Sprite;
var socketListener;
var view;
var client;
var Util = /** @class */ (function () {
    function Util() {
    }
    /**
     * Gets the url with the path removed
     * @return {string}
     */
    Util.getUrl = function () {
        return window.location.host;
    };
    /**
     * Returns a sprite of the given image.
     * @param {string} image
     * @return {PIXI.Sprite}
     */
    Util.loadImage = function (image) {
        var texture = PIXI.loader.resources["assets/" + image].texture;
        return new PIXI.Sprite(texture);
    };
    /**
     * Gets the data of the user form.
     * @return {{username: string, multiplayer: boolean, lobby: string, password: string}}
     */
    Util.getFormData = function () {
        var username = document.getElementById("username").value;
        var multiplayer = document.getElementById("multiplayer").checked;
        var lobby = document.getElementById("lobby").value;
        var password = document.getElementById("password").value;
        return { username: username, multiplayer: multiplayer, lobby: lobby, password: password };
    };
    /**
     * Parses a paramater from the query string.
     * @param {string} name The parameter name.
     * @param {string} [url] The url.
     * @return {string}
     */
    Util.getParameterByName = function (name, url) {
        if (!url)
            url = window.location.href;
        return new URL(url).searchParams.get(name);
    };
    return Util;
}());
var SocketHandler = /** @class */ (function () {
    function SocketHandler() {
        var _this = this;
        this.socket = io(Util.getUrl());
        this.socket.on('start', function (data) { return _this.onStart(data); });
        this.socket.on('update', function (data) { return _this.onUpdate(data); });
        this.socket.on('failed', function (data, refresh) { return _this.onFailed(data, refresh); });
        this.socket.on('joined', function (data) { return _this.onJoined(data); });
        this.socket.on('restart', function (data) { return _this.onRestart(data); });
        this.socket.on('players', function (data) { return _this.onPlayers(data); });
        this.socket.on('map', function (data) { return _this.onMapChange(data); });
        this.socket.on('end', function (data) { return _this.onEnd(data); });
    }
    SocketHandler.prototype.onStart = function (data) {
        view.hideAll();
        client.start(data);
        view.resize();
    };
    SocketHandler.prototype.onUpdate = function (entities) {
        view.displayPlayers(entities);
    };
    SocketHandler.prototype.onFailed = function (data, refresh) {
        alert(data);
        if (refresh)
            location.reload();
    };
    SocketHandler.prototype.onJoined = function (data) {
        client.id_p1.id = data.ids[0].id;
        if (data.ids[1])
            client.id_p2.id = data.ids[1].id;
        this.session_id = data.session_id;
        var link = "/?id=" + encodeURIComponent(data.lobby_id);
        document.getElementById("lobby-id").innerHTML = "Join: <a target='_blank' href='" + link + "'>" + data.lobby_id + "</a>";
        if (data.isHost) {
            view.showHost(data.ids.length > 1);
        }
        else {
            view.showLobby(data.ids.length > 1);
        }
    };
    SocketHandler.prototype.onMapChange = function (data) {
        document.getElementById('selected-map').innerHTML = 'Map: ' + data;
    };
    SocketHandler.prototype.onRestart = function (data) {
        view.showLobby(client.id_p2.id !== -1);
        while (view.canvas.stage.children.length > 0)
            view.canvas.stage.removeChildAt(view.canvas.stage.children.length - 1);
        view.canvas.stage.addChild(Util.loadImage("background.png"));
        client.id_p1.ready = false;
        client.id_p2.ready = false;
        console.log('restart!');
    };
    SocketHandler.prototype.onPlayers = function (data) {
        // console.log(JSON.stringify(data));
        view.showPlayers(data);
    };
    SocketHandler.prototype.onEnd = function (data) {
        view.showWin();
        document.getElementById('team').innerHTML = data.winners;
        view.displayPlayers(data.entities);
        if (client.timer)
            clearInterval(client.timer);
    };
    SocketHandler.prototype.sendReady = function (ready) {
        this.socket.emit('ready', { session_id: this.session_id, ready: ready });
    };
    SocketHandler.prototype.sendJoin = function (data) {
        this.socket.emit('join', data);
    };
    SocketHandler.prototype.sendHost = function (data) {
        this.socket.emit('host', data);
    };
    SocketHandler.prototype.sendMap = function (data) {
        this.socket.emit('map', data);
    };
    SocketHandler.prototype.sendStart = function () {
        this.socket.emit('start', { session_id: this.session_id });
    };
    SocketHandler.prototype.sendTeam = function (team, player) {
        this.socket.emit('team', { session_id: this.session_id, team: team, player: player });
    };
    SocketHandler.prototype.sendMove = function (id, direction) {
        this.socket.emit('move', { session_id: this.session_id, id: id, direction: direction });
    };
    SocketHandler.prototype.close = function () {
        if (this.socket)
            this.socket.disconnect();
    };
    return SocketHandler;
}());
var View = /** @class */ (function () {
    function View() {
        var images = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            images[_i] = arguments[_i];
        }
        var _this = this;
        this.screen_width = window.innerWidth;
        this.screen_height = window.innerHeight;
        var type = "WebGL";
        if (!PIXI.utils.isWebGLSupported()) {
            type = "canvas";
        }
        PIXI.utils.sayHello(type);
        //Setup app
        this.canvas = new PIXI.Application({ width: 1024, height: 512 });
        this.canvas.renderer.backgroundColor = 0x061639;
        this.canvas.renderer.view.style.position = "absolute";
        this.canvas.renderer.view.style.display = "block";
        this.canvas.renderer.autoResize = true;
        this.canvas.renderer.resize(this.screen_width, this.screen_height);
        PIXI.loader.add(images).load(function () { return _this.load(); });
        document.body.appendChild(this.canvas.view);
    }
    View.prototype.load = function () {
        var background = Util.loadImage("background.png");
        background.width = this.screen_width;
        background.height = this.screen_height;
        this.canvas.stage.addChild(background);
        var lobby = Util.getParameterByName("id", window.location.href);
        document.getElementById('lobby').value = lobby ? lobby : "";
    };
    View.prototype.resize = function () {
        if (!client.game)
            return;
        var width = client.game.board.width;
        var height = client.game.board.height;
        this.screen_width = window.innerWidth;
        this.screen_height = window.innerHeight;
        //44 of 1080 pixel is width of border.
        this.paddingX = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.paddingY = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.size = Math.min((this.screen_width - 2 * this.paddingX) / client.game.board.width, (this.screen_height - 2 * this.paddingY) / client.game.board.height);
        this.offsetX = ((this.screen_width - 2 * this.paddingX) - width * this.size) / 2 + this.paddingX;
        this.offsetY = ((this.screen_height - 2 * this.paddingY) - height * this.size) / 2 + this.paddingY;
        while (this.canvas.stage.children.length > 0)
            this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);
        this.canvas.renderer.resize(this.screen_width, this.screen_height);
        this.load();
        this.displayGame();
        this.makeSprites();
        this.displayPlayers(client.game.entities);
    };
    View.prototype.displayPlayers = function (entities) {
        for (var key in client.game.entities) {
            if (!client.game.entities.hasOwnProperty(key))
                continue;
            var entity = client.game.entities[key];
            if (!entity.sprite || !entity.text)
                continue;
            if (entities[key]) {
                entity.pos = entities[key].pos;
                entity.direction = entities[key].direction;
                entity.sprite.visible = true;
                entity.text.visible = true;
                entity.sprite.x = this.offsetX + (entity.pos.x / 100) * this.size;
                entity.sprite.y = this.offsetY + (entity.pos.y / 100) * this.size;
                entity.text.x = this.offsetX + (entity.pos.x / 100) * this.size + (0.5 * this.size);
                entity.text.y = this.offsetY + (entity.pos.y / 100) * this.size;
            }
            else {
                entity.sprite.visible = false;
                entity.text.visible = false;
            }
        }
    };
    View.prototype.displayGame = function () {
        var width = client.game.board.width;
        var height = client.game.board.height;
        var image = Util.loadImage("board_background.png");
        image.x = this.offsetX - this.paddingX;
        image.y = this.offsetY - this.paddingY;
        image.width = this.size * width + 2 * this.paddingX;
        image.height = this.size * height + 2 * this.paddingY;
        this.canvas.stage.addChild(image);
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0x8B4513);
        for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
                graphics.drawRect(this.offsetX + x * this.size, this.offsetY + y * this.size, this.size, this.size);
                var block = null;
                if (client.game.board.tiles[x][y].tile_type === "wall") {
                    block = Util.loadImage("block.png");
                }
                if (client.game.board.tiles[x][y].tile_type === "stop") {
                    block = Util.loadImage("stop.png");
                }
                if (block != null) {
                    block.x = this.offsetX + x * this.size;
                    block.y = this.offsetY + y * this.size;
                    block.width = block.height = this.size;
                    this.canvas.stage.addChild(block);
                }
            }
        }
        this.canvas.stage.addChild(graphics);
    };
    View.prototype.makeSprites = function () {
        var width = client.game.board.width;
        var height = client.game.board.height;
        for (var key in client.game.entities) {
            if (!client.game.entities.hasOwnProperty(key))
                continue;
            var entity = client.game.entities[key];
            entity.sprite = Util.loadImage("player_" + entity.team + ".png");
            entity.text = new PIXI.Text(entity.name, {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xff1010,
                align: 'center'
            });
            entity.sprite.width = entity.sprite.height = this.size;
            entity.sprite.visible = false;
            entity.text.visible = false;
            entity.text.anchor.set(0.5, 1);
            this.canvas.stage.addChild(entity.sprite);
            this.canvas.stage.addChild(entity.text);
        }
    };
    View.prototype.updatePos = function () {
        var speed = 30;
        var width = client.game.board.width;
        var height = client.game.board.height;
        for (var key in client.game.entities) {
            if (!client.game.entities.hasOwnProperty(key))
                continue;
            var entity = client.game.entities[key];
            if (!entity.sprite || !entity.text)
                continue;
            if (client.canMove(entity, speed)) {
                var dir = entity.direction;
                entity.pos.x += dir.x * speed;
                entity.pos.y += dir.y * speed;
                entity.sprite.width = entity.sprite.height = this.size;
                entity.sprite.x = this.offsetX + (entity.pos.x / 100) * this.size;
                entity.sprite.y = this.offsetY + (entity.pos.y / 100) * this.size;
                entity.text.x = this.offsetX + (entity.pos.x / 100) * this.size + (0.5 * this.size);
                entity.text.y = this.offsetY + (entity.pos.y / 100) * this.size;
            }
            else {
                client.stop(entity);
            }
        }
    };
    View.prototype.hideAll = function () {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'none';
        document.getElementById('wrapper').style.display = 'none';
        document.getElementById('winners').style.display = 'none';
    };
    View.prototype.showHost = function (multi) {
        this.hideAll();
        this.showLobby(multi);
        document.getElementById('maps').style.display = '';
    };
    View.prototype.showLobby = function (multi) {
        this.hideAll();
        if (multi)
            document.getElementById("team2").style.display = '';
        else
            document.getElementById("team2").style.display = 'none';
        document.getElementById("game-lobby").style.display = '';
        document.getElementById('wrapper').style.display = '';
    };
    View.prototype.showWin = function () {
        this.hideAll();
        document.getElementById('winners').style.display = '';
        document.getElementById('wrapper').style.display = '';
    };
    View.prototype.showPlayers = function (data) {
        var string = "<ol>";
        for (var i = 0; i < data.length; i++) {
            if (data[i].id === client.id_p1.id)
                client.id_p1.ready = client.id_p2.ready = data[i].ready;
            string += "<li>" + data[i].name + ":" + data[i].ready + ":" + data[i].team + "</li>";
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
    };
    return View;
}());
var Client = /** @class */ (function () {
    function Client() {
        this.id_p1 = { id: -1, ready: false };
        this.id_p2 = { id: -1, ready: false };
    }
    Client.prototype.start = function (data) {
        client.game = data.game;
        view.displayGame();
        view.makeSprites();
        this.timer = setInterval(function () { return view.updatePos(); }, 15);
    };
    Client.prototype.stop = function (entity) {
        entity.direction = { x: 0, y: 0, string: "NONE" };
        var cellSize = 100; //TODO config.
        var x = Math.round(entity.pos.x / cellSize) * cellSize;
        var y = Math.round(entity.y / cellSize) * cellSize;
        entity.pos = {
            x: x,
            y: y
        };
    };
    Client.prototype.canMove = function (entity, speed) {
        var cellSize = 100;
        var dir = entity.direction;
        //TODO Depends ons TPS
        var newX = entity.pos.x + dir.x * speed;
        var newY = entity.pos.y + dir.y * speed;
        var tiles = this.game.board ? this.game.board.tiles : null;
        if (!tiles) {
            console.log("Board or tiles undefined");
            return false;
        }
        if (!this.inBounds(newX, newY, entity))
            return false;
        try {
            switch (entity.direction.string) {
                case "NORTH":
                case "WEST":
                    return tiles[Math.floor(newX / cellSize)][Math.floor(newY / cellSize)].tile_type !== "wall";
                case "EAST":
                    return tiles[Math.floor((newX + entity.size) / cellSize)][Math.floor(newY / cellSize)].tile_type !== "wall";
                case "SOUTH":
                    return tiles[Math.floor(newX / cellSize)][Math.floor((newY + entity.size) / cellSize)].tile_type !== "wall";
                default:
                    return true;
            }
        }
        catch (error) {
            console.warn(error);
        }
    };
    Client.prototype.inBounds = function (newX, newY, entity) {
        //TODO config
        var cellSize = 100;
        return newX >= 0 && newY >= 0
            && newX + entity.size < this.game.board.width * cellSize
            && newY + entity.size < this.game.board.height * cellSize;
    };
    return Client;
}());
window.onload = function () {
    socketListener = new SocketHandler();
    client = new Client();
    view = new View("assets/block.png", "assets/background.png", "assets/player_blue.png", "assets/player_green.png", "assets/player_red.png", "assets/player_yellow.png", "assets/board_background.png", "assets/stop.png");
};
window.onkeypress = function (e) {
    if (!client || !client.game || !socketListener || !socketListener.socket)
        return;
    var idMap = {
        "w": client.id_p1.id,
        "a": client.id_p1.id,
        "s": client.id_p1.id,
        "d": client.id_p1.id,
        "arrowleft": client.id_p2.id,
        "arrowright": client.id_p2.id,
        "arrowup": client.id_p2.id,
        "arrowdown": client.id_p2.id,
    };
    var dirMap = {
        "w": "NORTH",
        "a": "WEST",
        "s": "SOUTH",
        "d": "EAST",
        "arrowleft": "WEST",
        "arrowright": "EAST",
        "arrowup": "NORTH",
        "arrowdown": "SOUTH",
    };
    var key = e.key.toLowerCase();
    if (idMap[key] === null || idMap[key] === undefined)
        return;
    socketListener.sendMove(idMap[key], dirMap[key]);
};
function _map(elm) {
    socketListener.sendMap(elm.value);
}
function _join() {
    socketListener.sendJoin(Util.getFormData());
}
function _host() {
    socketListener.sendHost(Util.getFormData());
}
function _ready() {
    client.id_p1.ready = client.id_p2.ready = !client.id_p1.ready;
    socketListener.sendReady(client.id_p1.ready);
}
function _setTeam(elm, i) {
    socketListener.sendTeam(elm.value, i);
}
function _start() {
    socketListener.sendStart();
}
function _resize() {
    if (!view)
        return;
    view.resize();
}
//# sourceMappingURL=_client.js.map