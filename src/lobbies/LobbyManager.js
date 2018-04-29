"use strict";
var io = require("socket.io");
var Logger = require("simple-nodejs-logger");
var crypto = require("crypto");
var util_1 = require("util");
var UUIDv4 = require("uuid/v4");
var GameParser = require("../parsers/GameParser");
var BoardParser = require("../parsers/BoardParser");
var Direction = require("../classes/Direction");
var config = require("../lib/config");
var UUID = UUIDv4;
var logger = Logger("LobbyManager");
var EXTENSION = ".txt";
var LobbyManager = (function () {
    function LobbyManager() {
    }
    LobbyManager.init = function (server) {
        LobbyManager.socket = io(server);
        LobbyManager.socket.on('connection', function (client) {
            client.on('join', function (data) {
                if (LobbyManager.joined[client.id]) {
                    client.emit('failed', 'You can only join one lobby');
                    return;
                }
                LobbyManager.clientJoin(client, data);
            });
            client.on('host', function (data) {
                if (LobbyManager.joined[client.id]) {
                    client.emit('failed', 'You can only join one lobby');
                    return;
                }
                LobbyManager.clientHost(client, data);
            });
        });
        BoardParser.init();
    };
    LobbyManager.newId = function () {
        return new Buffer(crypto.randomBytes(6)).toString("base64");
    };
    LobbyManager.clientJoin = function (client, data) {
        if (!data || (typeof data.lobby !== "string") || (data.lobby !== "" && !LobbyManager.lobbies[data.lobby])) {
            client.emit('failed', 'lobby does not exist');
        }
        else {
            var lobbyId = data.lobby;
            if (lobbyId === "")
                lobbyId = LobbyManager.randomLobby(data);
            if (lobbyId === null) {
                LobbyManager.clientHost(client, data);
                return;
            }
            LobbyManager.lobbies[lobbyId].join(client, data);
            LobbyManager.joined[client.id] = { client: client, lobby: lobbyId };
        }
    };
    LobbyManager.clientHost = function (client, data) {
        if (!data || !data.username) {
            client.emit('failed', 'no username provided');
            return;
        }
        var lobby_id = LobbyManager.newLobby();
        if (!lobby_id)
            client.emit('failed', 'something went wrong with creating the lobby');
        var lobby = LobbyManager.getLobby(lobby_id);
        if (data.password)
            lobby.setPassword(data.password);
        var session_id = lobby.join(client, data, true);
        lobby.setHost(session_id);
        LobbyManager.joined[client.id] = { client: client, lobby: lobby_id };
    };
    LobbyManager.newLobby = function (uuid) {
        if (!uuid)
            uuid = this.newId();
        if (LobbyManager.lobbies[uuid])
            return null;
        LobbyManager.lobbies[uuid] = new Lobby(uuid);
        return uuid;
    };
    LobbyManager.randomLobby = function (data) {
        var _this = this;
        var ids = Object.keys(this.lobbies).filter(function (k) { return _this.lobbies[k].isPublic() && _this.lobbies[k].isJoinable(data); });
        if (ids.length === 0)
            return null;
        var i = Math.floor(Math.random() * ids.length);
        return ids[i];
    };
    LobbyManager.getLobby = function (uuid) {
        return this.lobbies[uuid];
    };
    LobbyManager.leave = function (client, lobby) {
        if (this.joined[client.id]) {
            if (this.joined[client.id].lobby === lobby.getId()) {
                delete this.joined[client.id];
            }
        }
    };
    LobbyManager.joined = {};
    LobbyManager.lobbies = {};
    return LobbyManager;
}());
var SessionMap = (function () {
    function SessionMap(lobby) {
        this.sessions = {};
        this.clients = {};
        this.lobby = lobby;
        this.nextId = 0;
        this.joined = 0;
    }
    SessionMap.prototype.newSession = function (client, data, isHost) {
        if (!data || !data.username) {
            client.emit('failed', 'no username');
            return;
        }
        var session_id = UUID();
        if (this.joined === 0 || isHost)
            this.lobby.setHost(session_id);
        var ids = [{ name: data.username, id: this.nextId++, ready: false, team: "random" }];
        this.joined++;
        if (data.multiplayer) {
            ids.push({ name: data.username + "(2)", id: this.nextId++, ready: false, team: "random" });
            this.joined++;
        }
        this.sessions[session_id] = { ids: ids };
        this.clients[client.id] = { session: session_id, client: client };
        client.emit('joined', {
            ids: this.sessions[session_id].ids,
            session_id: session_id,
            lobby_id: this.lobby.getId(),
            board: this.lobby.getBoard(),
            isHost: !!isHost
        });
        return session_id;
    };
    SessionMap.prototype.removeSession = function (client) {
        logger.log(JSON.stringify(this.sessions));
        logger.log(JSON.stringify(Object.keys(this.clients)));
        if (!this.isJoined(client.id))
            return;
        var session_id = this.clients[client.id].session;
        logger.log(session_id);
        delete this.clients[client.id];
        this.joined -= this.sessions[session_id].ids.length;
        delete this.sessions[session_id];
        LobbyManager.leave(client, this.lobby);
        if (this.lobby.isHost(session_id))
            this.lobby.close();
    };
    SessionMap.prototype.calcJoined = function () {
        return this.joined;
    };
    SessionMap.prototype.verifyId = function (data) {
        if (!data || !data.session_id || util_1.isNullOrUndefined(data.id))
            return false;
        if (!this.sessions[data.session_id])
            return false;
        return this.sessions[data.session_id].ids.filter(function (x) { return x.id === data.id; }).length !== 0;
    };
    SessionMap.prototype.getJoined = function () {
        var joined;
        joined = [];
        for (var key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key))
                continue;
            for (var i = 0; i < this.sessions[key].ids.length; i++) {
                var player = this.sessions[key].ids[i];
                player.player = i;
                joined.push(player);
            }
        }
        return joined;
    };
    SessionMap.prototype.toggleReady = function (session_id, ready) {
        if (!this.sessions[session_id])
            return;
        for (var _i = 0, _a = this.sessions[session_id].ids; _i < _a.length; _i++) {
            var x = _a[_i];
            x.ready = ready;
        }
    };
    SessionMap.prototype.setTeam = function (session_id, team, player) {
        if (!this.sessions[session_id])
            return;
        if (!this.sessions[session_id].ids[player])
            player = 0;
        this.sessions[session_id].ids[player].team = team;
    };
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
    SessionMap.prototype.getSession = function (client) {
        return this.clients[client.id].session;
    };
    SessionMap.prototype.disconnect = function () {
        for (var key in this.clients) {
            if (!this.clients.hasOwnProperty(key))
                continue;
            this.clients[key].client.disconnect();
        }
    };
    SessionMap.prototype.restart = function () {
        for (var key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key))
                continue;
            for (var _i = 0, _a = this.sessions[key].ids; _i < _a.length; _i++) {
                var x = _a[_i];
                x.ready = false;
            }
        }
    };
    SessionMap.prototype.isJoined = function (id) {
        return !!this.clients[id];
    };
    SessionMap.prototype.minTeams = function (bots, boardAmount) {
        var team = null;
        if (this.calcJoined() !== boardAmount && bots)
            return true;
        for (var key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key))
                continue;
            for (var _i = 0, _a = this.sessions[key].ids; _i < _a.length; _i++) {
                var x = _a[_i];
                if (!team)
                    team = x.team;
                else if (team !== x.team)
                    return true;
            }
        }
        return team === "random";
    };
    SessionMap.prototype.kick = function (id) {
        var session_id = null;
        outerLoop: for (var key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key))
                continue;
            for (var _i = 0, _a = this.sessions[key].ids; _i < _a.length; _i++) {
                var x = _a[_i];
                if (x.id === id) {
                    session_id = key;
                    break outerLoop;
                }
            }
        }
        if (session_id === null || this.lobby.isHost(session_id))
            return;
        for (var key in this.clients) {
            if (!this.clients.hasOwnProperty(key))
                continue;
            if (this.clients[key].session === session_id) {
                this.clients[key].client.emit('failed', 'kicked by host', true);
                this.removeSession(this.clients[key].client);
            }
        }
    };
    return SessionMap;
}());
var State;
(function (State) {
    State[State["Starting"] = 0] = "Starting";
    State[State["Joining"] = 1] = "Joining";
    State[State["InProgress"] = 2] = "InProgress";
    State[State["Finished"] = 3] = "Finished";
})(State || (State = {}));
var Lobby = (function () {
    function Lobby(id) {
        this.password = "";
        this.host = null;
        this.id = id;
        this._session_map = new SessionMap(this);
        this.state = State.Joining;
        this.options = {
            bots: false
        };
        this.setLevel("Palooza" + EXTENSION);
    }
    Lobby.prototype.join = function (client, data, isHost) {
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
        var session_id = this._session_map.newSession(client, data, isHost);
        this.eventListeners(client);
        logger.log("Joined " + client.id + ", " + this._session_map.calcJoined() + "/" + (this.board ? this.board.metadata.playerAmount : 'NaN'));
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
        return session_id;
    };
    Lobby.prototype.eventListeners = function (client) {
        var that = this;
        client.on('leave', function () {
            that.disconnect(client);
        });
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
        client.on('team', function (data) {
            if (!data)
                return;
            that.teamChange(client, data);
        });
        client.on('map', function (data) {
            if (!data)
                return;
            else
                that.changeMap(client, data);
        });
        client.on('start', function (data) {
            if (!data || that.state === State.InProgress || that.state === State.Starting) {
                client.emit('failed', 'game already started');
                return;
            }
            else
                that.start(client, data);
        });
        client.on('options', function (data) {
            if (!data)
                return;
            that.setOptions(client, data);
        });
        client.on('kick', function (data) {
            if (!data)
                return;
            that.kick(client, data);
        });
        client.join(this.id);
    };
    Lobby.prototype.disconnect = function (client) {
        this._session_map.removeSession(client);
        logger.log("Disconnected " + client.id + ", " + this._session_map.calcJoined() + "/" + (this.board ? this.board.metadata.playerAmount : 'NaN'));
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
    };
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
    Lobby.prototype.readyToggle = function (client, data) {
        if (!data || !data.session_id || !this._session_map.getSessions()[data.session_id]) {
            client.emit('failed', 'invalid session_id');
            return;
        }
        this._session_map.toggleReady(data.session_id, data.ready === true);
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
    };
    Lobby.prototype.teamChange = function (client, data) {
        if (!data || !data.session_id || !this._session_map.getSessions()[data.session_id]) {
            client.emit('failed', 'invalid session_id');
            return;
        }
        if (typeof (data.team) !== "string") {
            client.emit('failed', 'invalid team');
            return;
        }
        var teams = config.get("teams");
        if (teams.indexOf(data.team) < 0) {
            client.emit('failed', 'invalid team');
            return;
        }
        logger.log("Team changed!");
        this._session_map.setTeam(data.session_id, data.team, data.player === 0 ? 0 : 1);
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
    };
    Lobby.prototype.stop = function () {
        if (this.state == State.Finished)
            return;
        var that = this;
        clearInterval(this.interval.tick);
        clearInterval(this.interval.update);
        this.state = State.Finished;
        LobbyManager.socket.in(this.id).emit('end', { entities: this.game.entitiesJson(), winners: this.game.winners });
        setTimeout(function () {
            that.restart();
        }, 5000);
    };
    Lobby.prototype.start = function (client, data) {
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
            client.emit('failed', 'Something went wrong with loading.');
        }
    };
    Lobby.prototype.loadGame = function () {
        var that = this;
        if (this._session_map.calcJoined() < 2 || util_1.isNullOrUndefined(this.board))
            return false;
        this.game = GameParser.create(this.board, this._session_map.calcJoined(), this._session_map.getSessions(), this.options);
        if (this.game === null)
            return false;
        var tickRate = config.get("tickRate");
        var updateRate = config.get("updateRate");
        this.interval = {
            tick: setInterval(function () {
                try {
                    if (that.game.isFinished())
                        that.stop();
                    that.game.gameTick(-1);
                }
                catch (e) {
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
        LobbyManager.socket.in(this.id).emit('start', { game: this.game.toJson() });
        return true;
    };
    Lobby.prototype.restart = function () {
        if (this.state == State.Joining)
            return;
        this.state = State.Joining;
        this._session_map.restart();
        LobbyManager.socket.in(this.id).emit('restart');
        LobbyManager.socket.in(this.id).emit('players', this._session_map.getJoined());
        logger.log("Restart!");
    };
    Lobby.prototype.changeMap = function (client, data) {
        if (this.state !== State.Joining) {
            client.emit('failed', 'game already in progress');
        }
        if (!data.session_id || !this.isHost(data.session_id)) {
            client.emit('failed', 'only host can change map');
            return;
        }
        if (util_1.isNullOrUndefined(data.board) || !util_1.isString(data.board)) {
            client.emit('failed', 'no board defined');
            return;
        }
        if (data.board.length > 100000) {
            client.emit('failed', 'to large input');
            return;
        }
        var info;
        if (!data.custom) {
            info = this.setLevel(data.board + EXTENSION);
        }
        else {
            var string = new Buffer(data.board, "base64").toString();
            info = this.setLevel(string.split(/\r?\n/));
        }
        if (!info.success) {
            client.emit('failed', info.message);
        }
        else {
            var boardName = !!data.custom ? data.mapName : data.board;
            LobbyManager.socket.in(this.id).emit('map', { boardName: boardName, board: this.board.toJson() });
        }
    };
    Lobby.prototype.setLevel = function (board, players) {
        var oldBoard = this.board;
        if (typeof board === "string") {
            this.board = BoardParser.getBoard(board);
            if (this.board === null) {
                return { success: false, message: "Could not find file" };
            }
        }
        else {
            if (!BoardParser.valid(board).valid) {
                return { success: false, message: "Something went wrong with parsing the file" };
            }
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
    Lobby.prototype.setOptions = function (client, data) {
        if (!data.session_id || !this.isHost(data.session_id)) {
            client.emit('failed', 'only host can change options');
            return;
        }
        if (!data.options) {
            client.emit('failed', 'No options specified');
            return;
        }
        this.options.bots = !!data.options.bots;
    };
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
        LobbyManager.socket.in(this.id).emit('failed', 'Host disconnected', true);
        this._session_map.disconnect();
        delete LobbyManager.socket.nsps[this.id];
        delete LobbyManager.lobbies[this.id];
    };
    Lobby.prototype.kick = function (client, data) {
        if (!data.session_id || !this.isHost(data.session_id)) {
            client.emit('failed', 'only host can kick players');
            return;
        }
        if (!util_1.isNullOrUndefined(data.id) && typeof data.id === "number") {
            this._session_map.kick(data.id);
        }
    };
    Lobby.prototype.getSessionMap = function () {
        return this._session_map;
    };
    Lobby.prototype.getId = function () {
        return this.id;
    };
    Lobby.prototype.isPublic = function () {
        return this.password === "";
    };
    Lobby.prototype.isJoinable = function (data) {
        return this.state === State.Joining && this._session_map.calcJoined() + (data.multiplayer ? 2 : 1) <= this.board.metadata.playerAmount;
    };
    Lobby.prototype.getBoard = function () {
        return this.board ? this.board.toJson() : null;
    };
    return Lobby;
}());
module.exports = LobbyManager;
//# sourceMappingURL=LobbyManager.js.map