import * as io from "socket.io"
import {Server, Socket} from "socket.io"
import * as Logger from "simple-nodejs-logger";
import * as crypto from "crypto"
import {isNullOrUndefined, isString} from "util";
import UUIDv4 = require("uuid/v4");


import Game = require("../classes/Game");
import GameParser = require("../parsers/GameParser");
import BoardParser = require("../parsers/BoardParser");
import Board = require("../classes/Board");
import Direction = require("../classes/Direction");
import config = require("../lib/config");

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

    static newId(): string {
        let id;
        do {
            id = new Buffer(crypto.randomBytes(6)).toString("base64");
        } while (this.lobbies[id]);
        return id;
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
        if (!uuid) uuid = this.newId();
        LobbyManager.lobbies[uuid] = new Lobby(uuid);
        return uuid;
    }

    static getLobby(uuid: string): Lobby {
        return this.lobbies[uuid];
    }
}

interface Sessions {
    [index: string]: { ids: { id: number, name: string, ready: boolean, team: string }[] }
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
        let ids = [{name: data.username, id: this.nextId++, ready: false, team: null}];
        this.joined++;

        if (data.multiplayer) {
            ids.push({name: data.username + "(2)", id: this.nextId++, ready: false, team: null});
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
    getJoined(): { id: number, name: string, ready: boolean, team: string }[] {
        let joined: { id: number, name: string, ready: boolean, team: string } [];
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
     * Sets the team of a player.
     * @param {string} session_id
     * @param {string} team
     * @param {number} player
     */
    setTeam(session_id: string, team: string, player: number): void {
        if (!this.sessions[session_id]) return;
        if (!this.sessions[session_id].ids[player]) player = 0;
        //TODO check valid team.
        this.sessions[session_id].ids[player].team = team;
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
    Starting, Joining, InProgress, Finished
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
        client.on('team', function (data) {
            if (!data) return;
            that.teamChange(client, data);
        });
        client.on('map', function (data) {
            if (!data) return;
            else that.changeMap(client, data);
        });
        client.on('start', function (data) {
            if (!data || that.state === State.InProgress || that.state === State.Starting) {
                client.emit('failed', 'game already started');
                return;
            }
            else that.start(client, data);
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
        if (!data || !data.session_id || !this._session_map.getSessions()[data.session_id]) {
            client.emit('failed', 'invalid session_id');
            return;
        }

        this._session_map.toggleReady(data.session_id, data.ready === true);

        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());

        this.checkReady();
    }

    /**
     * On ready toggle.
     * @param {SocketIO.Socket} client
     * @param data
     */
    teamChange(client: Socket, data: any) {
        if (!data || !data.session_id || !this._session_map.getSessions()[data.session_id]) {
            client.emit('failed', 'invalid session_id');
            return;
        }
        // noinspection SuspiciousTypeOfGuard
        if (typeof(data.team) !== "string") {
            client.emit('failed', 'invalid team');
            return;
        }
        logger.log("Team changed!");
        this._session_map.setTeam(data.session_id, data.team, data.player === 0 ? 0 : 1);

        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
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
        if (this.state == State.Finished) return;
        let that = this;
        clearInterval(this.interval.tick);
        clearInterval(this.interval.update);
        this.state = State.Finished;
        LobbyManager.socket.in(this.id).emit('end', {entities: this.game.entitiesJson(), winners: this.game.winners});
        setTimeout(function () {
            that.restart();
        }, 5000);
    }

    /**
     * Force start the game
     * @param {Socket} client
     * @param data
     */
    start(client: Socket, data: any): void {
        logger.log("Force starting a game");
        if (!data || !data.session_id || !this.isHost(data.session_id)) {
            client.emit('failed', 'Only host can start');
            return;
        }
        if (!this.board) {
            client.emit('failed', 'Failed with starting: Board is not defined');
            return;
        }
        if (!this.loadGame()) {
            client.emit('failed', 'Something went wrong with loading.')
        }

    }

    /**
     * Load and start the game.
     * @return {boolean}
     */
    loadGame(): boolean {
        let that = this;
        if (this._session_map.calcJoined() < 2 || isNullOrUndefined(this.board)) return false;

        this.game = GameParser.create(this.board, this._session_map.calcJoined(), this._session_map.getSessions());

        let tickRate: number = config.get("tickRate");
        let updateRate: number = config.get("updateRate");
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
            }, tickRate),
            update: setInterval(function () {
                LobbyManager.socket.in(that.id).emit("update", that.game.entitiesJson());
            }, updateRate)
        };

        this.state = State.InProgress;
        LobbyManager.socket.in(this.id).emit('start', {game: this.game.toJson()});
        return true;
    }

    restart() {
        if (this.state == State.Joining) return;
        this.state = State.Joining;
        // this.board = BoardParser.getBoard("Palooza.txt");
        this._session_map.restart();
        LobbyManager.socket.in(this.id).emit('restart');
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
        logger.log("Restart!");
    }

    changeMap(client: Socket, data: any) {
        //TODO verify session.....
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
        LobbyManager.socket.in(this.id).emit('failed', 'Host disconnected', true);
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