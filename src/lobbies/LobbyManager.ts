import * as io from "socket.io"
import {Server, Socket} from "socket.io"
import * as Logger from "simple-nodejs-logger";
import {isNullOrUndefined, isString} from "util";
import UUIDv4 = require("uuid/v4");

import Game = require("../classes/Game");
import GameParser = require("../parsers/GameParser");
import BoardParser = require("../parsers/BoardParser");
import Board = require("../classes/Board");
import Direction = require("../classes/Direction");
import Timer = NodeJS.Timer;

const UUID: () => string = UUIDv4;
const logger = Logger("LobbyManager");

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
            client.on('host', function (data) {
                LobbyManager.clientHost(client, data);
            })
        });
        BoardParser.init();

        LobbyManager.newLobby("lobby1");
        LobbyManager.getLobby("lobby1").setLevel("speedy.txt");
    }

    /**
     * Join a lobby.
     * @param {SocketIO.Socket} client The client
     * @param {*} data The data send on the socket.
     */
    static clientJoin(client: Socket, data: any) {
        if (!data || !LobbyManager.lobbies[data.lobby]) {
            client.emit('failed', 'lobby does not exist');
        } else {
            LobbyManager.lobbies[data.lobby].join(client, data);
        }
    }

    /**
     * Host a lobby.
     * @param {SocketIO.Socket} client
     * @param data
     */
    static clientHost(client: Socket, data: any) {
        if (!data || !data.username) {
            client.emit('failed', 'no username provided');
            return;
        }

        data.lobby = LobbyManager.newLobby();

        let lobby = LobbyManager.getLobby(data.lobby);
        if (data.password) lobby.setPassword(data.password);
        lobby.setLevel("Palooza.txt");
        lobby.join(client, data);

        let session_id = lobby.getSessionMap().getSession(client.id);
        lobby.setHost(session_id);
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

    static getLobby(uuid: string): Lobby {
        return this.lobbies[uuid];
    }
}

interface Sessions {
    [index: string]: { ids: { id: number, name: string, ready: boolean }[] }
}

class SessionMap {

    private lobby: Lobby;
    private sessions: Sessions = {};
    private clients: { [index: string]: { session: string, client: Socket } } = {};
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
        if (!data || !data.username) {
            client.emit('failed', 'no username');
            return;
        }
        let session_id = UUID();
        if (this.joined === 0) this.lobby.setHost(session_id);
        let ids = [{name: data.username, id: this.nextId++, ready: false}];
        this.joined++;

        if (data.multiplayer) {
            ids.push({name: data.username + "(2)", id: this.nextId++, ready: false});
            this.joined++;
        }

        this.sessions[session_id] = {ids: ids};
        this.clients[client.id] = {session: session_id, client: client};

        client.emit('joined', {
            ids: this.sessions[session_id].ids,
            session_id: session_id,
            lobby_id: this.lobby.getId()
        });
    }

    /**
     * On disconnect remove the client and the session.
     * @param {SocketIO.Socket} client
     */
    removeSession(client: Socket) {
        let session_id = this.clients[client.id].session;
        if (this.lobby.isHost(session_id)) this.lobby.close();
        delete this.clients[client.id];
        this.joined -= this.sessions[session_id].ids.length;
        delete this.sessions[session_id];
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
        if (!data || !data.session_id || isNullOrUndefined(data.id)) return false;
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

    getSession(id: string): string {
        return this.clients[id].session;
    }

    disconnect() {
        for (let key in this.clients) {
            if (!this.clients.hasOwnProperty(key)) continue;
            this.clients[key].client.disconnect();
        }
    }

    restart() {
        for (let key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key)) continue;
            for (let x of this.sessions[key].ids) {
                x.ready = false;
            }
        }
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

    private readonly _session_map: SessionMap;
    private state: State;
    private host: string = null;

    /**
     * @constructor
     * @param {string} id
     */
    constructor(id: string) {
        this.id = id;
        this._session_map = new SessionMap(this);
        this.state = State.Joining;
    }

    /**
     * Join a client
     * @param {SocketIO.Socket} client
     * @param data
     */
    join(client: Socket, data: any): void {
        if (!data) {
            client.emit('failed', "Don't you hate it when something is not defined?");
            return;
        }
        if (this.password && this.password !== data.password) {
            client.emit('failed', 'invalid password');
            return;
        }
        if (this._session_map.calcJoined() + (data.multiplayer ? 2 : 1) > this.board.metadata.playerAmount) {
            client.emit('failed', 'Lobby full');
            return;
        }


        this._session_map.newSession(client, data);

        this.eventListeners(client);

        logger.log(`Joined ${client.id}, ${this._session_map.calcJoined()}/${this.board ? this.board.metadata.playerAmount : 'NaN'}`);

        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
        this.checkReady();
    }

    eventListeners(client: Socket) {
        let that = this;
        client.on('disconnect', function () {
            that.disconnect(client);
        });
        client.on('move', function (data) {
            if (!data) return;
            that.move(client, data);
        });
        client.on('ready', function (data) {
            if (!data) return;
            that.readyToggle(client, data);
        });
        client.on('map', function (data) {
            if (!data) return;
            else that.changeMap(client, data);
        });

        client.join(this.id);
    }

    /**
     * On client disconnect.
     * @param {SocketIO.Socket} client
     */
    disconnect(client: Socket) {
        this._session_map.removeSession(client);
        logger.log(`Disconnected ${client.id}, ${this._session_map.calcJoined()}/${this.board ? this.board.metadata.playerAmount : 'NaN'}`);
    }

    /**
     * Move a player
     * @param {SocketIO.Socket} client
     * @param data
     */
    move(client: Socket, data: any) {
        if (!data || this.state !== State.InProgress) return;
        if (!this._session_map.verifyId(data)) {
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
        if (!data || !data.session_id && !this._session_map.getSessions()[session_id]) {
            client.emit('failed', 'invalid session_id');
            return;
        }

        this._session_map.toggleReady(data.session_id, data.ready === true);

        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());

        this.checkReady();
    }

    /**
     * Check if the server is full and all players are ready
     */
    checkReady(): void {
        if (this.board && this._session_map.calcJoined() == this.board.metadata.playerAmount && this._session_map.isReady()) {
            this.loadGame();
        }
    }

    /**
     * Stop the execution of the lobby.
     */
    stop(): void {
        let that = this;
        clearInterval(this.interval.tick);
        clearInterval(this.interval.update);
        this.state = State.Finished;
        LobbyManager.socket.in(this.id).emit('end', this.game.winners);
        setTimeout(function () {
            that.restart();
        }, 5000);
    }

    /**
     * Load and start the game.
     */
    loadGame(): void {
        let that = this;
        if (this._session_map.calcJoined() < 2 || isNullOrUndefined(this.board)) return;

        this.game = GameParser.create(this.board, this._session_map.calcJoined(), this._session_map.getSessions());

        //Game tick rate & update TODO config
        this.interval = {
            tick: setInterval(function () {
                try {
                    if (that.game.isFinished()) that.stop();
                    that.game.gameTick(-1);
                } catch (e) {
                    LobbyManager.socket.in(that.id).emit('failed', 'something went wrong');
                    that.stop();
                }
            }, 15),
            update: setInterval(function () {
                LobbyManager.socket.in(that.id).emit("update", that.game.entitiesJson());
            }, 15)
        };

        this.state = State.InProgress;
        LobbyManager.socket.in(this.id).emit('start', {game: this.game.toJson()});
    }

    restart() {
        this.state = State.Joining;
        // this.board = BoardParser.getBoard("Palooza.txt");
        this._session_map.restart();
        LobbyManager.socket.in(this.id).emit('restart');
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
        logger.log("Restart!");
    }

    changeMap(client: Socket, data: any) {
        if (isNullOrUndefined(data) || (!isString(data) && !data.board)) {
            client.emit('failed', 'no board defined');
            return;
        }
        let info = this.setLevel(isString(data) ? data + ".txt" : data.board, this._session_map.calcJoined());
        if (!info.success) {
            client.emit('failed', info.message)
        } else {
            LobbyManager.socket.in(this.id).emit('map', isString(data) ? data : data.board);
        }
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
        if (isNullOrUndefined(this.board)) {
            this.board = oldBoard;
            return {success: false, message: 'Board was undefined'};
        }
        if (!isNullOrUndefined(players) && this.board.metadata.playerAmount < players) {
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

    setHost(uuid: string): void {
        this.host = uuid;
    }

    isHost(uuid: string): boolean {
        return this.host === uuid;
    }

    close() {
        if (this.state !== State.Joining) return;
        LobbyManager.socket.in(this.id).emit('failed', 'Host disconnected');
        this._session_map.disconnect();
        delete LobbyManager.socket.nsps[this.id];
        delete LobbyManager.lobbies[this.id];
    }

    getSessionMap(): SessionMap {
        return this._session_map;
    }

    getId(): string {
        return this.id
    }
}

export = LobbyManager;