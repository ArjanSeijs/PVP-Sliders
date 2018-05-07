/*
 * Welcome in this clusterfuck of code!
 * Feel free to edit this code if you can figure out what it does.
 * The link to the (small) documentation can be found in the variable 'api'
 * Suggestions: https://github.com/SoapStuff/Sliding-Battles-Client/tree/master
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

/**
 * The view class that handles all view related things.
 */
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

    /**
     * Create a new view.
     * @param {() => void} onload, The function that is executed once all resources are loaded.
     * @param {string} images all the images to load.
     */
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

    /**
     * This method is called when all the resources are loaded.
     * @param {() => void} onload The function to execute.
     */
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

    /**
     * This resizes the width and height of the background/, and the cellsize of the board. to fit the screen
     * board : Board
     * @param board
     */
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

    /**
     * Display all the players
     * Map(Entity)
     * @param entities
     */
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

    /**
     * Displays the board.
     * board : Board
     * @param board
     */
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

    /**
     * Initializes the images and names for all the entities in client.getGame().entities
     * and adds it to the canvas
     */
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

    /**
     * Updates the view of all clients given by the position and current
     * movement direction.
     */
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

    /**
     * Hides all elements.
     */
    hideAll() {
        document.getElementById("login").style.display = 'none';
        document.getElementById("game-lobby").style.display = 'none';
        document.getElementById("chatWrapper").style.display = 'none';
        document.getElementById('wrapper').style.display = 'none';
        document.getElementById('winners').style.display = 'none';
    }

    /**
     * Show the lobby as host
     * @param {boolean} multi If local multiplayer
     */
    showHost(multi: boolean) {
        this.hideAll();
        this.showLobby(multi);
        document.getElementById('maps').style.display = '';
        document.getElementById('botsBox').style.display = '';
        document.getElementById("changePassword").style.display = '';
        document.getElementById("startbtn").style.display = '';
        this.isHost = true;
    }

    /**
     * Show the login screen.
     */
    showLogin() {
        this.hideAll();
        this.isHost = false;
        document.getElementById("login").style.display = '';
        document.getElementById('wrapper').style.display = '';
    }

    /**
     * Show the lobby screen
     * @param {boolean} multi If multiplayer
     */
    showLobby(multi: boolean) {
        this.hideAll();

        if (!this.isHost) document.getElementById("startbtn").style.display = 'none';
        document.getElementById("game-lobby").style.display = '';
        document.getElementById('wrapper').style.display = '';
        document.getElementById("chatWrapper").style.display = '';

        this.resize();
    }

    /**
     * Display all the winners.
     * winner : Map<Entity>
     * @param {any[]} winners
     */
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

    /**
     * Gets an option for the team-select box.
     * @param {string} team
     * @param {string} actualteam
     * @return {string}
     */
    private getOption(team: string, actualteam: string) {
        return `<option value=${team} class=${team} ${(actualteam === team ? "selected" : "")}>${team}</option>`;
    }

    /**
     * Gets the team-select box.
     * @param {string} team
     * @param {number} player
     * @return {string}
     */
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

    /**
     * Gets a row of the player list.
     * @param {string} name
     * @param {string} team
     * @param {boolean} ready
     * @param {number} player
     * @param {number} id
     * @return {string}
     */
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

    /**
     * Displays a table of all the players.
     * data : Array<Player>
     * @param data
     */
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

    /**
     * Clears the canvas and re-add the background
     */
    clearCanvas() {
        while (this.canvas.stage.children.length > 0) this.canvas.stage.removeChildAt(this.canvas.stage.children.length - 1);
        this.canvas.stage.addChild(Util.loadImage("background.png"));
    }

    /**
     * Getter for the PIXI canvas.
     * @return {PIXI.Application}
     */
    getCanvas(): Application {
        return this.canvas;
    }

    /**
     * Getter for the offset and the size.
     * @return {{offsetX: number, offsetY: number, size: number}}
     */
    getValues(): { offsetX: number, offsetY: number, size: number } {
        return {
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            size: this.size
        }
    }

    /**
     * Set the loading display.
     * @param {boolean} load
     */
    loading(load: boolean) {
        let elm = document.getElementById("loading") as HTMLDivElement;
        if (!elm) return;
        elm.style.display = load ? "" : "none";
    }

    /**
     * Sets the board data name and the amount of players.
     * data.boardName : string
     * data.board : Board
     * @param data
     */
    boardData(data: any) {
        (document.getElementById('selected-map') as HTMLDivElement).innerHTML = 'Map: ' + data.boardName;
        (document.getElementById('player-total') as HTMLSpanElement).innerHTML = data.board.players;
    }

    /**
     * Display the div that is used for the countdown.
     * @param {boolean} b
     */
    showStarting(b: boolean) {
        let elm = document.getElementById('starting');
        if (!elm) return;
        if (b) elm.style.display = '';
        else elm.style.display = 'none';
    }

    /**
     * Adds a chat message.
     * data.user : string - The user
     * data.text : string - The message
     * @param data
     */
    addChat(data: any) {
        const chat = `<div class="comment"><div class="author"><i class="fas fa-comments"></i>&nbsp;${data.user}</div><div class="message">${data.text}</div></div>`
        let elm = document.getElementById("comment_box");
        if (!elm) return;
        elm.innerHTML += chat;
        elm.scrollTop = elm.scrollHeight;
    }

}

/**
 * The interface for a key.
 */
interface Keys {
    up: string,
    down: string,
    left: string,
    right: string
}

/**
 * The client holds information on the current game & board and the id's of the player.
 */
class Client implements ClientInterface {
    private game: any;
    private board: any;
    private id_p1: { id: number, ready: boolean };
    private id_p2: { id: number, ready: boolean };
    private timer: any;
    private readonly keys: Keys[];

    /**
     * Constructs a new client.
     */
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
            keys = defaultKeys;
        }
        this.keys = keys;
    }

    /**
     * Starts the game, and shows the countdown.
     * data.game : Game
     * @param data
     */
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

    /**
     * Shows the amount of seconds until the 'end'
     * @param {number} end
     */
    count(end: number) {
        let elm = document.getElementById("count") as HTMLDivElement;
        if (!elm) return;
        let i = Math.floor((end - new Date().getTime()) / 1000);
        if (i !== 0) elm.innerHTML = i.toString();
        else elm.innerHTML = "GO!";
    }

    /**
     * Stops the entity, snaps the entity back to the grid.
     * entity: Entity
     * @param entity
     */
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

    /**
     * Checks if the entity can move at the given position.
     * entity : Entity
     * @param entity
     * @param {number} speed
     * @return {boolean}
     */
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

    /**
     * Checks if an entity collides with a stop cell.
     * entity : Entity
     * @param entity
     * @param {number} speed
     * @return {boolean}
     */
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

    /**
     * Checks if the coordinates are in bounds.
     * @param {number} newX
     * @param {number} newY
     * @param entity
     * @return {boolean}
     */
    private inBounds(newX: number, newY: number, entity: any) {
        //TODO config
        const cellSize = 100;
        return newX >= 0 && newY >= 0
            && newX + entity.size < this.game.board.width * cellSize
            && newY + entity.size < this.game.board.height * cellSize;
    }

    /**
     * Checks if the index of a tile is in bounds.
     * @param {number} x
     * @param {number} y
     * @return {boolean}
     */
    indexInBounds(x: number, y: number): boolean {
        return x >= 0 && y >= 0
            && x < this.game.board.width
            && y < this.game.board.height;
    }

    /**
     * Set the id's of the local players.
     * data.ids : Array<number>
     * @param data
     */
    setIds(data: any): void {
        this.id_p1.id = data.ids[0].id;
        if (data.ids[1]) this.id_p2.id = data.ids[1].id;
    }

    /**
     * Check if you currently are in a multiplayer game.
     * @return {boolean}
     */
    isMulti(): boolean {
        return this.id_p2.id !== -1
    }

    /**
     * Ends the game and stops the updates
     */
    end() {
        this.id_p1.ready = false;
        this.id_p2.ready = false;
        if (this.timer) clearInterval(this.timer);
    }

    /**
     * Getter for the game object
     * returns Game.
     * @return {any}
     */
    getGame() {
        return this.game;
    }

    /**
     * Toggles the ready status.
     * @deprecated
     * @return {boolean}
     */
    toggleReady() {
        this.id_p1.ready = this.id_p2.ready = !this.id_p1.ready;
        return this.id_p1.ready;
    }

    /**
     * Gets the player id from the given key.
     * @param {string} key
     * @return {number}
     */
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


    /**
     * Gets the direction from the given key.
     * @param {string} key
     * @return {string}
     */
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

    /**
     * From the data set the ready status of the client.
     * data : Array<{id:number}>
     * @param data
     */
    setReady(data: any) {
        for (let i = 0; i < data.length; i++) {
            if (data[i].id === this.id_p1.id) this.id_p1.ready = this.id_p2.ready = data[i].ready;
        }
    }

    /**
     * Reset the game.
     */
    reset(): void {
        this.game = null;
    }

    /**
     * Check if the id is the id of a local player.
     * @param {number} id
     * @return {boolean}
     */
    isLocal(id: number): boolean {
        return id === this.id_p1.id || id === this.id_p2.id;
    }

    /**
     * Move the entity in a given direction.
     * @param {number} id
     * @param {string} direction
     */
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

    /**
     * Change the key settings.
     * @param {Keys} p1
     * @param {Keys} p2
     */
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