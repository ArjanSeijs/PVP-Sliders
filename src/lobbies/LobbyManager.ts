import * as io from "socket.io"
import {Server, Socket} from "socket.io"
import {isNullOrUndefined} from "util";
import UUID = require("uuid/v4");
import Game = require("../classes/Game");
import GameParser = require("../parsers/GameParser");
import BoardParser = require("../parsers/BoardParser");
import Board = require("../classes/Board");
import Direction = require("../classes/Direction");
import Timer = NodeJS.Timer;

interface LobbyMap {
    [index: string]: Lobby;
}

class LobbyManager {

    static socket: Server;
    static game: Game;

    static lobbies: LobbyMap = {};

    /**
     * Initializes the lobbyManager
     * @param server The express server.
     */
    static init(server): void {
        LobbyManager.socket = io(server);
        LobbyManager.socket.on('connection', function (client: Socket) {
            client.on('join', function (data) {
                LobbyManager.clientJoin(client, data);
            });
        });
        BoardParser.init();

        LobbyManager.newLobby("lobby1");
        LobbyManager.lobbies["lobby1"].setLevel("speedy.txt");
    }

    /**
     * Join a lobby.
     * @param {SocketIO.Socket} client The client
     * @param {*} data The data send on the socket.
     */
    static clientJoin(client: Socket, data: any) {
        if (!LobbyManager.lobbies[data.lobby]) {
            client.emit('failed', 'lobby does not exist');
        } else {
            LobbyManager.lobbies[data.lobby].join(client, data);
        }
    }

    /**
     * Creates a new lobby.
     * @param {string} [uuid] Optional id for the lobby.
     * @return {string} The id of the lobby.
     */
    static newLobby(uuid?: string): string {
        if (!uuid) uuid = UUID();
        LobbyManager.lobbies[uuid] = new Lobby(uuid);
        return uuid;
    }
}

interface Sessions {
    [index: string]: { ids: { id: number, name: string, ready: boolean }[] }
}

class SessionMap {

    private lobby: Lobby;
    private sessions: Sessions = {};
    private clients: { [index: number]: string } = {};
    private nextId: number;
    private joined: number;

    /**
     * @constructor
     * @param {Lobby} lobby
     */
    constructor(lobby: Lobby) {
        this.lobby = lobby;
        this.nextId = 0;
        this.joined = 0;
    }

    /**
     * Creates a new session.
     * @param {SocketIO.Socket} client
     * @param {*} data The data send over the session.
     */
    newSession(client: Socket, data: any) {
        if (!data.username) {
            client.emit('failed', 'no username');
            return;
        }
        let session_id = UUID();

        let ids = [{name: data.username, id: this.nextId++, ready: false}];
        this.joined++;

        if (data.multiplayer) {
            ids.push({name: data.username + "(2)", id: this.nextId++, ready: false});
            this.joined++;
        }

        this.sessions[session_id] = {ids: ids};
        this.clients[client.id] = session_id;

        client.emit('joined', {ids: this.sessions[session_id].ids, session_id: session_id});
    }

    /**
     * On disconnect remove the client and the session.
     * @param {SocketIO.Socket} client
     */
    removeSession(client: Socket) {
        let uuid = this.clients[client.id];
        delete this.clients[client.id];
        this.joined -= this.sessions[uuid].ids.length;
        delete this.sessions[uuid];
    }

    /**
     * On disconnect remove the client.
     * @param {SocketIO.Socket} client
     */
    removeClient(client: Socket): void {
        delete this.clients[client.id];
    }

    /**
     * TODO
     * @param {SocketIO.Socket} client
     * @param data
     */
    mapSession(client: Socket, data: any): void {
        //TODO
    }

    /**
     * How many players joined.
     * @return {number}
     */
    calcJoined(): number {
        return this.joined;
    }

    /**
     * Verify the session with the player-id;
     * @param {*} data The data from the client.
     * @return {boolean}
     */
    verifyId(data: any): boolean {
        if (!data.session_id && !data.id) return false;
        if (!this.sessions[data.session_id]) return false;
        return this.sessions[data.session_id].ids.filter(x => x.id === data.id).length !== 0;
    }

    /**
     * Maps the joined players to an array.
     * @return {{id: number, name: string, ready: boolean}[]}
     */
    getJoined(): { id: number, name: string, ready: boolean }[] {
        let joined: { id: number, name: string, ready: boolean } [];
        joined = [];
        for (let key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key)) continue;
            for (let i = 0; i < this.sessions[key].ids.length; i++) {
                joined.push(this.sessions[key].ids[i]);
            }
        }
        return joined;
    }

    /**
     * Toggles the ready status for the players at the session.
     * @param {string} session_id
     * @param {boolean} ready
     */
    toggleReady(session_id: string, ready: boolean): void {
        if (!this.sessions[session_id]) return;
        for (let x of this.sessions[session_id].ids) {
            x.ready = ready;
        }
    }

    /**
     * Checks if all players are ready.
     * @return {boolean}
     */
    isReady(): boolean {
        for (let key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key)) return;
            for (let i of this.sessions[key].ids) {
                if (!i.ready) return false;
            }
        }
        return true;
    }

    getSessions(): Sessions {
        return this.sessions;
    }
}

enum State {
    Joining, InProgress, Finished
}

class Lobby {
    private readonly id: string;
    private password: string = "";

    private game: Game;
    private board: Board;

    private interval: { update: Timer, tick: Timer };

    private session_map: SessionMap;
    private state: State;

    /**
     * @constructor
     * @param {string} id
     */
    constructor(id: string) {
        this.id = id;
        this.session_map = new SessionMap(this);
        this.state = State.Joining;
    }

    /**
     * Join a client
     * @param {SocketIO.Socket} client
     * @param data
     */
    join(client: Socket, data: any): void {
        let that = this;
        if (this.state === State.InProgress) {
            this.session_map.mapSession(client, data);
            return;
        } else {
            this.session_map.newSession(client, data);
        }

        client.on('disconnect', function () {
            that.disconnect(client);
        });
        client.on('move', function (data) {
            that.move(client, data);
        });
        client.on('ready', function (data) {
            that.readyToggle(client, data);
        });

        client.join(this.id);
        console.log(`Joined ${client.id}, ${this.session_map.calcJoined()}/${this.board.metadata.playerAmount}`);

        LobbyManager.socket.in(this.id).emit('players', this.session_map.getJoined());
        that.checkReady();
    }

    /**
     * On client disconnect.
     * @param {SocketIO.Socket} client
     */
    disconnect(client: Socket) {
        if (this.state !== State.Joining) {
            this.session_map.removeClient(client)
        } else {
            this.session_map.removeSession(client)
        }
        console.log(`Disconnected ${client.id}, ${this.session_map.calcJoined()}/${this.board.metadata.playerAmount}`);
    }

    /**
     * Move a player
     * @param {SocketIO.Socket} client
     * @param data
     */
    move(client: Socket, data: any) {
        if (this.state !== State.InProgress) return;
        if (!this.session_map.verifyId(data)) {
            client.emit('failed', "Incorrect session and id");
            return;
        }
        let id = data.id;
        let direction = Direction.from(data.direction);
        this.game.move(id, direction);
    }

    /**
     * On ready toggle.
     * @param {SocketIO.Socket} client
     * @param data
     */
    readyToggle(client: Socket, data: any) {
        if (!data.session_id && !this.session_map.getSessions()[session_id]) {
            client.emit('failed', 'invalid session_id');
            return;
        }

        this.session_map.toggleReady(data.session_id, data.ready === true);

        LobbyManager.socket.in(this.id).emit('players', this.session_map.getJoined());

        this.checkReady();
    }

    /**
     * Check if the server is full and all players are ready
     */
    checkReady(): void {
        if (this.session_map.calcJoined() == this.board.metadata.playerAmount && this.session_map.isReady()) {
            this.loadGame();
            console.log(JSON.stringify(this.session_map.getSessions()));
        }
    }

    /**
     * Stop the execution of the lobby.
     */
    stop(): void {
        clearInterval(this.interval.tick);
        clearInterval(this.interval.update);
        this.state = State.Finished;
    }

    /**
     * Load and start the game.
     */
    loadGame(): void {
        let that = this;
        if (this.session_map.calcJoined() < 2 || isNullOrUndefined(this.board)) return;

        this.game = GameParser.create(this.board, this.session_map.calcJoined(), this.session_map.getSessions());

        //Game tick rate & update TODO config
        this.interval = {
            tick: setInterval(function () {
                that.game.gameTick(-1);
            }, 15),
            update: setInterval(function () {
                LobbyManager.socket.in(that.id).emit("update", that.game.entitiesJson());
            }, 15)
        };

        this.state = State.InProgress;
        LobbyManager.socket.in(this.id).emit('start', {game: this.game.toJson()});
    }

    /**
     * @param {string | string[]} board
     * @param {number} players
     * @return {{success: boolean, message?: string}}
     */
    setLevel(board: string | string[], players?: number): { success: boolean, message?: string } {
        let oldBoard = this.board;
        if (typeof board === "string") {
            this.board = BoardParser.getBoard(board);
            if (this.board === null) {
                return {success: false, message: "Could not find file"};
            }
        } else {
            this.board = BoardParser.fromStrings(board);
            if (this.board === null) {
                return {success: false, message: "Something went wrong with parsing the file"};
            }
        }
        if (!isNullOrUndefined(players) && this.board.metadata.playerAmount < players) {
            this.board = oldBoard;
            return {success: false, message: "too many players in lobby for this level"}
        }
        return {success: true};
    }

    /**
     * Set a password.
     * @param {string} password
     */
    setPassword(password: string): void {
        this.password = password;
    }

}

export = LobbyManager;