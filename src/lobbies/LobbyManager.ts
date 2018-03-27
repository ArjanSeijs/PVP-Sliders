import * as io from "socket.io"
import Game = require("../classes/Game");
import GameParser = require("../parsers/GameParser");
import BoardParser = require("../parsers/BoardParser");
import Direction = require("../classes/Direction");

let i = 0;

class LobbyManager {
    static socket: io;
    static game: Game;

    static init(server): void {
        this.socket = io(server);
        this.game = GameParser.create(BoardParser.fromFile("Palooza.txt"), 4);
        this.socket.on('connection', function (client) {
            client.emit("connected", {id: i, game: LobbyManager.game.toJson()});
            i++;
            client.on('move', function (data) {
                //TODO check session etc.
                let id = data.id;
                let direction = Direction.from(data.direction);
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
        }, 15)
    }
}

class Lobby {

}

export = LobbyManager;