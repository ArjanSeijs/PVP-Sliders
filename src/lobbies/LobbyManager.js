"use strict";
var io = require("socket.io");
var Logger = require("simple-nodejs-logger");
var util_1 = require("util");
var UUIDv4 = require("uuid/v4");
var GameParser = require("../parsers/GameParser");
var BoardParser = require("../parsers/BoardParser");
var Direction = require("../classes/Direction");
var UUID = UUIDv4;
var logger = Logger("LobbyManager");
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
            client.on('host', function (data) {
                LobbyManager.clientHost(client, data);
            });
        });
        BoardParser.init();
        LobbyManager.newLobby("lobby1");
        LobbyManager.getLobby("lobby1").setLevel("speedy.txt");
    };
    /**
     * Join a lobby.
     * @param {SocketIO.Socket} client The client
     * @param {*} data The data send on the socket.
     */
    LobbyManager.clientJoin = function (client, data) {
        if (!data || !LobbyManager.lobbies[data.lobby]) {
            client.emit('failed', 'lobby does not exist');
        }
        else {
            LobbyManager.lobbies[data.lobby].join(client, data);
        }
    };
    /**
     * Host a lobby.
     * @param {SocketIO.Socket} client
     * @param data
     */
    LobbyManager.clientHost = function (client, data) {
        if (!data || !data.username) {
            client.emit('failed', 'no username provided');
            return;
        }
        data.lobby = LobbyManager.newLobby();
        var lobby = LobbyManager.getLobby(data.lobby);
        if (data.password)
            lobby.setPassword(data.password);
        lobby.setLevel("Palooza.txt");
        lobby.join(client, data);
        var session_id = lobby.getSessionMap().getSession(client.id);
        lobby.setHost(session_id);
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
    LobbyManager.getLobby = function (uuid) {
        return this.lobbies[uuid];
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
        if (!data || !data.username) {
            client.emit('failed', 'no username');
            return;
        }
        var session_id = UUID();
        if (this.joined === 0)
            this.lobby.setHost(session_id);
        var ids = [{ name: data.username, id: this.nextId++, ready: false }];
        this.joined++;
        if (data.multiplayer) {
            ids.push({ name: data.username + "(2)", id: this.nextId++, ready: false });
            this.joined++;
        }
        this.sessions[session_id] = { ids: ids };
        this.clients[client.id] = { session: session_id, client: client };
        client.emit('joined', {
            ids: this.sessions[session_id].ids,
            session_id: session_id,
            lobby_id: this.lobby.getId()
        });
    };
    /**
     * On disconnect remove the client and the session.
     * @param {SocketIO.Socket} client
     */
    SessionMap.prototype.removeSession = function (client) {
        var session_id = this.clients[client.id].session;
        if (this.lobby.isHost(session_id))
            this.lobby.close();
        delete this.clients[client.id];
        this.joined -= this.sessions[session_id].ids.length;
        delete this.sessions[session_id];
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
        if (!data || !data.session_id || util_1.isNullOrUndefined(data.id))
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
    SessionMap.prototype.getSession = function (id) {
        return this.clients[id].session;
    };
    SessionMap.prototype.disconnect = function () {
        for (var key in this.clients) {
            if (!this.clients.hasOwnProperty(key))
                continue;
            this.clients[key].client.disconnect();
        }
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
        this.host = null;
        this.id = id;
        this._session_map = new SessionMap(this);
        this.state = State.Joining;
    }
    /**
     * Join a client
     * @param {SocketIO.Socket} client
     * @param data
     */
    Lobby.prototype.join = function (client, data) {
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
        if (this.state === State.InProgress) {
            this._session_map.mapSession(client, data);
            return;
        }
        else {
            this._session_map.newSession(client, data);
        }
        this.eventListeners(client);
        logger.log("Joined " + client.id + ", " + this._session_map.calcJoined() + "/" + (this.board ? this.board.metadata.playerAmount : 'NaN'));
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
        this.checkReady();
    };
    Lobby.prototype.eventListeners = function (client) {
        var that = this;
        client.on('disconnect', function () {
            that.disconnect(client);
        });
        client.on('move', function (data) {
            if (!data)
                return;
            that.move(client, data);
        });
        client.on('ready', function (data) {
            if (!data)
                return;
            that.readyToggle(client, data);
        });
        client.on('map', function (data) {
            if (!data)
                return;
            else
                that.changeMap(client, data);
        });
        client.join(this.id);
    };
    /**
     * On client disconnect.
     * @param {SocketIO.Socket} client
     */
    Lobby.prototype.disconnect = function (client) {
        if (this.state !== State.Joining) {
            this._session_map.removeClient(client);
        }
        else {
            this._session_map.removeSession(client);
        }
        logger.log("Disconnected " + client.id + ", " + this._session_map.calcJoined() + "/" + (this.board ? this.board.metadata.playerAmount : 'NaN'));
    };
    /**
     * Move a player
     * @param {SocketIO.Socket} client
     * @param data
     */
    Lobby.prototype.move = function (client, data) {
        if (!data || this.state !== State.InProgress)
            return;
        if (!this._session_map.verifyId(data)) {
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
        if (!data || !data.session_id && !this._session_map.getSessions()[session_id]) {
            client.emit('failed', 'invalid session_id');
            return;
        }
        this._session_map.toggleReady(data.session_id, data.ready === true);
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
        this.checkReady();
    };
    /**
     * Check if the server is full and all players are ready
     */
    Lobby.prototype.checkReady = function () {
        if (this.board && this._session_map.calcJoined() == this.board.metadata.playerAmount && this._session_map.isReady()) {
            this.loadGame();
        }
    };
    /**
     * Stop the execution of the lobby.
     */
    Lobby.prototype.stop = function () {
        clearInterval(this.interval.tick);
        clearInterval(this.interval.update);
        this.state = State.Finished;
        LobbyManager.socket.in(this.id).emit('end', this.game.winners);
    };
    /**
     * Load and start the game.
     */
    Lobby.prototype.loadGame = function () {
        var that = this;
        if (this._session_map.calcJoined() < 2 || util_1.isNullOrUndefined(this.board))
            return;
        this.game = GameParser.create(this.board, this._session_map.calcJoined(), this._session_map.getSessions());
        //Game tick rate & update TODO config
        this.interval = {
            tick: setInterval(function () {
                try {
                    if (that.game.isFinished())
                        that.stop();
                    that.game.gameTick(-1);
                }
                catch (e) {
                    LobbyManager.socket.in(that.id).emit('failed', 'something went wrong');
                    that.stop();
                }
            }, 15),
            update: setInterval(function () {
                LobbyManager.socket.in(that.id).emit("update", that.game.entitiesJson());
            }, 15)
        };
        this.state = State.InProgress;
        LobbyManager.socket.in(this.id).emit('start', { game: this.game.toJson() });
    };
    Lobby.prototype.changeMap = function (client, data) {
        if (util_1.isNullOrUndefined(data) || (!util_1.isString(data) && !data.board)) {
            client.emit('failed', 'no board defined');
            return;
        }
        var info = this.setLevel(util_1.isString(data) ? data + ".txt" : data.board, this._session_map.calcJoined());
        if (!info.success) {
            client.emit('failed', info.message);
        }
        else {
            LobbyManager.socket.in(this.id).emit('map', util_1.isString(data) ? data : data.board);
        }
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
        if (util_1.isNullOrUndefined(this.board)) {
            this.board = oldBoard;
            return { success: false, message: 'Board was undefined' };
        }
        if (!util_1.isNullOrUndefined(players) && this.board.metadata.playerAmount < players) {
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
    Lobby.prototype.setHost = function (uuid) {
        this.host = uuid;
    };
    Lobby.prototype.isHost = function (uuid) {
        return this.host === uuid;
    };
    Lobby.prototype.close = function () {
        if (this.state !== State.Joining)
            return;
        LobbyManager.socket.in(this.id).emit('failed', 'Host disconnected');
        this._session_map.disconnect();
        delete LobbyManager.socket.nsps[this.id];
        delete LobbyManager.lobbies[this.id];
    };
    Lobby.prototype.getSessionMap = function () {
        return this._session_map;
    };
    Lobby.prototype.getId = function () {
        return this.id;
    };
    return Lobby;
}());
module.exports = LobbyManager;
//# sourceMappingURL=LobbyManager.js.map