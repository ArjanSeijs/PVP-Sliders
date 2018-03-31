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

    static clientJoin(client: Socket, data: any) {
        if (!LobbyManager.lobbies[data.lobby]) {
            client.emit('failed', 'lobby does not exist');
        } else {
            LobbyManager.lobbies[data.lobby].join(client, data);
        }
    }

    static newLobby(uuid?: string): string {
        if (!uuid) uuid = UUID();
        LobbyManager.lobbies[uuid] = new Lobby(uuid);
        return uuid;
    }
}

class SessionMap {

    private lobby: Lobby;
    sessions: { [index: string]: { ids: { id: number, name: string, ready: boolean }[] } } = {};
    private clients: { [index: number]: string } = {};
    private nextid: number;

    constructor(lobby: Lobby) {
        this.lobby = lobby;
        this.nextid = 0;
    }

    newSession(client: Socket, data: any) {
        if (!data.username) {
            client.emit('failed', 'no username');
            return;
        }
        let session_id = UUID();

        let ids = [{name: data.username, id: this.nextid++, ready: false}];
        if (data.multiplayer) ids.push({name: data.username + "(2)", id: this.nextid++, ready: false});

        this.sessions[session_id] = {ids: ids};
        this.clients[client.id] = session_id;
        client.emit('joined', {ids: this.sessions[session_id].ids, session_id: session_id});
    }

    removeSession(client: Socket) {
        let uuid = this.clients[client.id];
        delete this.clients[client.id];
        delete this.sessions[uuid];
    }

    removeClient(client: Socket): void {
        delete this.clients[client.id];
    }

    mapSession(client: Socket, data: any): void {
        //TODO
    }

    calcJoined(): number {
        let i = 0;
        for (let key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key)) continue;
            i += this.sessions[key].ids.length;
        }
        return i;
    }

    verifyId(data: any): boolean {
        if (!data.session_id && !data.id) return false;
        if (!this.sessions[data.session_id]) return false;
        return this.sessions[data.session_id].ids.map(x => x.id).indexOf(data.id) !== -1;
    }

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

    toggleReady(session_id: string, ready: boolean): void {
        if (!this.sessions[session_id]) return;
        for (let x of this.sessions[session_id].ids) {
            x.ready = ready;
        }
    }

    isReady(): boolean {
        for (let key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key)) return;
            for (let i of this.sessions[key].ids) {
                if (!i.ready) return false;
            }
        }
        return true;
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
    state: State;

    constructor(id: string) {
        this.id = id;
        this.session_map = new SessionMap(this);
        this.state = State.Joining;
    }

    join(client: Socket, data: any): void {
        let that = this;
        if (this.state === State.InProgress) {
            this.session_map.mapSession(client, data);
            return;
        } else {
            this.session_map.newSession(client, data);
        }

        client.on('debug', function () {
            //TODO SERIOUSLY REMOVE THIS IN PRODUCTION.
            console.log(JSON.stringify(that.game.entitiesJson()));
        });

        client.on('disconnect', function () {
            if (that.state !== State.Joining) {
                that.session_map.removeClient(client)
            } else {
                that.session_map.removeSession(client)
            }
            console.log(`Disconnected ${client.id}, ${that.session_map.calcJoined()}/${that.board.metadata.playerAmount}`);
        });
        client.on('move', function (data) {
            if (that.state !== State.InProgress) return;
            if (!that.session_map.verifyId(data)) {
                client.emit('failed', "Incorrect session and id");
                return;
            }
            let id = data.id;
            let direction = Direction.from(data.direction);
            that.game.move(id, direction);
        });
        client.on('ready', function (data) {
            that.readyToggle(client, data);
        });

        client.join(this.id);
        console.log(`Joined ${client.id}, ${this.session_map.calcJoined()}/${this.board.metadata.playerAmount}`);

        LobbyManager.socket.in(this.id).emit('players', this.session_map.getJoined());
        that.checkReady();
    }

    readyToggle(client: Socket, data : any) {
        if (!data.session_id && !this.session_map.sessions[session_id]) {
            client.emit('failed', 'invalid session_id');
            return;
        }

        this.session_map.toggleReady(data.session_id, data.ready === true);

        LobbyManager.socket.in(this.id).emit('players', this.session_map.getJoined());

        this.checkReady();
    }

    checkReady(): void {
        if (this.session_map.calcJoined() == this.board.metadata.playerAmount && this.session_map.isReady()) {
            this.loadGame();
            console.log(JSON.stringify(this.session_map.sessions));
        }
    }

    stop(): void {
        clearInterval(this.interval.tick);
        clearInterval(this.interval.update);
        this.state = State.Finished;
    }

    loadGame(): void {
        let that = this;
        if (this.session_map.calcJoined() < 2 || isNullOrUndefined(this.board)) return;

        this.game = GameParser.create(this.board, this.session_map.calcJoined(), this.session_map.sessions);

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

    setLevel(board: string | string[], players?: number): { success: boolean, message?: string } {
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
            return {success: false, message: "too many players in lobby for this level"}
        }
        return {success: true};
    }

    setPassword(password: string): void {
        this.password = password;
    }

}

export = LobbyManager;