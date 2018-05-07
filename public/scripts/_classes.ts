/*
 * Welcome in this clusterfuck of code!
 * Feel free to edit this code if you can figure out what it does.
 * The link to the (small) documentation can be found in the variable 'api'
 * Suggestions: <TODO> add place where people can post suggestions. (git?)
 */

import Application = PIXI.Application;
import Sprite = PIXI.Sprite;

let view: View;
let client: ClientInterface;
let enableNames = true;

/**
 * Utility classes for loading stuff.
 */
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
        let resource = PIXI.loader.resources["assets/" + image];
        if (!resource) return null;
        return new PIXI.Sprite(resource.texture);
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
     * Updates the login form data.
     * @param username
     * @param multiplayer
     * @param lobby
     * @param password
     */
    static setFormData(username, multiplayer, lobby, password): void {
        const usernameElm = (document.getElementById("username") as HTMLInputElement);
        const multiplayerElm = (document.getElementById("multiplayer") as HTMLInputElement);
        const lobbyElm = (document.getElementById("lobby") as HTMLInputElement);
        const passwordElm = (document.getElementById("password") as HTMLInputElement);
        if (username) usernameElm.value = username;
        if (multiplayer === "true") multiplayerElm.checked = true;
        if (lobby) lobbyElm.value = lobby;
        if (password) passwordElm.value = password;
    }

    /**
     * Gets the lobby options.
     * @return {{bots: boolean}}
     */
    static getOptions() {
        const bots = (document.getElementById("bots") as HTMLInputElement).checked;
        return {bots: bots};
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

/**
 * The interface for the clientside.
 */
interface ClientInterface {
    start(data: any): void;

    stop(entity: any): void;

    canMove(entity: any, speed: number): void;

    indexInBounds(x: number, y: number): boolean;

    setIds(data: any): void;

    isMulti(): boolean;

    end(): void;

    getGame(): any;

    toggleReady(): boolean;

    getId(key: string): number

    getDirection(key: string): string;

    setReady(data: any): void;

    reset(): void;

    isLocal(id: number): boolean

    move(id: number, direction: string): void;

    setKeys(p1: Keys, p2: Keys): void
}

class View {

    private screen_width: number;
    private screen_height: number;
    private size: number;
    private paddingX: number;
    private paddingY: number;
    private offsetX: number;
    private offsetY: number;
    private readonly canvas: Application;
    private board: any;
    private isHost: boolean;
    private loaded: boolean = false;

    constructor(onload: () => void, ...images: string[]) {
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
        PIXI.loader.add(images).load(() => {
                let loginDiv = document.getElementById("login");
                if (loginDiv) loginDiv.style.display = '';

                document.body.appendChild(this.canvas.view);
                this.load(onload);

                PIXI.loader.add("assets/background.png").load(() => {
                    let background = Util.loadImage("background.png");
                    if (background) {
                        background.width = this.screen_width;
                        background.height = this.screen_height;
                        this.canvas.stage.addChildAt(background, 0);
                    }
                    document.body.style.background = "";
                })
            }
        );
    }

    load(onload?: () => void): void {
        let background = Util.loadImage("background.png");
        if (background) {
            background.width = this.screen_width;
            background.height = this.screen_height;
            this.canvas.stage.addChild(background);
        }

        let lobby = Util.getParameterByName("id", window.location.href);
        let lobbyDiv = (document.getElementById('lobby') as HTMLInputElement);
        if (lobbyDiv) lobbyDiv.value = lobby ? lobby : "";

        this.loaded = true;
        view.loading(false);

        if (onload) onload();
    }

    resize(board?: any) {
        this.screen_width = window.innerWidth;
        this.screen_height = window.innerHeight;
        this.canvas.renderer.resize(this.screen_width, this.screen_height);

        if (!this.loaded) return;
        if (!client.getGame() && !board && !this.board) {
            this.load();
            return;
        }
        if (!board && client.getGame()) board = client.getGame().board;
        else if (!board && this.board) board = this.board;
        this.board = board;

        let width = board.width;
        let height = board.height;
        //44 of 1080 pixel is width of border.
        this.paddingX = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.paddingY = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.size = Math.min(
            (this.screen_width - 2 * this.paddingX) / board.width,
            (this.screen_height - 2 * this.paddingY) / board.height
        );
        this.offsetX = ((this.screen_width - 2 * this.paddingX) - width * this.size) / 2 + this.paddingX;
        this.offsetY = ((this.screen_height - 2 * this.paddingY) - height * this.size) / 2 + this.paddingY;

        while (this.canvas.stage.children.length > 0) this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);

        this.load();
        this.displayGame(board);
        if (client.getGame()) {
            this.makeSprites();
            this.displayPlayers(client.getGame().entities)
        }
    }

    displayPlayers(entities: any) {
        for (let key in client.getGame().entities) {
            if (!client.getGame().entities.hasOwnProperty(key)) continue;

            let entity = client.getGame().entities[key];

            if (!entity.sprite || !entity.text) continue;
            if (entities[key]) {
                entity.pos = entities[key].pos;
                entity.direction = entities[key].direction;

                entity.sprite.visible = true;
                entity.text.visible = enableNames;

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

    displayGame(board?: any) {
        if (!board) board = client.getGame().board;

        let width = board.width;
        let height = board.height;
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
    }

    makeSprites() {
        let width = client.getGame().board.width;
        let height = client.getGame().board.height;

        for (let key in client.getGame().entities) {
            if (!client.getGame().entities.hasOwnProperty(key)) continue;

            let entity = client.getGame().entities[key];
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
    }

    updatePos() {
        if (!client || !client.getGame()) return;
        //TODO get speed from server.
        let speed = 30;

        let width = client.getGame().board.width;
        let height = client.getGame().board.height;

        for (let key in client.getGame().entities) {
            if (!client.getGame().entities.hasOwnProperty(key)) continue;
            let entity = client.getGame().entities[key];
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
        document.getElementById("chatWrapper").style.display = 'none';
        document.getElementById('wrapper').style.display = 'none';
        document.getElementById('winners').style.display = 'none';
    }

    showHost(multi: boolean) {
        this.hideAll();
        this.showLobby(multi);
        document.getElementById('maps').style.display = '';
        document.getElementById('botsBox').style.display = '';
        document.getElementById("changePassword").style.display = '';
        document.getElementById("startbtn").style.display = '';
        this.isHost = true;
    }

    showLogin() {
        this.hideAll();
        this.isHost = false;
        document.getElementById("login").style.display = '';
        document.getElementById('wrapper').style.display = '';
    }

    showLobby(multi: boolean) {
        this.hideAll();

        if (!this.isHost) document.getElementById("startbtn").style.display = 'none';
        document.getElementById("game-lobby").style.display = '';
        document.getElementById('wrapper').style.display = '';
        document.getElementById("chatWrapper").style.display = '';

        this.resize();
    }

    showWin(winners: any[]) {
        this.hideAll();
        document.getElementById('winners').style.display = '';
        document.getElementById('wrapper').style.display = '';
        if (winners[0]) {
            document.getElementById('winners').innerHTML = `Team <span class="${winners[0].team}">${winners[0].team}</span> has won!<br> Winners:<br>`;
            for (let winner of winners) {
                document.getElementById('winners').innerHTML += winner.name + "\n";
            }
        } else {
            document.getElementById('winners').innerHTML = "Draw";
        }
    }

    private getOption(team: string, actualteam: string) {
        return `<option value=${team} class=${team} ${(actualteam === team ? "selected" : "")}>${team}</option>`;
    }

    private getSelect(team: string, player: number): string {
        return ` <select class="select-style" id="teamselect" onchange="_setTeam(this,${player})">` +
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
            `</select>`
    }

    private playerEntry(name: string, team: string, ready: boolean, player: number, id: number): string {
        const isready = "<i class=\"fas fa-check-square\"></i>";
        const notready = "<i class=\"fas fa-times-circle\"></i>";

        let string = "<li class='playerItem'>";
        if (player !== null) string += `<div class="listName" style="text-decoration: underline"><b>${name}</b></div>`;
        else string += `<div class="listName">${name}</div>`;

        if (player !== null) string += `<div class="listTeam ${team}bg">${this.getSelect(team, player)}</div>`;
        else string += `<div class="listTeam ${team}bg">${team}</div>`;

        if (ready !== null) string += `<div class="listReady">${ready ? isready : notready}&nbsp;&nbsp;</div>`;
        else string += "<div class=\"listReady\">Ready</div>";

        if (this.isHost && id !== null) {
            string += `<div class="listKick clickable" onclick="_kick(${id})"><i class="fas fa-gavel"></i>&nbsp;</div>`;
        }
        else if (this.isHost) string += '<div class="listKick">&nbsp;</div>';

        string += "</li>";
        return string;
    }

    showPlayers(data: any) {
        let string = "<ol class='playerList'>";

        let isTrue = function (string) {
            return string === "true" || string === true
        };

        string += this.playerEntry("Player", "Team", null, null, null);

        client.setReady(data);
        for (let i = 0; i < data.length; i++) {
            let name = data[i].name;
            let team = data[i].team;
            let ready = data[i].ready;
            let id = data[i].id;
            let player = data[i].player;
            string += this.playerEntry(name, team, isTrue(ready), client.isLocal(id) ? player : null, id);
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
        document.getElementById("player-amount").innerHTML = data.length;

        this.resize(this.board);
    }

    clearCanvas() {
        while (this.canvas.stage.children.length > 0) this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);
        this.canvas.stage.addChild(Util.loadImage("background.png"));
    }

    getCanvas(): Application {
        return this.canvas;
    }

    getValues(): { offsetX: number, offsetY: number, size: number } {
        return {
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            size: this.size
        }
    }

    loading(load: boolean) {
        let elm = document.getElementById("loading") as HTMLDivElement;
        if (!elm) return;
        elm.style.display = load ? "" : "none";
    }

    boardData(data: any) {
        (document.getElementById('selected-map') as HTMLDivElement).innerHTML = 'Map: ' + data.boardName;
        (document.getElementById('player-total') as HTMLSpanElement).innerHTML = data.board.players;
    }

    showStarting(b: boolean) {
        let elm = document.getElementById('starting');
        if (!elm) return;
        if (b) elm.style.display = '';
        else elm.style.display = 'none';
    }

    addChat(data: any) {
        const chat = `<div class="comment"><div class="author"><i class="fas fa-comments"></i>&nbsp;${data.user}</div><div class="message">${data.text}</div></div>`
        let elm = document.getElementById("comment_box");
        if (!elm) return;
        elm.innerHTML += chat;
        elm.scrollTop = elm.scrollHeight;
    }

}

interface Keys {
    up: string,
    down: string,
    left: string,
    right: string
}

class Client implements ClientInterface {
    private game: any;
    private board: any;
    private id_p1: { id: number, ready: boolean };
    private id_p2: { id: number, ready: boolean };
    private timer: any;
    private readonly keys: Keys[];

    constructor() {
        this.id_p1 = {id: -1, ready: false};
        this.id_p2 = {id: -1, ready: false};
        let defaultKeys = [
            {up: "w", down: "s", left: "a", right: "d"},
            {up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright"}
        ];
        let keys = <Keys[]> Cookies.getJSON("keys");
        if (!keys) {
            Cookies.set("keys", defaultKeys);
        }
        this.keys = keys;
    }

    start(data: any) {
        this.game = data.game;
        view.displayGame();
        view.makeSprites();
        view.showStarting(true);

        let date = new Date().getTime() + 5000;
        let interval = setInterval(() => this.count(date), 10);

        setTimeout(() => {
            if (interval) clearInterval(interval);

            this.timer = setInterval(() => view.updatePos(), 15);
            view.showStarting(false);
        }, 5000);
    }

    count(start: number) {
        let elm = document.getElementById("count") as HTMLDivElement;
        if (!elm) return;
        let i = Math.floor((start - new Date().getTime()) / 1000);
        if (i !== 0) elm.innerHTML = i.toString();
        else elm.innerHTML = "GO!";
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

    canMove(entity: any, speed: number): boolean {
        const cellSize = 100;
        let dir = entity.direction;
        if (this.isStop(entity, speed)) return false;
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
        let dir = entity.direction;

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

    setIds(data: any): void {
        this.id_p1.id = data.ids[0].id;
        if (data.ids[1]) this.id_p2.id = data.ids[1].id;
    }

    isMulti(): boolean {
        return this.id_p2.id !== -1
    }

    end() {
        this.id_p1.ready = false;
        this.id_p2.ready = false;
        if (this.timer) clearInterval(this.timer);
    }

    getGame() {
        return this.game;
    }

    toggleReady() {
        this.id_p1.ready = this.id_p2.ready = !this.id_p1.ready;
        return this.id_p1.ready;
    }

    getId(key: string): number {
        let id1 = this.id_p1.id;
        let id2 = this.id_p2.id;
        if (id2 === -1) id2 = id1;
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
    }


    getDirection(key: string): string {
        switch (key) {
            case this.keys[0].up :
            case this.keys[1].up :
                return "NORTH";

            case this.keys[0].down :
            case this.keys[1].down :
                return "SOUTH";
            case this.keys[0].left :
            case this.keys[1].left :
                return "WEST";
            case this.keys[0].right :
            case this.keys[1].right :
                return "EAST";
            default:
                return null;
        }
    }

    setReady(data: any) {
        for (let i = 0; i < data.length; i++) {
            if (data[i].id === this.id_p1.id) this.id_p1.ready = this.id_p2.ready = data[i].ready;
        }
    }

    reset(): void {
        this.game = null;
    }

    isLocal(id: number): boolean {
        return id === this.id_p1.id || id === this.id_p2.id;
    }

    move(id: number, direction: string) {
        const directions = {
            NONE: {x: 0, y: 0},
            NORTH: {x: 0, y: -1},
            SOUTH: {x: 0, y: 1},
            WEST: {x: 1, y: 0},
            EAST: {x: -1, y: 0}
        };
        if (!this.game) return;
        for (let key in this.game.entities) {
            if (!this.game.entities.hasOwnProperty(key)) continue;
            if (this.game.entities[key].id === id) {
                this.game.entities[key].direction = {
                    string: direction,
                    x: directions[direction].x,
                    y: directions[direction].y
                }
            }
        }
    }

    setKeys(p1: Keys, p2: Keys): void {
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
    }
}