import Game = require("../src/classes/Game");
import BoardParser = require("../src/parsers/BoardParser");
import Player = require("../src/classes/entities/Player");
import * as Test from "simple-tests-js";


const Assert = require("assert");
const Direction = require("../src/classes/Direction");

function repeatTicks(amount: number, game: Game) {
    for (let i = 0; i < amount; i++) {
        game.gameTick(-1);
    }
}

Test.run({
    test1: function () {
        console.log("test1");
        let strings = ["0...", "....", "....", "...1"];
        let game = new Game(BoardParser.fromStrings(strings));
        let player1 = new Player(0, 0, 0, "red", "p1");
        let player2 = new Player(300, 300, 0, "yellow", "p1");

        game.entities[0] = player1;
        game.entities[1] = player2;

        game.move(0, Direction.South);
        game.move(1, Direction.West);

        Assert(game.entities[0] !== undefined, "0 should be defined");
        Assert(game.entities[1] !== undefined, "1 should be defined");

        repeatTicks(9, game);

        Assert(game.entities[0] === undefined, "0 should be undefined" + game.entities[0]);
        Assert(game.entities[1] === undefined, "1 should be undefined");
    },
    test2: function () {
        console.log("test2");
        let strings = ["0...", ".1..", "....", "...."];
        let game = new Game(BoardParser.fromStrings(strings));
        let player1 = new Player(0, 0, 0, "red", "p1");
        let player2 = new Player(100, 100, 0, "yellow", "p1");

        game.entities[0] = player1;
        game.entities[1] = player2;

        game.move(0, Direction.South);
        repeatTicks(1, game);
        game.move(1, Direction.West);

        Assert(game.entities[0] !== undefined, "0 should be defined");
        Assert(game.entities[1] !== undefined, "1 should be defined");

        repeatTicks(9, game);

        Assert(game.entities[0] === undefined, "0 should be undefined but was" + game.entities[0]);
        Assert(game.entities[1] !== undefined, "1 should be defined");
    },
    test3: function () {
        console.log("test3");
        let strings = ["0...", ".1..", "....", "...."];
        let game = new Game(BoardParser.fromStrings(strings));
        let player1 = new Player(0, 0, 0, "red", "p1");
        let player2 = new Player(100, 100, 0, "yellow", "p1");

        game.entities[0] = player1;
        game.entities[1] = player2;

        game.move(1, Direction.West);
        repeatTicks(1, game);
        game.move(0, Direction.South);

        Assert(game.entities[0] !== undefined, "0 should be defined");
        Assert(game.entities[1] !== undefined, "1 should be defined");

        repeatTicks(9, game);

        Assert(game.entities[0] !== undefined, "0 should be undefined but was" + game.entities[0]);
        Assert(game.entities[1] === undefined, "1 should be defined");
    }
}, "CollisionTest");