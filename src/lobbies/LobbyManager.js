"use strict";
var io = require("socket.io");
var util_1 = require("util");
var UUID = require("uuid/v4");
var GameParser = require("../parsers/GameParser");
var BoardParser = require("../parsers/BoardParser");
var Direction = require("../classes/Direction");
var LobbyManager = /** @class */ (function () {
    function LobbyManager() {
    }
    /**
     * Initializes the lobbyManager
     * @param server The express server.
     */
    LobbyManager.init = function (server) {
        LobbyManager.socket = io(server);
        LobbyManager.socket.on('connection', function (client) {
            client.on('join', function (data) {
                LobbyManager.clientJoin(client, data);
            });
        });
        BoardParser.init();
        LobbyManager.newLobby("lobby1");
        LobbyManager.lobbies["lobby1"].setLevel("speedy.txt");
    };
    /**
     * Join a lobby.
     * @param {SocketIO.Socket} client The client
     * @param {*} data The data send on the socket.
     */
    LobbyManager.clientJoin = function (client, data) {
        if (!LobbyManager.lobbies[data.lobby]) {
            client.emit('failed', 'lobby does not exist');
        }
        else {
            LobbyManager.lobbies[data.lobby].join(client, data);
        }
    };
    /**
     * Creates a new lobby.
     * @param {string} [uuid] Optional id for the lobby.
     * @return {string} The id of the lobby.
     */
    LobbyManager.newLobby = function (uuid) {
        if (!uuid)
            uuid = UUID();
        LobbyManager.lobbies[uuid] = new Lobby(uuid);
        return uuid;
    };
    LobbyManager.lobbies = {};
    return LobbyManager;
}());
var SessionMap = /** @class */ (function () {
    /**
     * @constructor
     * @param {Lobby} lobby
     */
    function SessionMap(lobby) {
        this.sessions = {};
        this.clients = {};
        this.lobby = lobby;
        this.nextId = 0;
        this.joined = 0;
    }
    /**
     * Creates a new session.
     * @param {SocketIO.Socket} client
     * @param {*} data The data send over the session.
     */
    SessionMap.prototype.newSession = function (client, data) {
        if (!data.username) {
            client.emit('failed', 'no username');
            return;
        }
        var session_id = UUID();
        var ids = [{ name: data.username, id: this.nextId++, ready: false }];
        this.joined++;
        if (data.multiplayer) {
            ids.push({ name: data.username + "(2)", id: this.nextId++, ready: false });
            this.joined++;
        }
        this.sessions[session_id] = { ids: ids };
        this.clients[client.id] = session_id;
        client.emit('joined', { ids: this.sessions[session_id].ids, session_id: session_id });
    };
    /**
     * On disconnect remove the client and the session.
     * @param {SocketIO.Socket} client
     */
    SessionMap.prototype.removeSession = function (client) {
        var uuid = this.clients[client.id];
        delete this.clients[client.id];
        this.joined -= this.sessions[uuid].ids.length;
        delete this.sessions[uuid];
    };
    /**
     * On disconnect remove the client.
     * @param {SocketIO.Socket} client
     */
    SessionMap.prototype.removeClient = function (client) {
        delete this.clients[client.id];
    };
    /**
     * TODO
     * @param {SocketIO.Socket} client
     * @param data
     */
    SessionMap.prototype.mapSession = function (client, data) {
        //TODO
    };
    /**
     * How many players joined.
     * @return {number}
     */
    SessionMap.prototype.calcJoined = function () {
        return this.joined;
    };
    /**
     * Verify the session with the player-id;
     * @param {*} data The data from the client.
     * @return {boolean}
     */
    SessionMap.prototype.verifyId = function (data) {
        if (!data.session_id && !data.id)
            return false;
        if (!this.sessions[data.session_id])
            return false;
        return this.sessions[data.session_id].ids.filter(function (x) { return x.id === data.id; }).length !== 0;
    };
    /**
     * Maps the joined players to an array.
     * @return {{id: number, name: string, ready: boolean}[]}
     */
    SessionMap.prototype.getJoined = function () {
        var joined;
        joined = [];
        for (var key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key))
                continue;
            for (var i = 0; i < this.sessions[key].ids.length; i++) {
                joined.push(this.sessions[key].ids[i]);
            }
        }
        return joined;
    };
    /**
     * Toggles the ready status for the players at the session.
     * @param {string} session_id
     * @param {boolean} ready
     */
    SessionMap.prototype.toggleReady = function (session_id, ready) {
        if (!this.sessions[session_id])
            return;
        for (var _i = 0, _a = this.sessions[session_id].ids; _i < _a.length; _i++) {
            var x = _a[_i];
            x.ready = ready;
        }
    };
    /**
     * Checks if all players are ready.
     * @return {boolean}
     */
    SessionMap.prototype.isReady = function () {
        for (var key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key))
                return;
            for (var _i = 0, _a = this.sessions[key].ids; _i < _a.length; _i++) {
                var i = _a[_i];
                if (!i.ready)
                    return false;
            }
        }
        return true;
    };
    SessionMap.prototype.getSessions = function () {
        return this.sessions;
    };
    return SessionMap;
}());
var State;
(function (State) {
    State[State["Joining"] = 0] = "Joining";
    State[State["InProgress"] = 1] = "InProgress";
    State[State["Finished"] = 2] = "Finished";
})(State || (State = {}));
var Lobby = /** @class */ (function () {
    /**
     * @constructor
     * @param {string} id
     */
    function Lobby(id) {
        this.password = "";
        this.id = id;
        this.session_map = new SessionMap(this);
        this.state = State.Joining;
    }
    /**
     * Join a client
     * @param {SocketIO.Socket} client
     * @param data
     */
    Lobby.prototype.join = function (client, data) {
        var that = this;
        if (this.state === State.InProgress) {
            this.session_map.mapSession(client, data);
            return;
        }
        else {
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
        console.log("Joined " + client.id + ", " + this.session_map.calcJoined() + "/" + this.board.metadata.playerAmount);
        LobbyManager.socket.in(this.id).emit('players', this.session_map.getJoined());
        that.checkReady();
    };
    /**
     * On client disconnect.
     * @param {SocketIO.Socket} client
     */
    Lobby.prototype.disconnect = function (client) {
        if (this.state !== State.Joining) {
            this.session_map.removeClient(client);
        }
        else {
            this.session_map.removeSession(client);
        }
        console.log("Disconnected " + client.id + ", " + this.session_map.calcJoined() + "/" + this.board.metadata.playerAmount);
    };
    /**
     * Move a player
     * @param {SocketIO.Socket} client
     * @param data
     */
    Lobby.prototype.move = function (client, data) {
        if (this.state !== State.InProgress)
            return;
        if (!this.session_map.verifyId(data)) {
            client.emit('failed', "Incorrect session and id");
            return;
        }
        var id = data.id;
        var direction = Direction.from(data.direction);
        this.game.move(id, direction);
    };
    /**
     * On ready toggle.
     * @param {SocketIO.Socket} client
     * @param data
     */
    Lobby.prototype.readyToggle = function (client, data) {
        if (!data.session_id && !this.session_map.getSessions()[session_id]) {
            client.emit('failed', 'invalid session_id');
            return;
        }
        this.session_map.toggleReady(data.session_id, data.ready === true);
        LobbyManager.socket.in(this.id).emit('players', this.session_map.getJoined());
        this.checkReady();
    };
    /**
     * Check if the server is full and all players are ready
     */
    Lobby.prototype.checkReady = function () {
        if (this.session_map.calcJoined() == this.board.metadata.playerAmount && this.session_map.isReady()) {
            this.loadGame();
            console.log(JSON.stringify(this.session_map.getSessions()));
        }
    };
    /**
     * Stop the execution of the lobby.
     */
    Lobby.prototype.stop = function () {
        clearInterval(this.interval.tick);
        clearInterval(this.interval.update);
        this.state = State.Finished;
    };
    /**
     * Load and start the game.
     */
    Lobby.prototype.loadGame = function () {
        var that = this;
        if (this.session_map.calcJoined() < 2 || util_1.isNullOrUndefined(this.board))
            return;
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
        LobbyManager.socket.in(this.id).emit('start', { game: this.game.toJson() });
    };
    /**
     * @param {string | string[]} board
     * @param {number} players
     * @return {{success: boolean, message?: string}}
     */
    Lobby.prototype.setLevel = function (board, players) {
        var oldBoard = this.board;
        if (typeof board === "string") {
            this.board = BoardParser.getBoard(board);
            if (this.board === null) {
                return { success: false, message: "Could not find file" };
            }
        }
        else {
            this.board = BoardParser.fromStrings(board);
            if (this.board === null) {
                return { success: false, message: "Something went wrong with parsing the file" };
            }
        }
        if (!util_1.isNullOrUndefined(players) && this.board.metadata.playerAmount < players) {
            this.board = oldBoard;
            return { success: false, message: "too many players in lobby for this level" };
        }
        return { success: true };
    };
    /**
     * Set a password.
     * @param {string} password
     */
    Lobby.prototype.setPassword = function (password) {
        this.password = password;
    };
    return Lobby;
}());
module.exports = LobbyManager;
//# sourceMappingURL=LobbyManager.js.map