"use strict";
var io = require("socket.io");
var GameParser = require("../parsers/GameParser");
var BoardParser = require("../parsers/BoardParser");
var Direction = require("../classes/Direction");
var i = 0;
var LobbyManager = (function () {
    function LobbyManager() {
    }
    LobbyManager.init = function (server) {
        this.socket = io(server);
        this.game = GameParser.create(BoardParser.fromFile("Palooza.txt"), 4);
        this.socket.on('connection', function (client) {
            client.emit("connected", { id: i, game: LobbyManager.game.toJson() });
            i++;
            client.on('move', function (data) {
                //TODO check session etc.
                var id = data.id;
                var direction = Direction.from(data.direction);
                LobbyManager.game.move(id, direction);
            });
        });
        //Game tick rate TODO config
        setInterval(function () {
            LobbyManager.game.gameTick(-1);
        }, 15);
        //Update interval TODO config
        setInterval(function () {
            LobbyManager.socket.emit("update", LobbyManager.game.entitiesJson());
        }, 15);
    };
    return LobbyManager;
}());
var Lobby = (function () {
    function Lobby() {
    }
    return Lobby;
}());
module.exports = LobbyManager;
