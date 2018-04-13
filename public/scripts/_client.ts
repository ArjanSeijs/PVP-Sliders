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
        let index = window.location.href.indexOf('/', 'http://'.length);
        return window.location.href.substr(0, index > -1 ? index : window.location.href.length);
    }

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
        name = name.replace(/[\[\]]/g, "\\$&");
        const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
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
        this.socket.on('end', (data) => this.onEnd(data));
    }

    onStart(data: any): void {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'none';
        document.getElementById('wrapper').style.display = 'none';
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
        client.id_p2.id = data.ids[1].id;
        this.session_id = data.session_id;

        if (data.ids.length === 1) document.getElementById("team2").style.display = 'none';
        else document.getElementById("team2").style.display = 'inherit';

        let link = Util.getUrl() + "?id=" + data.lobby_id;
        document.getElementById("lobby-id").innerHTML = "Join: <a href='" + link + "'>" + data.lobby_id + "</a>";
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'inherit';
    }

    onMapChange(data: any): void {
        (document.getElementById('selected-map') as HTMLDivElement).innerHTML = 'Map: ' + data;
    }

    onRestart(data: any): void {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = '';
        document.getElementById('wrapper').style.display = '';
        document.getElementById('winners').style.display = 'none';
        while (view.canvas.stage.children.length > 0) view.canvas.stage.removeChildAt(view.canvas.stage.children.length - 1);
        view.canvas.stage.addChild(Util.loadImage("background.png"));
        client.id_p1.ready = false;
        client.id_p2.ready = false;
        console.log('restart!');
    }

    onPlayers(data: any): void {
        console.log(JSON.stringify(data));
        let string = "<ol>";
        for (let i = 0; i < data.length; i++) {
            if (data[i].id === client.id_p1.id) client.id_p1.ready = client.id_p2.ready = data[i].ready;
            string += "<li>" + data[i].name + ":" + data[i].ready + ":" + data[i].team + "</li>";
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
    }

    onEnd(data: any): void {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'none';
        document.getElementById('wrapper').style.display = '';
        document.getElementById('winners').style.display = '';
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

    sendMap(data: string | string[]): void {
        this.socket.emit('map', data);
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
        this.screen_width = window.innerWidth;
        this.screen_height = window.innerHeight;
        this.size = Math.min(Math.floor(this.screen_width / client.game.board.width), Math.floor(this.screen_height / client.game.board.height));

        while (this.canvas.stage.children.length > 0) this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);

        this.canvas.renderer.resize(this.screen_width, this.screen_height);

        this.load();
        if (!client.game) return;
        this.displayGame();
        this.makeSprites();
        this.displayPlayers(client.game.entities);
    }

    displayPlayers(entities: any) {
        let width = client.game.board.width;
        let height = client.game.board.height;

        let offsetX = (this.screen_width - width * this.size) / 2;
        let offsetY = (this.screen_height - height * this.size) / 2;
        for (let key in client.game.entities) {
            if (!client.game.entities.hasOwnProperty(key)) continue;
            let entity = client.game.entities[key];
            if (!entity.sprite || !entity.text) continue;
            if (entities[key]) {
                entity.pos = entities[key].pos;
                entity.direction = entities[key].direction;

                entity.sprite.visible = true;
                entity.text.visible = true;

                entity.sprite.x = offsetX + (entity.pos.x / 100) * this.size;
                entity.sprite.y = offsetY + (entity.pos.y / 100) * this.size;

                entity.text.x = offsetX + (entity.pos.x / 100) * this.size + (0.5 * this.size);
                entity.text.y = offsetY + (entity.pos.y / 100) * this.size;
            } else {
                entity.sprite.visible = false;
                entity.text.visible = false;
            }
        }
    }

    displayGame() {
        let width = client.game.board.width;
        let height = client.game.board.height;

        let offsetX = (this.screen_width - width * this.size) / 2;
        let offsetY = (this.screen_height - height * this.size) / 2;

        // let image = Util.loadImage("board_background.png");
        // image.x = offsetX;
        // image.y = offsetY;
        // image.width = this.size * width;
        // image.height = this.size * height;
        // this.canvas.stage.addChild(image);

        let graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0x8B4513);

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                graphics.drawRect(offsetX + x * this.size, offsetY + y * this.size, this.size, this.size);
                if (client.game.board.tiles[x][y].wall) {
                    let block = Util.loadImage("block.png");
                    block.x = offsetX + x * this.size;
                    block.y = offsetY + y * this.size;
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

        let offsetX = (this.screen_width - width * this.size) / 2;
        let offsetY = (this.screen_height - height * this.size) / 2;

        for (let key in client.game.entities) {
            if (!client.game.entities.hasOwnProperty(key)) continue;
            let entity = client.game.entities[key];
            if (!entity.sprite || !entity.text) continue;
            if (client.canMove(entity, speed)) {
                let dir = entity.direction;
                entity.pos.x += dir.x * speed;
                entity.pos.y += dir.y * speed;

                entity.sprite.width = entity.sprite.height = this.size;
                entity.sprite.x = offsetX + (entity.pos.x / 100) * this.size;
                entity.sprite.y = offsetY + (entity.pos.y / 100) * this.size;

                entity.text.x = offsetX + (entity.pos.x / 100) * this.size + (0.5 * this.size);
                entity.text.y = offsetY + (entity.pos.y / 100) * this.size;
            } else {
                client.stop(entity);
            }
        }
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

    private inBounds(newX: number, newY: number, entity: any) {
        //TODO config
        const cellSize = 100;
        return newX >= 0 && newY >= 0
            && newX + entity.size < this.game.board.width * cellSize
            && newY + entity.size < this.game.board.height * cellSize;
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
        "assets/board_background.png");
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


