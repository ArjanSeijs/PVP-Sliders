var socketListener;
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
    SocketHandler.prototype.onStart = function (data) {
        view.hideAll();
        client.start(data);
        view.resize();
        view.loading(false);
    };
    SocketHandler.prototype.onUpdate = function (entities) {
        view.displayPlayers(entities);
    };
    SocketHandler.prototype.onFailed = function (data, refresh) {
        alert(data);
        view.loading(false);
        if (refresh)
            _leave();
    };
    SocketHandler.prototype.onInfo = function (data) {
        alert(data);
        view.loading(false);
    };
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
    SocketHandler.prototype.onMapChange = function (data) {
        console.log(data);
        view.boardData(data);
        view.loading(false);
        view.resize(data.board);
    };
    SocketHandler.prototype.onRestart = function (data) {
        view.showLobby(client.isMulti());
        client.reset();
        view.clearCanvas();
        client.end();
        view.resize();
    };
    SocketHandler.prototype.onPlayers = function (data) {
        view.showPlayers(data);
        view.loading(false);
    };
    SocketHandler.prototype.onEnd = function (data) {
        view.showWin(data.winners);
        view.displayPlayers(data.entities);
        client.end();
    };
    SocketHandler.prototype.onChat = function (data) {
        console.log(data);
        view.addChat(data);
    };
    SocketHandler.prototype.sendReady = function (ready) {
        this.socket.emit('ready', { session_id: this.session_id });
    };
    SocketHandler.prototype.sendJoin = function (data) {
        this.socket.emit('join', data);
    };
    SocketHandler.prototype.sendHost = function (data) {
        this.socket.emit('host', data);
    };
    SocketHandler.prototype.sendMap = function (board, custom, mapName) {
        this.socket.emit('map', { board: board, custom: !!custom, mapName: mapName, session_id: this.session_id });
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
    SocketHandler.prototype.sendOptions = function (options) {
        this.socket.emit('options', { session_id: this.session_id, options: options });
    };
    SocketHandler.prototype.close = function () {
        if (this.socket)
            this.socket.disconnect();
    };
    SocketHandler.prototype.sendKick = function (id) {
        view.loading(true);
        this.socket.emit('kick', { session_id: this.session_id, id: id });
    };
    SocketHandler.prototype.sendPassword = function (value) {
        view.loading(true);
        this.socket.emit('password', { session_id: this.session_id, password: value });
    };
    SocketHandler.prototype.sendChat = function (text) {
        this.socket.emit('chat', { session_id: this.session_id, text: text });
    };
    SocketHandler.prototype.disconnect = function () {
        this.socket.disconnect();
    };
    return SocketHandler;
}());
window.onload = init;
function init() {
    socketListener = new SocketHandler();
    client = new Client();
    Util.setFormData(Cookies.get("username"), Cookies.get("multiplayer"), Cookies.get("lobby"), Cookies.get("password"));
    view = new View(null, "assets/block.png", "assets/background.png", "assets/player_blue.png", "assets/player_green.png", "assets/player_red.png", "assets/player_yellow.png", "assets/player_purple.png", "assets/player_cyan.png", "assets/player_orange.png", "assets/player_pink.png", "assets/player_darkblue.png", "assets/player_darkgreen.png", "assets/player_darkred.png", "assets/player_darkyellow.png", "assets/player_darkpurple.png", "assets/player_darkcyan.png", "assets/player_darkorange.png", "assets/player_darkpink.png", "assets/board_background.png", "assets/stop.png");
    view.loading(true);
    selectMaps();
    var elm = document.getElementById("bots");
    if (elm)
        elm.checked = false;
    initChat();
}
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
window.onkeypress = function (e) {
    move(e.key);
};
function move(key) {
    if (!client || !client.getGame() || !socketListener)
        return;
    key = key.toLowerCase();
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
    var id = client.getId(key);
    if (id === null || !dirMap[key])
        return;
    socketListener.sendMove(id, dirMap[key]);
}
;
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
function setCookies() {
    var data = Util.getFormData();
    Cookies.set("username", data.username, { expires: Number.MAX_VALUE });
    Cookies.set("multiplayer", data.multiplayer ? "true" : "false", { expires: Number.MAX_VALUE });
    Cookies.set("lobby", data.lobby, { expires: Number.MAX_VALUE });
    Cookies.set("password", data.password, { expires: Number.MAX_VALUE });
}
function _join() {
    setCookies();
    socketListener.sendJoin(Util.getFormData());
    view.loading(true);
}
function _host() {
    setCookies();
    socketListener.sendHost(Util.getFormData());
    view.loading(true);
}
function _ready() {
    socketListener.sendReady(client.toggleReady());
    view.loading(true);
}
function _setTeam(elm, i) {
    socketListener.sendTeam(elm.value, i);
    view.loading(true);
}
function _start() {
    socketListener.sendStart();
    view.loading(true);
}
function _resize() {
    if (!view)
        return;
    view.resize();
}
function _cMap() {
    var elm = document.getElementById("custommap");
    var elmmap = document.getElementById("mapselect");
    if (atob(elm.value).length < 16) {
        return;
    }
    socketListener.sendMap(elm.value, true, elmmap.value);
    view.loading(true);
}
function _load(save) {
    var maps = Cookies.getJSON("maps");
    console.log(maps);
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
function _options() {
    socketListener.sendOptions(Util.getOptions());
}
function _sync() {
    selectMaps();
}
function _kick(id) {
    if (id !== null) {
        socketListener.sendKick(id);
    }
}
function _password() {
    var elm = document.getElementById("newPassword");
    socketListener.sendPassword(elm.value);
}
function _loadBase64() {
    var value = prompt("Give the encoded string to parse");
    socketListener.sendMap(value, true, "(Custom)");
}
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
window.onclick = function (ev) {
    console.log("x:" + ev.clientX + " y:" + ev.clientY);
};
//# sourceMappingURL=_client.js.map