"use strict";
var io = require("socket.io");
var util_1 = require("util");
var GameParser = require("../parsers/GameParser");
var BoardParser = require("../parsers/BoardParser");
var UUID = require("uuid/v4");
var Direction = require("../classes/Direction");
var LobbyManager = /** @class */ (function () {
    function LobbyManager() {
    }
    LobbyManager.init = function (server) {
        LobbyManager.socket = io(server);
        LobbyManager.socket.on('connection', function (client) {
            client.on('join', function (data) {
                if (!LobbyManager.lobbies[data.lobby]) {
                    client.emit('failed', 'lobby does not exist');
                }
                else {
                    LobbyManager.lobbies[data.lobby].join(client, data);
                }
            });
        });
        // BoardParser.init();
        LobbyManager.newLobby("lobby1");
        console.log(this.lobbies["lobby1"].setLevel("speedy.txt").message);
    };
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
    function SessionMap(lobby) {
        this.sessions = {};
        this.clients = {};
        this.lobby = lobby;
        this.nextid = 0;
    }
    SessionMap.prototype.newSession = function (client, data) {
        if (!data.username) {
            client.emit('failed', 'no username');
            return;
        }
        var session_id = UUID();
        var ids = [{ name: data.username, id: this.nextid++ }];
        if (data.multiplayer)
            ids.push({ name: data.username + "(2)", id: this.nextid++ });
        this.sessions[session_id] = { ids: ids, client_id: client.id };
        this.clients[client.id] = session_id;
        client.emit('joined', { ids: this.sessions[session_id].ids, session_id: session_id });
    };
    SessionMap.prototype.removeSession = function (client) {
        var uuid = this.clients[client.id];
        delete this.clients[client.id];
        delete this.sessions[uuid];
    };
    SessionMap.prototype.removeClient = function (client) {
        delete this.clients[client.id];
    };
    SessionMap.prototype.mapSession = function (client, data) {
        //TODO
    };
    SessionMap.prototype.calcJoined = function () {
        var i = 0;
        for (var key in this.sessions) {
            if (!this.sessions.hasOwnProperty(key))
                continue;
            i += this.sessions[key].ids.length;
        }
        return i;
    };
    SessionMap.prototype.verifyId = function (data) {
        if (!data.session_id && !data.id)
            return false;
        if (!this.sessions[data.session_id])
            return false;
        return this.sessions[data.session_id].ids.map(function (x) { return x.id; }).indexOf(data.id) !== -1;
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
    function Lobby(id) {
        this.password = "";
        this.id = id;
        this.session_map = new SessionMap(this);
        this.state = State.Joining;
    }
    Lobby.prototype.join = function (client, data) {
        var that = this;
        if (this.state === State.InProgress) {
            this.session_map.mapSession(client, data);
            return;
        }
        else {
            this.session_map.newSession(client, data);
        }
        client.on('debug', function () {
            //TODO SERIOUSLY REMOVE THIS IN PRODUCTION.
            console.log(JSON.stringify(that.game.entitiesJson()));
        });
        client.on('disconnect', function () {
            if (that.state !== State.Joining) {
                that.session_map.removeClient(client);
            }
            else {
                that.session_map.removeSession(client);
            }
            console.log("Disconnected " + client.id + ", " + that.session_map.calcJoined() + "/" + that.board.metadata.playerAmount);
        });
        client.on('move', function (data) {
            if (that.state !== State.InProgress)
                return;
            if (!that.session_map.verifyId(data)) {
                client.emit('failed', "Incorrect session and id");
                return;
            }
            var id = data.id;
            var direction = Direction.from(data.direction);
            that.game.move(id, direction);
        });
        client.join(this.id);
        console.log("Joined " + client.id + ", " + this.session_map.calcJoined() + "/" + this.board.metadata.playerAmount);
        if (this.session_map.calcJoined() == this.board.metadata.playerAmount) {
            this.loadGame();
            console.log(JSON.stringify(this.session_map.sessions));
        }
    };
    Lobby.prototype.stop = function () {
        clearInterval(this.interval.tick);
        clearInterval(this.interval.update);
        this.state = State.Finished;
    };
    Lobby.prototype.loadGame = function () {
        var that = this;
        if (this.session_map.calcJoined() < 2) {
            return;
        }
        if (util_1.isNullOrUndefined(this.board)) {
            return;
        }
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
        LobbyManager.socket.in(this.id).emit('start', { game: this.game.toJson() });
    };
    Lobby.prototype.setLevel = function (board, players) {
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
            return { success: false, message: "too many players in lobby for this level" };
        }
        return { success: true };
    };
    Lobby.prototype.setPassword = function (password) {
        this.password = password;
    };
    return Lobby;
}());
module.exports = LobbyManager;
//# sourceMappingURL=LobbyManager.js.map