import Application = PIXI.Application;
import Sprite = PIXI.Sprite;

let view: View;
let client: ClientInterface;

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

    setReady(data: any): void;

    reset(): void;

    isLocal(id: number): boolean
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
        PIXI.loader.add(images).load(() => this.load(onload));
        document.body.appendChild(this.canvas.view);
    }

    load(onload?: () => void): void {
        let background = Util.loadImage("background.png");
        background.width = this.screen_width;
        background.height = this.screen_height;
        this.canvas.stage.addChild(background);
        let lobby = Util.getParameterByName("id", window.location.href);
        let elm = (document.getElementById('lobby') as HTMLInputElement);
        if (elm) elm.value = lobby ? lobby : "";
        if (onload) onload();
    }

    resize() {
        if (!client.getGame()) {
            this.load();
            return;
        }

        let width = client.getGame().board.width;
        let height = client.getGame().board.height;

        this.screen_width = window.innerWidth;
        this.screen_height = window.innerHeight;
        //44 of 1080 pixel is width of border.
        this.paddingX = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.paddingY = 44 / 1080 * Math.min(this.screen_width, this.screen_height);
        this.size = Math.min(
            (this.screen_width - 2 * this.paddingX) / client.getGame().board.width,
            (this.screen_height - 2 * this.paddingY) / client.getGame().board.height
        );
        this.offsetX = ((this.screen_width - 2 * this.paddingX) - width * this.size) / 2 + this.paddingX;
        this.offsetY = ((this.screen_height - 2 * this.paddingY) - height * this.size) / 2 + this.paddingY;

        while (this.canvas.stage.children.length > 0) this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);

        this.canvas.renderer.resize(this.screen_width, this.screen_height);

        this.load();
        this.displayGame();
        this.makeSprites();
        this.displayPlayers(client.getGame().entities);
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
        let width = client.getGame().board.width;
        let height = client.getGame().board.height;
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
    }

    makeSprites() {
        let width = client.getGame().board.width;
        let height = client.getGame().board.height;

        for (let key in client.getGame().entities) {
            if (!client.getGame().entities.hasOwnProperty(key)) continue;

            let entity = client.getGame().entities[key];
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
        document.getElementById('wrapper').style.display = 'none';
        document.getElementById('winners').style.display = 'none';
    }

    showHost(multi: boolean) {
        this.hideAll();
        this.showLobby(multi);
        document.getElementById('maps').style.display = '';
        document.getElementById('botsBox').style.display = '';
    }

    showLobby(multi: boolean) {
        this.hideAll();

        document.getElementById("game-lobby").style.display = '';
        document.getElementById('wrapper').style.display = '';

        this.resize();
    }

    showWin() {
        this.hideAll();
        document.getElementById('winners').style.display = '';
        document.getElementById('wrapper').style.display = '';
    }

    private getSelect(team: string, player: number): string {
        return ` <select class="select-style" id="teamselect" onchange="_setTeam(this,${player})">` +
            `<option value="red" class="red" ${(team === "red" ? "selected" : "")}>red</option>` +
            `<option value="green" class="green" ${(team === "green" ? "selected" : "")}>green</option>` +
            `<option value="yellow" class="yellow" ${(team === "yellow" ? "selected" : "")}>yellow</option>` +
            `<option value="blue" class="blue" ${(team === "blue" ? "selected" : "")}>blue</option>` +
            `<option value="random" ${(team === "random" ? "selected" : "")}>random</option>` +
            `</select>`
    }

    private playerEntry(name: string, team: string, ready: boolean, player: number): string {
        const isready = "<i class=\"fas fa-check-square\"></i>";
        const notready = "<i class=\"fas fa-times-circle\"></i>";

        let string = "<li class='playerItem'>";
        string += `<div class="listName">${name}</div>`;

        if (player !== null) string += `<div class="listTeam ${team}bg">${this.getSelect(team, player)}</div>`;
        else string += `<div class="listTeam ${team}bg">${team}</div>`;

        if (ready !== null) string += `<div class="listReady">${ready ? isready : notready}&nbsp;&nbsp;</div>`;
        else string += "<div class=\"listReady\">Ready</div>";

        string += "</li>";
        return string;
    }

    showPlayers(data: any) {
        let string = "<ol class='playerList'>";

        let isTrue = function (string) {
            return string === "true" || string === true
        };

        string += this.playerEntry("Player", "Team", null, null);

        client.setReady(data);
        for (let i = 0; i < data.length; i++) {
            string += this.playerEntry(data[i].name, data[i].team, isTrue(data[i].ready), client.isLocal(data[i].id) ? data[i].player : null);
        }
        string += "</ol>";
        document.getElementById("players").innerHTML = string;
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
        elm.style.display = load ? "" : "none";
    }
}

class Client implements ClientInterface {
    private game: any;
    private id_p1: { id: number, ready: boolean };
    private id_p2: { id: number, ready: boolean };
    private timer: any;

    constructor() {
        this.id_p1 = {id: -1, ready: false};
        this.id_p2 = {id: -1, ready: false};
    }

    start(data: any) {
        this.game = data.game;
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
}