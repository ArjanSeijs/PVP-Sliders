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
const EXTENSION = ".txt";

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
    }

    static newId(): string {
        return new Buffer(crypto.randomBytes(6)).toString("base64");
    }

    /**
     * Join a lobby.
     * @param {SocketIO.Socket} client The client
     * @param {*} data The data send on the socket.
     */
    static clientJoin(client: Socket, data: any) {
        if (!data || (typeof data.lobby !== "string") || (data.lobby !== "" && !LobbyManager.lobbies[data.lobby])) {
            client.emit('failed', 'lobby does not exist');
        } else {
            let lobbyId = data.lobby;
            if (lobbyId === "") lobbyId = LobbyManager.randomLobby(data);
            if (lobbyId === null) {
                LobbyManager.clientHost(client, data);
                return;
            }
            LobbyManager.lobbies[lobbyId].join(client, data);
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

        let lobby_id = LobbyManager.newLobby();
        if (!lobby_id) client.emit('failed', 'something went wrong with creating the lobby');

        let lobby = LobbyManager.getLobby(lobby_id);
        if (data.password) lobby.setPassword(data.password);
        // lobby.setLevel("Palooza" + EXTENSION);
        // lobby.join(client, data, true);

        let session_id = lobby.join(client, data, true);
        lobby.setHost(session_id);
    }

    /**
     * Creates a new lobby.
     * @param {string} [uuid] Optional id for the lobby.
     * @return {string} The id of the lobby.
     */
    static newLobby(uuid?: string): string {
        if (!uuid) uuid = this.newId();
        if (LobbyManager.lobbies[uuid]) return null;
        LobbyManager.lobbies[uuid] = new Lobby(uuid);
        return uuid;
    }

    static randomLobby(data: any): string {
        let ids = Object.keys(this.lobbies).filter((k) => this.lobbies[k].isPublic() && this.lobbies[k].isJoinable(data));
        if (ids.length === 0) return null;
        let i = Math.floor(Math.random() * ids.length);
        return ids[i];
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
     * @param {boolean} isHost
     * @return {string} the session id
     */
    newSession(client: Socket, data: any, isHost?: boolean): string {
        if (!data || !data.username) {
            client.emit('failed', 'no username');
            return;
        }
        let session_id = UUID();
        if (this.joined === 0) this.lobby.setHost(session_id);
        let ids = [{name: data.username, id: this.nextId++, ready: false, team: "random"}];
        this.joined++;

        if (data.multiplayer) {
            ids.push({name: data.username + "(2)", id: this.nextId++, ready: false, team: "random"});
            this.joined++;
        }

        this.sessions[session_id] = {ids: ids};
        this.clients[client.id] = {session: session_id, client: client};

        client.emit('joined', {
            ids: this.sessions[session_id].ids,
            session_id: session_id,
            lobby_id: this.lobby.getId(),
            isHost: !!isHost
        });
        return session_id;
    }

    /**
     * On disconnect remove the client and the session.
     * @param {SocketIO.Socket} client
     */
    removeSession(client: Socket) {
        if (!this.isJoined(client.id)) return;
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
                let player: any = this.sessions[key].ids[i];
                player.player = i;
                joined.push(player);
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

    /**
     * Getters
     * @return {Sessions}
     */
    getSessions(): Sessions {
        return this.sessions;
    }

    /**
     * Gets a session
     * @param {SocketIO.Socket} client
     * @return {string}
     */
    getSession(client: Socket): string {
        return this.clients[client.id].session;
    }

    /**
     * Disconnects all the clients.
     */
    disconnect() {
        for (let key in this.clients) {
            if (!this.clients.hasOwnProperty(key)) continue;
            this.clients[key].client.disconnect();
        }
    }

    /**
     * Restart the game.
     */
    restart() {
        for (let key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key)) continue;
            for (let x of this.sessions[key].ids) {
                x.ready = false;
            }
        }
    }

    /**
     * Checks if a player is joined.
     * @param {string} id
     * @return {boolean}
     */
    isJoined(id: string) {
        return !!this.clients[id];
    }

    /**
     * Checks if there are at least two different teams.
     * @return {boolean}
     */
    minTeams(bots: boolean, boardAmount: number): boolean {
        let team = null;
        if (this.calcJoined() !== boardAmount && bots) return true;
        for (let key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key)) continue;
            for (let x of this.sessions[key].ids) {
                if (!team) team = x.team;
                else if (team !== x.team) return true;
            }
        }
        return team === "random";
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
    private options: { bots: boolean };

    /**
     * @constructor
     * @param {string} id
     */
    constructor(id: string) {
        this.id = id;
        this._session_map = new SessionMap(this);
        this.state = State.Joining;
        this.options = {
            bots: false
        };
        this.setLevel("Palooza" + EXTENSION);
    }

    /**
     * Join a client
     * @param {SocketIO.Socket} client
     * @param data
     * @param {boolean} [isHost]
     * @return {string} The session id.
     */
    join(client: Socket, data: any, isHost?: boolean): string {
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
        if (this._session_map.isJoined(client.id)) {
            client.emit('failed', 'Already joined!');
            return;
        }

        let session_id = this._session_map.newSession(client, data, isHost);

        this.eventListeners(client);

        logger.log(`Joined ${client.id}, ${this._session_map.calcJoined()}/${this.board ? this.board.metadata.playerAmount : 'NaN'}`);

        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
        return session_id;
    }

    /**
     * Register the event listeners for the client.
     * @param {SocketIO.Socket} client
     */
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
        client.on('options', function (data) {
            if (!data) return;
            that.setOptions(client, data);
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
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
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
        const teams = config.get("teams");
        if (teams.indexOf(data.team) < 0) {
            client.emit('failed', 'invalid team');
            return
        }
        logger.log("Team changed!");
        this._session_map.setTeam(data.session_id, data.team, data.player === 0 ? 0 : 1);

        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
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
        logger.log("Starting a game");
        if (!data || !data.session_id || !this.isHost(data.session_id)) {
            client.emit('failed', 'Only host can start');
            return;
        }
        if (!this.board) {
            client.emit('failed', 'Failed with starting: Board is not defined');
            return;
        }
        if (!this._session_map.isReady()) {
            client.emit('failed', 'Not everyone is ready!');
            return;
        }
        if (!this._session_map.minTeams(this.options.bots, this.board.metadata.playerAmount)) {
            client.emit('failed', 'All players are on the same team');
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

        this.game = GameParser.create(this.board, this._session_map.calcJoined(), this._session_map.getSessions(), this.options);
        if (this.game === null) return false;
        let tickRate: number = config.get("tickRate");
        let updateRate: number = config.get("updateRate");
        //Game tick rate & update
        this.interval = {
            tick: setInterval(function () {
                try {
                    if (that.game.isFinished()) that.stop();
                    that.game.gameTick(-1);
                } catch (e) {
                    LobbyManager.socket.in(that.id).emit('failed', 'something went wrong');
                    console.warn(e);
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

    /**
     * Restart the lobby.
     */
    restart() {
        if (this.state == State.Joining) return;
        this.state = State.Joining;
        this._session_map.restart();
        LobbyManager.socket.in(this.id).emit('restart');
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
        logger.log("Restart!");
    }

    /**
     * Checks for the data send and then change map.
     * @param {SocketIO.Socket} client
     * @param data
     */
    changeMap(client: Socket, data: any) {
        if (this.state !== State.Joining) {
            client.emit('failed', 'game already in progress');
        }
        if (!data.session_id || !this.isHost(data.session_id)) {
            client.emit('failed', 'only host can change map');
            return;
        }
        if (isNullOrUndefined(data.board) || !isString(data.board)) {
            client.emit('failed', 'no board defined');
            return;
        }
        if (data.board.length > 100000) {
            client.emit('failed', 'to large input');
            return;
        }
        let info: { success: boolean; message?: string };
        if (!data.custom) {
            info = this.setLevel(data.board + EXTENSION);
        } else {
            let string = new Buffer(data.board, "base64").toString();
            info = this.setLevel(string.split(/\r?\n/));
        }
        if (!info.success) {
            client.emit('failed', info.message)
        } else {
            let boardName = !!data.custom ? "custom map" : data.board;
            LobbyManager.socket.in(this.id).emit('map', {boardName: boardName, board: this.board.toJson()});
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
            if (!BoardParser.valid(board).valid) {
                return {success: false, message: "Something went wrong with parsing the file"};
            }
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
     * Change the options
     * @param {SocketIO.Socket} client
     * @param data
     */
    setOptions(client: Socket, data: any): void {
        if (!data.session_id || !this.isHost(data.session_id)) {
            client.emit('failed', 'only host can change options');
            return;
        }
        if (!data.options) {
            client.emit('failed', 'No options specified');
            return;
        }
        this.options.bots = !!data.options.bots;
    }

    /**
     * Set a password.
     * @param {string} password
     */
    setPassword(password: string): void {
        this.password = password;
    }

    /**
     * Sets a host
     * @param {string} uuid
     */
    setHost(uuid: string): void {
        this.host = uuid;
    }

    /**
     *
     * @param {string} uuid
     * @return {boolean}
     */
    isHost(uuid: string): boolean {
        return this.host === uuid;
    }

    /**
     * Close the lobby and remove it from the lobby-manager to let the garbage collector take care of it.
     */
    close() {
        if (this.state !== State.Joining) return;
        LobbyManager.socket.in(this.id).emit('failed', 'Host disconnected', true);
        this._session_map.disconnect();
        delete LobbyManager.socket.nsps[this.id];
        delete LobbyManager.lobbies[this.id];
    }

    /**
     *
     * @return {SessionMap}
     */
    getSessionMap(): SessionMap {
        return this._session_map;
    }

    /**
     *
     * @return {string}
     */
    getId(): string {
        return this.id
    }

    isPublic(): boolean {
        return this.password === "";
    }

    isJoinable(data: any): boolean {
        return this.state === State.Joining && this._session_map.calcJoined() + (data.multiplayer ? 2 : 1) <= this.board.metadata.playerAmount
    }
}

export = LobbyManager;