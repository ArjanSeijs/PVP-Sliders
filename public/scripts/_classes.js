/*
 * Welcome in this clusterfuck of code!
 * Feel free to edit this code if you can figure out what it does.
 * The link to the (small) documentation can be found in the variable 'api'
 * Suggestions: <TODO> add place where people can post suggestions. (git?)
 */
var Application = PIXI.Application;
var Sprite = PIXI.Sprite;
var view;
var client;
var enableNames = true;
/**
 * Utility classes for loading stuff.
 */
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
        var resource = PIXI.loader.resources["assets/" + image];
        if (!resource)
            return null;
        return new PIXI.Sprite(resource.texture);
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
     * Updates the login form data.
     * @param username
     * @param multiplayer
     * @param lobby
     * @param password
     */
    Util.setFormData = function (username, multiplayer, lobby, password) {
        var usernameElm = document.getElementById("username");
        var multiplayerElm = document.getElementById("multiplayer");
        var lobbyElm = document.getElementById("lobby");
        var passwordElm = document.getElementById("password");
        if (username)
            usernameElm.value = username;
        if (multiplayer === "true")
            multiplayerElm.checked = true;
        if (lobby)
            lobbyElm.value = lobby;
        if (password)
            passwordElm.value = password;
    };
    /**
     * Gets the lobby options.
     * @return {{bots: boolean}}
     */
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
        this.loaded = false;
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
        PIXI.loader.add(images).load(function () {
            var loginDiv = document.getElementById("login");
            if (loginDiv)
                loginDiv.style.display = '';
            document.body.appendChild(_this.canvas.view);
            _this.load(onload);
            PIXI.loader.add("assets/background.png").load(function () {
                var background = Util.loadImage("background.png");
                if (background) {
                    background.width = _this.screen_width;
                    background.height = _this.screen_height;
                    _this.canvas.stage.addChildAt(background, 0);
                }
                document.body.style.background = "";
            });
        });
    }
    View.prototype.load = function (onload) {
        var background = Util.loadImage("background.png");
        if (background) {
            background.width = this.screen_width;
            background.height = this.screen_height;
            this.canvas.stage.addChild(background);
        }
        var lobby = Util.getParameterByName("id", window.location.href);
        var lobbyDiv = document.getElementById('lobby');
        if (lobbyDiv)
            lobbyDiv.value = lobby ? lobby : "";
        this.loaded = true;
        view.loading(false);
        if (onload)
            onload();
    };
    View.prototype.resize = function (board) {
        this.screen_width = window.innerWidth;
        this.screen_height = window.innerHeight;
        this.canvas.renderer.resize(this.screen_width, this.screen_height);
        if (!this.loaded)
            return;
        if (!client.getGame() && !board && !this.board) {
            this.load();
            return;
        }
        if (!board && client.getGame())
            board = client.getGame().board;
        else if (!board && this.board)
            board = this.board;
        this.board = board;
        var width = board.width;
        var height = board.height;
        //44 of 1080 pixel is width of border.
        this.paddingX = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.paddingY = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.size = Math.min((this.screen_width - 2 * this.paddingX) / board.width, (this.screen_height - 2 * this.paddingY) / board.height);
        this.offsetX = ((this.screen_width - 2 * this.paddingX) - width * this.size) / 2 + this.paddingX;
        this.offsetY = ((this.screen_height - 2 * this.paddingY) - height * this.size) / 2 + this.paddingY;
        while (this.canvas.stage.children.length > 0)
            this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);
        this.load();
        this.displayGame(board);
        if (client.getGame()) {
            this.makeSprites();
            this.displayPlayers(client.getGame().entities);
        }
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
                entity.text.visible = enableNames;
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
    View.prototype.displayGame = function (board) {
        if (!board)
            board = client.getGame().board;
        var width = board.width;
        var height = board.height;
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
                if (board.tiles[x][y].tile_type === "wall") {
                    block = Util.loadImage("block.png");
                }
                if (board.tiles[x][y].tile_type === "stop") {
                    block = Util.loadImage("stop.png");
                }
                if (board.tiles[x][y].tile_type === "player") {
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
                fontFamily: '"Lucida Sans Unicode", "Lucida Grande", sans-serif',
                fontSize: 16,
                fill: 0x0000FF,
                align: 'center',
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
        if (!client || !client.getGame())
            return;
        //TODO get speed from server.
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
        document.getElementById("chatWrapper").style.display = 'none';
        document.getElementById('wrapper').style.display = 'none';
        document.getElementById('winners').style.display = 'none';
    };
    View.prototype.showHost = function (multi) {
        this.hideAll();
        this.showLobby(multi);
        document.getElementById('maps').style.display = '';
        document.getElementById('botsBox').style.display = '';
        document.getElementById("changePassword").style.display = '';
        document.getElementById("startbtn").style.display = '';
        this.isHost = true;
    };
    View.prototype.showLogin = function () {
        this.hideAll();
        this.isHost = false;
        document.getElementById("login").style.display = '';
        document.getElementById('wrapper').style.display = '';
    };
    View.prototype.showLobby = function (multi) {
        this.hideAll();
        if (!this.isHost)
            document.getElementById("startbtn").style.display = 'none';
        document.getElementById("game-lobby").style.display = '';
        document.getElementById('wrapper').style.display = '';
        document.getElementById("chatWrapper").style.display = '';
        this.resize();
    };
    View.prototype.showWin = function (winners) {
        this.hideAll();
        document.getElementById('winners').style.display = '';
        document.getElementById('wrapper').style.display = '';
        if (winners[0]) {
            document.getElementById('winners').innerHTML = "Team <span class=\"" + winners[0].team + "\">" + winners[0].team + "</span> has won!<br> Winners:<br>";
            for (var _i = 0, winners_1 = winners; _i < winners_1.length; _i++) {
                var winner = winners_1[_i];
                document.getElementById('winners').innerHTML += winner.name + "\n";
            }
        }
        else {
            document.getElementById('winners').innerHTML = "Draw";
        }
    };
    View.prototype.getOption = function (team, actualteam) {
        return "<option value=" + team + " class=" + team + " " + (actualteam === team ? "selected" : "") + ">" + team + "</option>";
    };
    View.prototype.getSelect = function (team, player) {
        return " <select class=\"select-style\" id=\"teamselect\" onchange=\"_setTeam(this," + player + ")\">" +
            this.getOption("red", team) +
            this.getOption("yellow", team) +
            this.getOption("blue", team) +
            this.getOption("green", team) +
            this.getOption("purple", team) +
            this.getOption("cyan", team) +
            this.getOption("orange", team) +
            this.getOption("pink", team) +
            this.getOption("darkred", team) +
            this.getOption("darkyellow", team) +
            this.getOption("darkblue", team) +
            this.getOption("darkgreen", team) +
            this.getOption("darkpurple", team) +
            this.getOption("darkcyan", team) +
            this.getOption("darkorange", team) +
            this.getOption("darkpink", team) +
            this.getOption("random", team) +
            "</select>";
    };
    View.prototype.playerEntry = function (name, team, ready, player, id) {
        var isready = "<i class=\"fas fa-check-square\"></i>";
        var notready = "<i class=\"fas fa-times-circle\"></i>";
        var string = "<li class='playerItem'>";
        if (player !== null)
            string += "<div class=\"listName\" style=\"text-decoration: underline\"><b>" + name + "</b></div>";
        else
            string += "<div class=\"listName\">" + name + "</div>";
        if (player !== null)
            string += "<div class=\"listTeam " + team + "bg\">" + this.getSelect(team, player) + "</div>";
        else
            string += "<div class=\"listTeam " + team + "bg\">" + team + "</div>";
        if (ready !== null)
            string += "<div class=\"listReady\">" + (ready ? isready : notready) + "&nbsp;&nbsp;</div>";
        else
            string += "<div class=\"listReady\">Ready</div>";
        if (this.isHost && id !== null) {
            string += "<div class=\"listKick clickable\" onclick=\"_kick(" + id + ")\"><i class=\"fas fa-gavel\"></i>&nbsp;</div>";
        }
        else if (this.isHost)
            string += '<div class="listKick">&nbsp;</div>';
        string += "</li>";
        return string;
    };
    View.prototype.showPlayers = function (data) {
        var string = "<ol class='playerList'>";
        var isTrue = function (string) {
            return string === "true" || string === true;
        };
        string += this.playerEntry("Player", "Team", null, null, null);
        client.setReady(data);
        for (var i = 0; i < data.length; i++) {
            var name_1 = data[i].name;
            var team = data[i].team;
            var ready = data[i].ready;
            var id = data[i].id;
            var player = data[i].player;
            string += this.playerEntry(name_1, team, isTrue(ready), client.isLocal(id) ? player : null, id);
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
        document.getElementById("player-amount").innerHTML = data.length;
        this.resize(this.board);
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
    View.prototype.loading = function (load) {
        var elm = document.getElementById("loading");
        if (!elm)
            return;
        elm.style.display = load ? "" : "none";
    };
    View.prototype.boardData = function (data) {
        document.getElementById('selected-map').innerHTML = 'Map: ' + data.boardName;
        document.getElementById('player-total').innerHTML = data.board.players;
    };
    View.prototype.showStarting = function (b) {
        var elm = document.getElementById('starting');
        if (!elm)
            return;
        if (b)
            elm.style.display = '';
        else
            elm.style.display = 'none';
    };
    View.prototype.addChat = function (data) {
        var chat = "<div class=\"comment\"><div class=\"author\"><i class=\"fas fa-comments\"></i>&nbsp;" + data.user + "</div><div class=\"message\">" + data.text + "</div></div>";
        var elm = document.getElementById("comment_box");
        if (!elm)
            return;
        elm.innerHTML += chat;
        elm.scrollTop = elm.scrollHeight;
    };
    return View;
}());
var Client = /** @class */ (function () {
    function Client() {
        this.id_p1 = { id: -1, ready: false };
        this.id_p2 = { id: -1, ready: false };
        var defaultKeys = [
            { up: "w", down: "s", left: "a", right: "d" },
            { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" }
        ];
        var keys = Cookies.getJSON("keys");
        if (!keys) {
            Cookies.set("keys", defaultKeys);
        }
        this.keys = keys;
    }
    Client.prototype.start = function (data) {
        var _this = this;
        this.game = data.game;
        view.displayGame();
        view.makeSprites();
        view.showStarting(true);
        var date = new Date().getTime() + 5000;
        var interval = setInterval(function () { return _this.count(date); }, 10);
        setTimeout(function () {
            if (interval)
                clearInterval(interval);
            _this.timer = setInterval(function () { return view.updatePos(); }, 15);
            view.showStarting(false);
        }, 5000);
    };
    Client.prototype.count = function (start) {
        var elm = document.getElementById("count");
        if (!elm)
            return;
        var i = Math.floor((start - new Date().getTime()) / 1000);
        if (i !== 0)
            elm.innerHTML = i.toString();
        else
            elm.innerHTML = "GO!";
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
        if (this.isStop(entity, speed))
            return false;
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
        var dir = entity.direction;
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
            case this.keys[0].up:
            case this.keys[0].down:
            case this.keys[0].left:
            case this.keys[0].right:
                return id1;
            case this.keys[1].up:
            case this.keys[1].down:
            case this.keys[1].left:
            case this.keys[1].right:
                return id2;
            default:
                return null;
        }
    };
    Client.prototype.getDirection = function (key) {
        switch (key) {
            case this.keys[0].up:
            case this.keys[1].up:
                return "NORTH";
            case this.keys[0].down:
            case this.keys[1].down:
                return "SOUTH";
            case this.keys[0].left:
            case this.keys[1].left:
                return "WEST";
            case this.keys[0].right:
            case this.keys[1].right:
                return "EAST";
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
    Client.prototype.reset = function () {
        this.game = null;
    };
    Client.prototype.isLocal = function (id) {
        return id === this.id_p1.id || id === this.id_p2.id;
    };
    Client.prototype.move = function (id, direction) {
        var directions = {
            NONE: { x: 0, y: 0 },
            NORTH: { x: 0, y: -1 },
            SOUTH: { x: 0, y: 1 },
            WEST: { x: 1, y: 0 },
            EAST: { x: -1, y: 0 }
        };
        if (!this.game)
            return;
        for (var key in this.game.entities) {
            if (!this.game.entities.hasOwnProperty(key))
                continue;
            if (this.game.entities[key].id === id) {
                this.game.entities[key].direction = {
                    string: direction,
                    x: directions[direction].x,
                    y: directions[direction].y
                };
            }
        }
    };
    Client.prototype.setKeys = function (p1, p2) {
        if (p1) {
            this.keys[0].down = p1.down ? p1.down : this.keys[0].down;
            this.keys[0].up = p1.up ? p1.up : this.keys[0].up;
            this.keys[0].left = p1.left ? p1.left : this.keys[0].left;
            this.keys[0].right = p1.right ? p1.right : this.keys[0].right;
        }
        if (p2) {
            this.keys[1].down = p2.down ? p2.down : this.keys[1].down;
            this.keys[1].up = p2.up ? p2.up : this.keys[1].up;
            this.keys[1].left = p2.left ? p2.left : this.keys[1].left;
            this.keys[1].right = p2.right ? p2.right : this.keys[1].right;
        }
        if (p1 || p2) {
            Cookies.set("keys", this.keys);
        }
    };
    return Client;
}());
//# sourceMappingURL=_classes.js.map