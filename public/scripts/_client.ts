let socketListener: SocketHandler;

class SocketHandler {

    private readonly socket: SocketIOClient.Socket;
    private session_id: string;

    constructor() {
        this.socket = io(Util.getUrl());
        this.socket.on('start', (data) => this.onStart(data));
        this.socket.on('update', (data) => this.onUpdate(data));
        this.socket.on('failed', (data, refresh) => this.onFailed(data, refresh));
        this.socket.on('info',(data) => this.onInfo(data));
        this.socket.on('joined', (data) => this.onJoined(data));
        this.socket.on('restart', (data) => this.onRestart(data));
        this.socket.on('players', (data) => this.onPlayers(data));
        this.socket.on('map', (data) => this.onMapChange(data));
        this.socket.on('end', (data) => this.onEnd(data));
    }

    onStart(data: any): void {
        view.hideAll();
        client.start(data);
        view.resize();
        view.loading(false);
    }

    onUpdate(entities: any): void {
        view.displayPlayers(entities);
    }

    onFailed(data: any, refresh: boolean): void {
        alert(data);
        if (refresh) location.reload();
        view.loading(false);
    }

    onInfo(data: any): void {
        alert(data);
        view.loading(false);
    }

    onJoined(data: any): void {
        client.setIds(data);
        this.session_id = data.session_id;


        let link = "/?id=" + encodeURIComponent(data.lobby_id);
        document.getElementById("lobby-id").innerHTML = "Join: <a target='_blank' href='" + link + "'>" + data.lobby_id + "</a>";
        if (data.isHost) {
            view.showHost(data.ids.length > 1);
        } else {
            view.showLobby(data.ids.length > 1);
        }
        view.loading(false);
        view.boardData(data);
        view.resize(data.board);
    }

    onMapChange(data: any): void {
        console.log(data);
        view.boardData(data);
        view.loading(false);
        view.resize(data.board);
    }

    onRestart(data: any): void {
        view.showLobby(client.isMulti());
        client.reset();
        view.clearCanvas();
        client.end();
        view.resize();
    }

    onPlayers(data: any): void {
        view.showPlayers(data);
        view.loading(false);
    }

    onEnd(data: any): void {
        view.showWin(data.winners);
        view.displayPlayers(data.entities);
        client.end();
    }

    sendReady(ready: boolean): void {
        this.socket.emit('ready', {session_id: this.session_id, ready: ready});
    }

    sendJoin(data: {}): void {
        this.socket.emit('join', data);
    }

    sendHost(data: {}): void {
        this.socket.emit('host', data);
    }

    sendMap(board: string | string[], custom?: boolean, mapName?: string): void {
        this.socket.emit('map', {board: board, custom: !!custom, mapName: mapName, session_id: this.session_id});
    }

    sendStart(): void {
        this.socket.emit('start', {session_id: this.session_id});
    }

    sendTeam(team: string, player: number): void {
        this.socket.emit('team', {session_id: this.session_id, team: team, player: player});
    }

    sendMove(id: number, direction: string): void {
        this.socket.emit('move', {session_id: this.session_id, id: id, direction: direction})
    }

    sendOptions(options: { bots: boolean }) {
        this.socket.emit('options', {session_id: this.session_id, options: options});
    }

    close() {
        if (this.socket) this.socket.disconnect();
    }

    sendKick(id: any) {
        view.loading(true);
        this.socket.emit('kick', {session_id: this.session_id, id: id});
    }

    sendPassword(value: string) {
        view.loading(true);
        this.socket.emit('password', {session_id: this.session_id, password: value});
    }
}

window.onload = function () {
    socketListener = new SocketHandler();
    client = new Client();
    Util.setFormData(Cookies.get("username"), Cookies.get("multiplayer"), Cookies.get("lobby"), Cookies.get("password"));
    view = new View(null, "assets/block.png",
        "assets/background.png",
        "assets/player_blue.png",
        "assets/player_green.png",
        "assets/player_red.png",
        "assets/player_yellow.png",
        "assets/player_purple.png",
        "assets/player_cyan.png",
        "assets/player_orange.png",
        "assets/player_pink.png",
        "assets/player_darkblue.png",
        "assets/player_darkgreen.png",
        "assets/player_darkred.png",
        "assets/player_darkyellow.png",
        "assets/player_darkpurple.png",
        "assets/player_darkcyan.png",
        "assets/player_darkorange.png",
        "assets/player_darkpink.png",
        "assets/board_background.png",
        "assets/stop.png");
    view.loading(true);
    selectMaps();
};

function selectMaps() {
    let maps = Cookies.getJSON("maps");
    let select = document.getElementById("mapselect") as HTMLSelectElement;
    select.innerHTML =
        "<option value=\"horizontal\">Horizontal</option>\n" +
        "<option value=\"map1v1\">Map1v1</option>\n" +
        "<option value=\"maze\">Maze</option>\n" +
        "<option value=\"maze2\">Maze2</option>\n" +
        "<option value=\"Palooza\" selected=\"selected\">Palooza</option>\n" +
        "<option value=\"vertical\">Vertical</option>\n" +
        "<option value=\"DontStopMeNow\">Don't Stop Me Now</option>\n" +
        "<option value=\"IsThisRealLife\">Is this real life?</option>";
    if (!maps) return;
    Object.keys(maps).forEach(((map, index, array) => {
        select.innerHTML += '<option data-custom=true value="(Custom) ' + map + '">(Custom) ' + map + '</option>'
    }));
}

window.onkeypress = function (e) {
    move(e.key);
};

function move(key) {
    if (!client || !client.getGame() || !socketListener) return;
    key = key.toLowerCase();
    const dirMap = {
        "w": "NORTH",
        "a": "WEST",
        "s": "SOUTH",
        "d": "EAST",
        "arrowleft": "WEST",
        "arrowright": "EAST",
        "arrowup": "NORTH",
        "arrowdown": "SOUTH",
    };
    let id = client.getId(key);
    if (id === null || !dirMap[key]) return;
    socketListener.sendMove(id, dirMap[key]);
};

function _map(elm: HTMLSelectElement) {
    const substr = "(Custom) ";
    if (elm.value.length > substr.length && elm.value.substr(0, substr.length) === substr) {
        _load(elm.value.substr(substr.length));
    } else {
        socketListener.sendMap(elm.value);
    }
    view.loading(true);
}

function setCookies() {
    let data = Util.getFormData();
    Cookies.set("username", data.username, {expires: Number.MAX_VALUE});
    Cookies.set("multiplayer", data.multiplayer ? "true" : "false", {expires: Number.MAX_VALUE});
    Cookies.set("lobby", data.lobby, {expires: Number.MAX_VALUE});
    Cookies.set("password", data.password, {expires: Number.MAX_VALUE});
}

function _join(): void {
    setCookies();
    socketListener.sendJoin(Util.getFormData());
    view.loading(true);
}

function _host(): void {
    setCookies();
    socketListener.sendHost(Util.getFormData());
    view.loading(true);
}

function _ready() {
    socketListener.sendReady(client.toggleReady());
    view.loading(true);
}

function _setTeam(elm: HTMLSelectElement, i: number) {
    socketListener.sendTeam(elm.value, i)
    view.loading(true);
}

function _start() {
    socketListener.sendStart();
    view.loading(true);
}

function _resize() {
    if (!view) return;
    view.resize();
}

function _cMap() {
    let elm = document.getElementById("custommap") as HTMLInputElement;
    let elmmap = document.getElementById("mapselect") as HTMLSelectElement;
    if (atob(elm.value).length < 16) {
        return;
    }
    socketListener.sendMap(elm.value, true, elmmap.value);
    view.loading(true);
}

function _load(save: string) {
    let maps = Cookies.getJSON("maps");
    console.log(maps);
    if (!save) {
        let saved = Object.keys(maps).reduce((pv, cv, ci, arr) => pv + cv + ",", "Choose a map:\n");
        save = prompt(saved, "Save1");
    }
    let elm = document.getElementById("custommap") as HTMLInputElement;
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
    selectMaps()
}

function _kick(id) {
    if (id !== null) {
        socketListener.sendKick(id);
    }
}

function _password() {
    let elm = document.getElementById("newPassword") as HTMLInputElement;
    socketListener.sendPassword(elm.value);
}

function _loadBase64() {
    let value = prompt("Give the encoded string to parse");
    socketListener.sendMap(value,true,"(Custom)");
}

function _leave() {
    window.location.reload();
}


