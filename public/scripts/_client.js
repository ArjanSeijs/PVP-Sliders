var socketListener;
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
    };
    SocketHandler.prototype.onMapChange = function (data) {
        document.getElementById('selected-map').innerHTML = 'Map: ' + data;
    };
    SocketHandler.prototype.onRestart = function (data) {
        view.showLobby(client.isMulti());
        view.clearCanvas();
        client.end();
        console.log('restart!');
    };
    SocketHandler.prototype.onPlayers = function (data) {
        view.showPlayers(data);
    };
    SocketHandler.prototype.onEnd = function (data) {
        view.showWin();
        document.getElementById('team').innerHTML = data.winners;
        view.displayPlayers(data.entities);
        client.end();
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
    SocketHandler.prototype.sendMap = function (board, custom) {
        this.socket.emit('map', { board: board, custom: !!custom, session_id: this.session_id });
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
    return SocketHandler;
}());
window.onload = function () {
    socketListener = new SocketHandler();
    client = new Client();
    view = new View(null, "assets/block.png", "assets/background.png", "assets/player_blue.png", "assets/player_green.png", "assets/player_red.png", "assets/player_yellow.png", "assets/board_background.png", "assets/stop.png");
};
window.onkeypress = function (e) {
    if (!client || !client.getGame() || !socketListener)
        return;
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
    var id = client.getId(key);
    if (id === null || !dirMap[key])
        return;
    socketListener.sendMove(id, dirMap[key]);
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
    socketListener.sendReady(client.toggleReady());
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
function _cMap() {
    var elm = document.getElementById("custommap");
    socketListener.sendMap(elm.value, true);
}
function _options() {
    socketListener.sendOptions(Util.getOptions());
}
//# sourceMappingURL=_client.js.map