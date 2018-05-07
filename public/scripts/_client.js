/*
 * Welcome in this clusterfuck of code!
 * Feel free to edit this code if you can figure out what it does.
 * The link to the (small) documentation can be found in the variable 'api'
 * Suggestions: <TODO> add place where people can post suggestions. (git?)
 */
var api = Util.getUrl() + "/api.html";
var socketListener;
/**
 * The socketHandler class handles the communication between the client and the server.
 */
var SocketHandler = /** @class */ (function () {
    function SocketHandler() {
        var _this = this;
        this.socket = io(Util.getUrl(), { wsEngine: 'ws' });
        this.socket.on('start', function (data) { return _this.onStart(data); });
        this.socket.on('update', function (data) { return _this.onUpdate(data); });
        this.socket.on('failed', function (data, refresh) { return _this.onFailed(data, refresh); });
        this.socket.on('info', function (data) { return _this.onInfo(data); });
        this.socket.on('joined', function (data) { return _this.onJoined(data); });
        this.socket.on('restart', function (data) { return _this.onRestart(data); });
        this.socket.on('players', function (data) { return _this.onPlayers(data); });
        this.socket.on('map', function (data) { return _this.onMapChange(data); });
        this.socket.on('end', function (data) { return _this.onEnd(data); });
        this.socket.on('chat', function (data) { return _this.onChat(data); });
    }
    /**
     * This event is fired when the game starts.
     * data.game : Game
     * @param data The data send by the server.
     */
    SocketHandler.prototype.onStart = function (data) {
        view.hideAll();
        client.start(data);
        view.resize();
        view.loading(false);
    };
    /**
     * This event is fired when an update is send by the server.
     * When the update is received, all the positions of the client are synced up again.
     * If an entity died it will not be send again by the update.
     * entities : Map<String, Entity>
     * @param entities the entities.
     */
    SocketHandler.prototype.onUpdate = function (entities) {
        view.displayPlayers(entities);
    };
    /**
     * This event is fired when something went wrong, i.e wrong username or host disconnect.
     * @param {string} data
     * @param {boolean} refresh If the client is disconnected and should leave the current lobby.
     */
    SocketHandler.prototype.onFailed = function (data, refresh) {
        alert(data);
        view.loading(false);
        if (refresh)
            _leave();
    };
    /**
     * This event is fired when information is send by the server.
     * @param {string} data
     */
    SocketHandler.prototype.onInfo = function (data) {
        alert(data);
        view.loading(false);
    };
    /**
     * This event is fired when information is send by the server.
     * You get an session_id and an indicator if you are the host or not.
     * data.session_id : string
     * data.isHost : boolean
     * @param data
     */
    SocketHandler.prototype.onJoined = function (data) {
        client.setIds(data);
        this.session_id = data.session_id;
        var link = "/?id=" + encodeURIComponent(data.lobby_id);
        document.getElementById("lobby-id").innerHTML = "Join: <a target='_blank' href='" + link + "'>" + data.lobby_id + "</a>";
        if (data.isHost) {
            view.showHost(data.ids.length > 1);
        }
        else {
            view.showLobby(data.ids.length > 1);
        }
        view.loading(false);
        view.boardData(data);
        view.resize(data.board);
    };
    /**
     * This event is fired when the map is changed when you are in the lobby.
     * data.boardName : string
     * data.board : Board
     * @param data
     */
    SocketHandler.prototype.onMapChange = function (data) {
        view.boardData(data);
        view.loading(false);
        view.resize(data.board);
    };
    /**
     * This event is fired when the game ends and you are redirected to the lobby.
     * @param data
     */
    SocketHandler.prototype.onRestart = function (data) {
        view.showLobby(client.isMulti());
        client.reset();
        view.clearCanvas();
        client.end();
        view.resize();
    };
    /**
     * This event is fired when something changed with the joined players.
     * For example joining, leaving or sending ready status.
     * data : Array<Entity>
     * @param data
     */
    SocketHandler.prototype.onPlayers = function (data) {
        view.showPlayers(data);
        view.loading(false);
    };
    /**
     * This event is fired when the game ends.
     * data.winners: Array<Entity>
     * data.entities: Map<String,Entity>
     * @param data
     */
    SocketHandler.prototype.onEnd = function (data) {
        view.showWin(data.winners);
        view.displayPlayers(data.entities);
        client.end();
    };
    /**
     * This event is fired when a chat message is received.
     * data.user : string
     * data.text : string
     * @param data
     */
    SocketHandler.prototype.onChat = function (data) {
        view.addChat(data);
    };
    /**
     * Send to the server that you are ready.
     * @param {boolean} ready
     */
    SocketHandler.prototype.sendReady = function (ready) {
        this.socket.emit('ready', { session_id: this.session_id });
    };
    /**
     * Send that you want to join a lobby.
     * data.lobby: string - The lobby id (or empty if random)
     * data.password: string - A lobby password if necessary
     * data.multiplayer: number - How many local players (capped at 2 on server)
     * @param {{}} data
     */
    SocketHandler.prototype.sendJoin = function (data) {
        this.socket.emit('join', data);
    };
    /**
     * Send that you want to host a lobby.
     * data.password: string - A lobby password if necessary
     * data.multiplayer: number - How many local players (capped at 2 on server)
     * @param {{}} data
     */
    SocketHandler.prototype.sendHost = function (data) {
        this.socket.emit('host', data);
    };
    /**
     * As host, send that you want to change the map.
     * @param {string | string[]} board The map name or base64 string (if custom)
     * @param {boolean} custom Whether it is a custom map or predefined map.
     * @param {string} mapName If custom map the mapname.
     */
    SocketHandler.prototype.sendMap = function (board, custom, mapName) {
        this.socket.emit('map', { board: board, custom: !!custom, mapName: mapName, session_id: this.session_id });
    };
    /**
     * As host, start the game.
     */
    SocketHandler.prototype.sendStart = function () {
        this.socket.emit('start', { session_id: this.session_id });
    };
    /**
     * Send the team you want to play as.
     * @param {string} team Team-colour
     * @param {number} player The local player to change the team of.
     */
    SocketHandler.prototype.sendTeam = function (team, player) {
        this.socket.emit('team', { session_id: this.session_id, team: team, player: player });
    };
    /**
     * Send that you want to move the entity.
     * @param {number} id The entity-id
     * @param {string} direction The direction: NORTH, SOUTH, EAST, WEST
     */
    SocketHandler.prototype.sendMove = function (id, direction) {
        this.socket.emit('move', { session_id: this.session_id, id: id, direction: direction });
    };
    /**
     * As host send if you want to enable/disable bots.
     * @param {{bots: boolean}} options
     */
    SocketHandler.prototype.sendOptions = function (options) {
        this.socket.emit('options', { session_id: this.session_id, options: options });
    };
    /**
     * Close the socket connection.
     */
    SocketHandler.prototype.close = function () {
        if (this.socket)
            this.socket.disconnect();
    };
    /**
     * Close the socket connection.
     */
    SocketHandler.prototype.disconnect = function () {
        if (this.socket)
            this.socket.disconnect();
    };
    /**
     * As host, kick a player
     * @param id The id of the player to kick.
     */
    SocketHandler.prototype.sendKick = function (id) {
        view.loading(true);
        this.socket.emit('kick', { session_id: this.session_id, id: id });
    };
    /**
     * As host, change the password.
     * @param {string} value The password
     */
    SocketHandler.prototype.sendPassword = function (value) {
        view.loading(true);
        this.socket.emit('password', { session_id: this.session_id, password: value });
    };
    /**
     * Send a chat message.
     * @param {string} text The message
     */
    SocketHandler.prototype.sendChat = function (text) {
        this.socket.emit('chat', { session_id: this.session_id, text: text });
    };
    return SocketHandler;
}());
window.onload = init;
/**
 * Initializes the client, view and socketListener.
 * Also updates the form for cookies.
 */
function init() {
    socketListener = new SocketHandler();
    client = new Client();
    Util.setFormData(Cookies.get("username"), Cookies.get("multiplayer"), Cookies.get("lobby"), Cookies.get("password"));
    view = new View(null, "assets/block.png", "assets/player_blue.png", "assets/player_green.png", "assets/player_red.png", "assets/player_yellow.png", "assets/player_purple.png", "assets/player_cyan.png", "assets/player_orange.png", "assets/player_pink.png", "assets/player_darkblue.png", "assets/player_darkgreen.png", "assets/player_darkred.png", "assets/player_darkyellow.png", "assets/player_darkpurple.png", "assets/player_darkcyan.png", "assets/player_darkorange.png", "assets/player_darkpink.png", "assets/board_background.png", "assets/stop.png");
    view.loading(true);
    selectMaps();
    var elm = document.getElementById("bots");
    if (elm)
        elm.checked = false;
    initChat();
}
/**
 * Add an event listener for the chat box.
 */
function initChat() {
    var elm = document.getElementById("chat-box");
    elm.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            var text = elm.value;
            elm.value = "";
            socketListener.sendChat(text);
        }
    }, false);
}
/**
 * Initialize the default maps and load the custom maps from the cookies.
 */
function selectMaps() {
    var maps = Cookies.getJSON("maps");
    var select = document.getElementById("mapselect");
    select.innerHTML =
        "<option value=\"horizontal\">Horizontal</option>\n" +
            "<option value=\"map1v1\">Map1v1</option>\n" +
            "<option value=\"maze\">Maze</option>\n" +
            "<option value=\"maze2\">Maze2</option>\n" +
            "<option value=\"Palooza\" selected=\"selected\">Palooza</option>\n" +
            "<option value=\"vertical\">Vertical</option>\n" +
            "<option value=\"DontStopMeNow\">Don't Stop Me Now</option>\n" +
            "<option value=\"MsHyde\">Ms Hyde</option>\n" +
            "<option value=\"IsThisRealLife\">Is this real life?</option>" +
            "<option value=\"Suicide\">Suicide</option>";
    if (!maps)
        return;
    Object.keys(maps).forEach((function (map, index, array) {
        select.innerHTML += '<option data-custom=true value="(Custom) ' + map + '">(Custom) ' + map + '</option>';
    }));
}
var keyHandler = null;
window.onkeypress = function (e) {
    move(e.key);
    if (keyHandler)
        keyHandler(e.key);
};
/**
 * Change the key of a player.
 * @param {number} player Player 1 or player 2
 * @param {string} direction (up,down,left,right)
 */
function _changeKey(player, direction) {
    var forbidden = ["escape", "f1", "f2", "f3", "f4", "f5", "f11", "alt", "ctrl", "shift", "backspace", "enter"];
    var elm = document.getElementById("press" + player);
    if (elm)
        elm.innerHTML = "Press key";
    keyHandler = function (key) {
        var keys1 = {};
        var keys2 = {};
        if (forbidden.indexOf(key.toLowerCase()) > -1) {
            if (elm)
                elm.innerHTML = "&nbsp;";
            return;
        }
        if (player === 0) {
            keys1[direction] = key.toLowerCase();
        }
        else {
            keys2[direction] = key.toLowerCase();
        }
        alert("Key set to:" + key.toLowerCase());
        if (elm)
            elm.innerHTML = "&nbsp;";
        client.setKeys(keys1, keys2);
        keyHandler = null;
    };
}
/**
 * Move an entity from the given key
 * @param {string} key
 */
function move(key) {
    if (!client || !client.getGame() || !socketListener)
        return;
    key = key.toLowerCase();
    var id = client.getId(key);
    var direction = client.getDirection(key);
    if (id === null || !direction)
        return;
    socketListener.sendMove(id, direction);
}
/**
 * Set the new map. It will call _load if you have a custom map.
 * @param {HTMLSelectElement} elm
 */
function _map(elm) {
    var substr = "(Custom) ";
    if (elm.value.length > substr.length && elm.value.substr(0, substr.length) === substr) {
        _load(elm.value.substr(substr.length));
    }
    else {
        socketListener.sendMap(elm.value);
    }
    view.loading(true);
}
/**
 * Store the form data in the cookies.
 * @private
 */
function setCookies() {
    var data = Util.getFormData();
    Cookies.set("username", data.username, { expires: 100 * 356 });
    Cookies.set("multiplayer", data.multiplayer ? "true" : "false", { expires: 100 * 356 });
    Cookies.set("lobby", data.lobby, { expires: 100 * 356 });
    Cookies.set("password", data.password, { expires: 100 * 356 });
}
/**
 * Join a server loaded from the formData.
 */
function _join() {
    setCookies();
    socketListener.sendJoin(Util.getFormData());
    view.loading(true);
}
/**
 * Host a server loaded from the formdata.
 * @private
 */
function _host() {
    setCookies();
    socketListener.sendHost(Util.getFormData());
    view.loading(true);
}
/**
 * Send the ready status
 */
function _ready() {
    socketListener.sendReady(client.toggleReady());
    view.loading(true);
}
/**
 * Send the team.
 * @param {HTMLSelectElement} elm
 * @param {number} i
 */
function _setTeam(elm, i) {
    socketListener.sendTeam(elm.value, i);
    view.loading(true);
}
/**
 * Send the start.
 */
function _start() {
    socketListener.sendStart();
    view.loading(true);
}
/**
 * Resize the window on a resize event.
 */
function _resize() {
    if (!view)
        return;
    view.resize();
}
/**
 * Load a custom map.
 */
function _cMap() {
    var elm = document.getElementById("custommap");
    var elmmap = document.getElementById("mapselect");
    if (atob(elm.value).length < 16) {
        return;
    }
    socketListener.sendMap(elm.value, true, elmmap.value);
    view.loading(true);
}
/**
 * Load the custom map from the given string.
 * @param {string} save
 */
function _load(save) {
    var maps = Cookies.getJSON("maps");
    if (!save) {
        var saved = Object.keys(maps).reduce(function (pv, cv, ci, arr) { return pv + cv + ","; }, "Choose a map:\n");
        save = prompt(saved, "Save1");
    }
    var elm = document.getElementById("custommap");
    if (!maps[save]) {
        alert("Map does not exist");
        return;
    }
    elm.value = maps[save];
    _cMap();
    view.loading(true);
}
/**
 * Send the options.
 */
function _options() {
    socketListener.sendOptions(Util.getOptions());
}
/**
 * Update map selection
 * @private
 */
function _sync() {
    selectMaps();
}
/**
 * Kick a player
 * @param id
 * @private
 */
function _kick(id) {
    if (id !== null) {
        socketListener.sendKick(id);
    }
}
/**
 * Send password.
 * @private
 */
function _password() {
    var elm = document.getElementById("newPassword");
    socketListener.sendPassword(elm.value);
}
/**
 * Send map from a base64 string
 * @private
 */
function _loadBase64() {
    var value = prompt("Give the encoded string to parse");
    socketListener.sendMap(value, true, "(Custom)");
}
/**
 * Leave the lobby
 */
function _leave() {
    if (socketListener)
        socketListener.disconnect();
    socketListener = new SocketHandler();
    client = new Client();
    Util.setFormData(Cookies.get("username"), Cookies.get("multiplayer"), Cookies.get("lobby"), Cookies.get("password"));
    selectMaps();
    var elm = document.getElementById("bots");
    if (elm)
        elm.checked = false;
    view.showLogin();
}
/**
 * Display the settings screen.
 * @param {boolean} show
 */
function _showSettings(show) {
    var elm = document.getElementById('settings');
    if (!elm)
        return;
    if (show) {
        elm.style.display = '';
    }
    else {
        elm.style.display = 'none';
    }
}
//# sourceMappingURL=_client.js.map