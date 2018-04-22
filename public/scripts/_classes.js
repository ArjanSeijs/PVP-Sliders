var Application = PIXI.Application;
var Sprite = PIXI.Sprite;
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
    Util.getOptions = function () {
        var bots = document.getElementById("bots").checked;
        return { bots: bots };
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
var View = /** @class */ (function () {
    function View(onload) {
        var images = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            images[_i - 1] = arguments[_i];
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
        PIXI.loader.add(images).load(function () { return _this.load(onload); });
        document.body.appendChild(this.canvas.view);
    }
    View.prototype.load = function (onload) {
        var background = Util.loadImage("background.png");
        background.width = this.screen_width;
        background.height = this.screen_height;
        this.canvas.stage.addChild(background);
        var lobby = Util.getParameterByName("id", window.location.href);
        var elm = document.getElementById('lobby');
        if (elm)
            elm.value = lobby ? lobby : "";
        if (onload)
            onload();
    };
    View.prototype.resize = function () {
        if (!client.getGame())
            return;
        var width = client.getGame().board.width;
        var height = client.getGame().board.height;
        this.screen_width = window.innerWidth;
        this.screen_height = window.innerHeight;
        //44 of 1080 pixel is width of border.
        this.paddingX = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.paddingY = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.size = Math.min((this.screen_width - 2 * this.paddingX) / client.getGame().board.width, (this.screen_height - 2 * this.paddingY) / client.getGame().board.height);
        this.offsetX = ((this.screen_width - 2 * this.paddingX) - width * this.size) / 2 + this.paddingX;
        this.offsetY = ((this.screen_height - 2 * this.paddingY) - height * this.size) / 2 + this.paddingY;
        while (this.canvas.stage.children.length > 0)
            this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);
        this.canvas.renderer.resize(this.screen_width, this.screen_height);
        this.load();
        this.displayGame();
        this.makeSprites();
        this.displayPlayers(client.getGame().entities);
    };
    View.prototype.displayPlayers = function (entities) {
        for (var key in client.getGame().entities) {
            if (!client.getGame().entities.hasOwnProperty(key))
                continue;
            var entity = client.getGame().entities[key];
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
        var width = client.getGame().board.width;
        var height = client.getGame().board.height;
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
                if (client.getGame().board.tiles[x][y].tile_type === "wall") {
                    block = Util.loadImage("block.png");
                }
                if (client.getGame().board.tiles[x][y].tile_type === "stop") {
                    block = Util.loadImage("stop.png");
                }
                if (client.getGame().board.tiles[x][y].tile_type === "player") {
                    block = Util.loadImage("player_red.png");
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
        var width = client.getGame().board.width;
        var height = client.getGame().board.height;
        for (var key in client.getGame().entities) {
            if (!client.getGame().entities.hasOwnProperty(key))
                continue;
            var entity = client.getGame().entities[key];
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
        var width = client.getGame().board.width;
        var height = client.getGame().board.height;
        for (var key in client.getGame().entities) {
            if (!client.getGame().entities.hasOwnProperty(key))
                continue;
            var entity = client.getGame().entities[key];
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
        client.setReady(data);
        for (var i = 0; i < data.length; i++) {
            string += "<li>" + data[i].name + ":" + data[i].ready + ":" + data[i].team + "</li>";
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
    };
    View.prototype.clearCanvas = function () {
        while (this.canvas.stage.children.length > 0)
            this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);
        this.canvas.stage.addChild(Util.loadImage("background.png"));
    };
    View.prototype.getCanvas = function () {
        return this.canvas;
    };
    View.prototype.getValues = function () {
        return {
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            size: this.size
        };
    };
    return View;
}());
var Client = /** @class */ (function () {
    function Client() {
        this.id_p1 = { id: -1, ready: false };
        this.id_p2 = { id: -1, ready: false };
    }
    Client.prototype.start = function (data) {
        this.game = data.game;
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
    Client.prototype.isStop = function (entity, speed) {
        var cellSize = 100;
        var dir = entity.direction.curr;
        //TODO Depends ons TPS
        var newX = entity.pos.x + dir.x * speed;
        var newY = entity.pos.y + dir.y * speed;
        if (!this.inBounds(newX, newY, entity))
            return false;
        var tile = null;
        switch (entity.direction) {
            case "NORTH": {
                var x = Math.floor(newX / cellSize);
                var y = Math.floor(newY / cellSize) + 1;
                if (!this.indexInBounds(x, y))
                    return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === "stop" && tile.pos.y <= entity.pos.y;
            }
            case "WEST": {
                var x = Math.floor(newX / cellSize) + 1;
                var y = Math.floor(newY / cellSize);
                if (!this.indexInBounds(x, y))
                    return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === "stop" && tile.pos.x <= entity.pos.x;
            }
            case "EAST": {
                var x = Math.floor((newX + entity.size) / cellSize) - 1;
                var y = Math.floor(newY / cellSize);
                if (!this.indexInBounds(x, y))
                    return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === "stop" && tile.pos.x >= entity.pos.x;
            }
            case "SOUTH": {
                var x = Math.floor(newX / cellSize);
                var y = Math.floor((newY + entity.size) / cellSize) - 1;
                if (!this.indexInBounds(x, y))
                    return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === "stop" && tile.pos.y >= entity.pos.y;
            }
        }
        return false;
    };
    Client.prototype.inBounds = function (newX, newY, entity) {
        //TODO config
        var cellSize = 100;
        return newX >= 0 && newY >= 0
            && newX + entity.size < this.game.board.width * cellSize
            && newY + entity.size < this.game.board.height * cellSize;
    };
    Client.prototype.indexInBounds = function (x, y) {
        return x >= 0 && y >= 0
            && x < this.game.board.width
            && y < this.game.board.height;
    };
    Client.prototype.setIds = function (data) {
        this.id_p1.id = data.ids[0].id;
        if (data.ids[1])
            this.id_p2.id = data.ids[1].id;
    };
    Client.prototype.isMulti = function () {
        return this.id_p2.id !== -1;
    };
    Client.prototype.end = function () {
        this.id_p1.ready = false;
        this.id_p2.ready = false;
        if (this.timer)
            clearInterval(this.timer);
    };
    Client.prototype.getGame = function () {
        return this.game;
    };
    Client.prototype.toggleReady = function () {
        this.id_p1.ready = this.id_p2.ready = !this.id_p1.ready;
        return this.id_p1.ready;
    };
    Client.prototype.getId = function (key) {
        var id1 = this.id_p1.id;
        var id2 = this.id_p2.id;
        if (id2 === -1)
            id2 = id1;
        switch (key) {
            case "w":
            case "a":
            case "s":
            case "d":
                return id1;
            case "arrowleft":
            case "arrowright":
            case "arrowup":
            case "arrowdown":
                return id2;
            default:
                return null;
        }
    };
    Client.prototype.setReady = function (data) {
        for (var i = 0; i < data.length; i++) {
            if (data[i].id === this.id_p1.id)
                this.id_p1.ready = this.id_p2.ready = data[i].ready;
        }
    };
    return Client;
}());
//# sourceMappingURL=_classes.js.map