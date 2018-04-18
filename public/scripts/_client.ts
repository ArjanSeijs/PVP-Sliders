import Sprite = PIXI.Sprite;

let socketListener: SocketHandler;
let view: View;
let client: Client;

class Util {
    /**
     * Gets the url with the path removed
     * @return {string}
     */
    static getUrl(): string {
        return window.location.host;
    }

    /**
     * Returns a sprite of the given image.
     * @param {string} image
     * @return {PIXI.Sprite}
     */
    static loadImage(image: string): Sprite {
        let texture = PIXI.loader.resources["assets/" + image].texture;
        return new PIXI.Sprite(texture);
    }

    /**
     * Gets the data of the user form.
     * @return {{username: string, multiplayer: boolean, lobby: string, password: string}}
     */
    static getFormData(): { username: string, multiplayer: boolean, lobby: string, password: string } {
        const username = (document.getElementById("username") as HTMLInputElement).value;
        const multiplayer = (document.getElementById("multiplayer") as HTMLInputElement).checked;
        const lobby = (document.getElementById("lobby") as HTMLInputElement).value;
        const password = (document.getElementById("password") as HTMLInputElement).value;
        return {username: username, multiplayer: multiplayer, lobby: lobby, password: password};
    }

    /**
     * Parses a paramater from the query string.
     * @param {string} name The parameter name.
     * @param {string} [url] The url.
     * @return {string}
     */
    static getParameterByName(name, url): string {
        if (!url) url = window.location.href;
        return new URL(url).searchParams.get(name);
    }
}

class SocketHandler {

    socket: SocketIOClient.Socket;
    session_id: string;

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
        client.id_p1.id = data.ids[0].id;
        if (data.ids[1]) client.id_p2.id = data.ids[1].id;
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
        view.showLobby(client.id_p2.id !== -1);
        while (view.canvas.stage.children.length > 0) view.canvas.stage.removeChildAt(view.canvas.stage.children.length - 1);
        view.canvas.stage.addChild(Util.loadImage("background.png"));
        client.id_p1.ready = false;
        client.id_p2.ready = false;
        console.log('restart!');
    }

    onPlayers(data: any): void {
        // console.log(JSON.stringify(data));
        view.showPlayers(data);
    }

    onEnd(data: any): void {
        view.showWin();
        document.getElementById('team').innerHTML = data.winners;
        view.displayPlayers(data.entities);
        if (client.timer) clearInterval(client.timer);
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

    close() {
        if (this.socket) this.socket.disconnect();
    }
}

class View {

    screen_width: number;
    screen_height: number;
    size: number;
    paddingX: number;
    paddingY: number;
    offsetX: number;
    offsetY: number;
    canvas: any;
    images: string[];

    constructor(...images: string[]) {
        this.screen_width = window.innerWidth;
        this.screen_height = window.innerHeight;

        let type = "WebGL";
        if (!PIXI.utils.isWebGLSupported()) {
            type = "canvas"
        }
        PIXI.utils.sayHello(type);

        //Setup app
        this.canvas = new PIXI.Application({width: 1024, height: 512});
        this.canvas.renderer.backgroundColor = 0x061639;
        this.canvas.renderer.view.style.position = "absolute";
        this.canvas.renderer.view.style.display = "block";
        this.canvas.renderer.autoResize = true;
        this.canvas.renderer.resize(this.screen_width, this.screen_height);
        PIXI.loader.add(images).load(() => this.load());
        document.body.appendChild(this.canvas.view);
    }

    load(): void {
        let background = Util.loadImage("background.png");
        background.width = this.screen_width;
        background.height = this.screen_height;
        this.canvas.stage.addChild(background);
        let lobby = Util.getParameterByName("id", window.location.href);
        (document.getElementById('lobby') as HTMLInputElement).value = lobby ? lobby : "";
    }

    resize() {
        if (!client.game) return;

        let width = client.game.board.width;
        let height = client.game.board.height;

        this.screen_width = window.innerWidth;
        this.screen_height = window.innerHeight;
        //44 of 1080 pixel is width of border.
        this.paddingX = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.paddingY = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.size = Math.min(
            (this.screen_width - 2 * this.paddingX) / client.game.board.width,
            (this.screen_height - 2 * this.paddingY) / client.game.board.height
        );
        this.offsetX = ((this.screen_width - 2 * this.paddingX) - width * this.size) / 2 + this.paddingX;
        this.offsetY = ((this.screen_height - 2 * this.paddingY) - height * this.size) / 2 + this.paddingY;

        while (this.canvas.stage.children.length > 0) this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);

        this.canvas.renderer.resize(this.screen_width, this.screen_height);

        this.load();
        this.displayGame();
        this.makeSprites();
        this.displayPlayers(client.game.entities);
    }

    displayPlayers(entities: any) {
        for (let key in client.game.entities) {
            if (!client.game.entities.hasOwnProperty(key)) continue;
            let entity = client.game.entities[key];
            if (!entity.sprite || !entity.text) continue;
            if (entities[key]) {
                entity.pos = entities[key].pos;
                entity.direction = entities[key].direction;

                entity.sprite.visible = true;
                entity.text.visible = true;

                entity.sprite.x = this.offsetX + (entity.pos.x / 100) * this.size;
                entity.sprite.y = this.offsetY + (entity.pos.y / 100) * this.size;

                entity.text.x = this.offsetX + (entity.pos.x / 100) * this.size + (0.5 * this.size);
                entity.text.y = this.offsetY + (entity.pos.y / 100) * this.size;
            } else {
                entity.sprite.visible = false;
                entity.text.visible = false;
            }
        }
    }

    displayGame() {
        let width = client.game.board.width;
        let height = client.game.board.height;
        let image = Util.loadImage("board_background.png");

        image.x = this.offsetX - this.paddingX;
        image.y = this.offsetY - this.paddingY;
        image.width = this.size * width + 2 * this.paddingX;
        image.height = this.size * height + 2 * this.paddingY;
        this.canvas.stage.addChild(image);

        let graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0x8B4513);

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                graphics.drawRect(this.offsetX + x * this.size, this.offsetY + y * this.size, this.size, this.size);
                let block = null;
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
    }

    makeSprites() {
        let width = client.game.board.width;
        let height = client.game.board.height;

        for (let key in client.game.entities) {
            if (!client.game.entities.hasOwnProperty(key)) continue;

            let entity = client.game.entities[key];
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
    }

    updatePos() {
        let speed = 30;
        let width = client.game.board.width;
        let height = client.game.board.height;

        for (let key in client.game.entities) {
            if (!client.game.entities.hasOwnProperty(key)) continue;
            let entity = client.game.entities[key];
            if (!entity.sprite || !entity.text) continue;
            if (client.canMove(entity, speed)) {
                let dir = entity.direction;
                entity.pos.x += dir.x * speed;
                entity.pos.y += dir.y * speed;

                entity.sprite.width = entity.sprite.height = this.size;
                entity.sprite.x = this.offsetX + (entity.pos.x / 100) * this.size;
                entity.sprite.y = this.offsetY + (entity.pos.y / 100) * this.size;

                entity.text.x = this.offsetX + (entity.pos.x / 100) * this.size + (0.5 * this.size);
                entity.text.y = this.offsetY + (entity.pos.y / 100) * this.size;
            } else {
                client.stop(entity);
            }
        }
    }

    hideAll() {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'none';
        document.getElementById('wrapper').style.display = 'none';
        document.getElementById('winners').style.display = 'none';
    }

    showHost(multi: boolean) {
        this.hideAll();
        this.showLobby(multi);
        document.getElementById('maps').style.display = '';
    }

    showLobby(multi: boolean) {
        this.hideAll();
        if (multi) document.getElementById("team2").style.display = '';
        else document.getElementById("team2").style.display = 'none';

        document.getElementById("game-lobby").style.display = '';
        document.getElementById('wrapper').style.display = '';
    }

    showWin() {
        this.hideAll();
        document.getElementById('winners').style.display = '';
        document.getElementById('wrapper').style.display = '';
    }

    showPlayers(data: any) {
        let string = "<ol>";
        for (let i = 0; i < data.length; i++) {
            if (data[i].id === client.id_p1.id) client.id_p1.ready = client.id_p2.ready = data[i].ready;
            string += "<li>" + data[i].name + ":" + data[i].ready + ":" + data[i].team + "</li>";
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
    }
}

class Client {
    game: any;
    id_p1: { id: number, ready: boolean };
    id_p2: { id: number, ready: boolean };
    timer: any;

    constructor() {
        this.id_p1 = {id: -1, ready: false};
        this.id_p2 = {id: -1, ready: false};
    }

    start(data: any) {
        client.game = data.game;
        view.displayGame();
        view.makeSprites();
        this.timer = setInterval(() => view.updatePos(), 15);
    }

    stop(entity: any) {
        entity.direction = {x: 0, y: 0, string: "NONE"};
        let cellSize = 100; //TODO config.
        let x = Math.round(entity.pos.x / cellSize) * cellSize;
        let y = Math.round(entity.y / cellSize) * cellSize;
        entity.pos = {
            x: x,
            y: y
        }
    }

    canMove(entity: any, speed: number) {
        const cellSize = 100;
        let dir = entity.direction;

        //TODO Depends ons TPS
        let newX = entity.pos.x + dir.x * speed;
        let newY = entity.pos.y + dir.y * speed;

        let tiles = this.game.board ? this.game.board.tiles : null;
        if (!tiles) {
            console.log("Board or tiles undefined");
            return false;
        }
        if (!this.inBounds(newX, newY, entity)) return false;
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
        } catch (error) {
            console.warn(error);
        }
    }


    private isStop(entity: any, speed: number): boolean {
        const cellSize = 100;
        let dir = entity.direction.curr;

        //TODO Depends ons TPS
        let newX = entity.pos.x + dir.x * speed;
        let newY = entity.pos.y + dir.y * speed;

        if (!this.inBounds(newX, newY, entity)) return false;
        let tile = null;
        switch (entity.direction) {
            case "NORTH": {
                let x = Math.floor(newX / cellSize);
                let y = Math.floor(newY / cellSize) + 1;
                if (!this.indexInBounds(x, y)) return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === "stop" && tile.pos.y <= entity.pos.y;
            }
            case "WEST": {
                let x = Math.floor(newX / cellSize) + 1;
                let y = Math.floor(newY / cellSize);
                if (!this.indexInBounds(x, y)) return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === "stop" && tile.pos.x <= entity.pos.x;
            }
            case "EAST": {
                let x = Math.floor((newX + entity.size) / cellSize) - 1;
                let y = Math.floor(newY / cellSize);
                if (!this.indexInBounds(x, y)) return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === "stop" && tile.pos.x >= entity.pos.x;
            }
            case "SOUTH": {
                let x = Math.floor(newX / cellSize);
                let y = Math.floor((newY + entity.size) / cellSize) - 1;
                if (!this.indexInBounds(x, y)) return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === "stop" && tile.pos.y >= entity.pos.y;
            }
        }
        return false;
    }

    private inBounds(newX: number, newY: number, entity: any) {
        //TODO config
        const cellSize = 100;
        return newX >= 0 && newY >= 0
            && newX + entity.size < this.game.board.width * cellSize
            && newY + entity.size < this.game.board.height * cellSize;
    }

    indexInBounds(x: number, y: number): boolean {
        return x >= 0 && y >= 0
            && x < this.game.board.width
            && y < this.game.board.height;
    }
}

window.onload = function () {
    socketListener = new SocketHandler();
    client = new Client();
    view = new View("assets/block.png",
        "assets/background.png",
        "assets/player_blue.png",
        "assets/player_green.png",
        "assets/player_red.png",
        "assets/player_yellow.png",
        "assets/board_background.png",
        "assets/stop.png");
};

window.onkeypress = function (e) {
    if (!client || !client.game || !socketListener || !socketListener.socket) return;
    const idMap = {
        "w": client.id_p1.id,
        "a": client.id_p1.id,
        "s": client.id_p1.id,
        "d": client.id_p1.id,
        "arrowleft": client.id_p2.id,
        "arrowright": client.id_p2.id,
        "arrowup": client.id_p2.id,
        "arrowdown": client.id_p2.id,
    };
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
    if (idMap[key] === null || idMap[key] === undefined) return;
    socketListener.sendMove(idMap[key], dirMap[key]);
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
    client.id_p1.ready = client.id_p2.ready = !client.id_p1.ready;
    socketListener.sendReady(client.id_p1.ready);
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


