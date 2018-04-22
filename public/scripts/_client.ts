let socketListener: SocketHandler;

class SocketHandler {

    private socket: SocketIOClient.Socket;
    private session_id: string;

    constructor() {
        this.socket = io(Util.getUrl());
        this.socket.on('start', (data) => this.onStart(data));
        this.socket.on('update', (data) => this.onUpdate(data));
        this.socket.on('failed', (data, refresh) => this.onFailed(data, refresh));
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
    }

    onUpdate(entities: any): void {
        view.displayPlayers(entities);
    }

    onFailed(data: any, refresh: boolean): void {
        alert(data);
        if (refresh) location.reload();
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
    }

    onMapChange(data: any): void {
        (document.getElementById('selected-map') as HTMLDivElement).innerHTML = 'Map: ' + data;
    }

    onRestart(data: any): void {
        view.showLobby(client.isMulti());
        client.reset();
        view.clearCanvas();
        client.end();
        console.log('restart!');
    }

    onPlayers(data: any): void {
        view.showPlayers(data);
    }

    onEnd(data: any): void {
        view.showWin();
        document.getElementById('team').innerHTML = data.winners;
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

    sendMap(board: string | string[], custom?: boolean): void {
        this.socket.emit('map', {board: board, custom: !!custom, session_id: this.session_id});
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
}

window.onload = function () {
    socketListener = new SocketHandler();
    client = new Client();
    view = new View(null, "assets/block.png",
        "assets/background.png",
        "assets/player_blue.png",
        "assets/player_green.png",
        "assets/player_red.png",
        "assets/player_yellow.png",
        "assets/board_background.png",
        "assets/stop.png");
};

window.onkeypress = function (e) {
    if (!client || !client.getGame() || !socketListener) return;
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
    let key = e.key.toLowerCase();
    let id = client.getId(key);
    if (id === null || !dirMap[key]) return;
    socketListener.sendMove(id, dirMap[key]);
};

function _map(elm: HTMLSelectElement) {
    socketListener.sendMap(elm.value);
}

function _join(): void {
    socketListener.sendJoin(Util.getFormData());
}

function _host(): void {
    socketListener.sendHost(Util.getFormData());
}

function _ready() {
    socketListener.sendReady(client.toggleReady());
}

function _setTeam(elm: HTMLSelectElement, i: number) {
    socketListener.sendTeam(elm.value, i)
}

function _start() {
    socketListener.sendStart();
}

function _resize() {
    if (!view) return;
    view.resize();
}

function _cMap() {
    let elm = document.getElementById("custommap") as HTMLInputElement;
    socketListener.sendMap(elm.value, true);
}

function _options() {
    socketListener.sendOptions(Util.getOptions());
}


