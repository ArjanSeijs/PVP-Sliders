import * as Test from "simple-tests-js";
import Game = require("../src/classes/Game");

const Assert = require("assert");
const Direction = require("../src/classes/Direction");

function getTileAt() {
    return {};
}

Test.run({
    test1: function () {
        let game = {board: {width: 5, height: 3, getTileAt: getTileAt}};
        let fb = Game.getFillingBehaviour(<any>game);
        for (let i = 0; i < 25; i++) {
            fb.doFill();
        }
        let expected = [
            {x:0,y:0},
            {x:1,y:0},
            {x:2,y:0},
            {x:3,y:0},
            {x:4,y:0},
            {x:4,y:1},
            {x:4,y:2},
            {x:3,y:2},
            {x:2,y:2},
            {x:1,y:2},
            {x:0,y:2},
            {x:0,y:1},
            {x:1,y:1},
            {x:2,y:1},
            {x:3,y:1},
        ];
        let x = fb.updateJson();
        Assert.equal(JSON.stringify(x),JSON.stringify(expected));
    },
    test2: function () {
        let game = {board: {width: 4, height: 5, getTileAt: getTileAt}};
        let fb = Game.getFillingBehaviour(<any>game);
        for (let i = 0; i < 25; i++) {
            fb.doFill();
        }
        let expected = [
            {x:0,y:0},
            {x:1,y:0},
            {x:2,y:0},
            {x:3,y:0},
            {x:3,y:1},
            {x:3,y:2},
            {x:3,y:3},
            {x:3,y:4},
            {x:2,y:4},
            {x:1,y:4},
            {x:0,y:4},
            {x:0,y:3},
            {x:0,y:2},
            {x:0,y:1},
            {x:1,y:1},
            {x:2,y:1},
            {x:2,y:2},
            {x:2,y:3},
            {x:1,y:3},
            {x:1,y:2},

        ];
        let x = fb.updateJson();
        Assert.equal(JSON.stringify(x),JSON.stringify(expected));
    },
    test3: function () {
        let game = {board: {width: 4, height: 5, getTileAt: getTileAt}};
        let fb = Game.getFillingBehaviour(<any>game);
        for (let i = 0; i < 4; i++) {
            fb.doFill();
        }
        let expected = [
            {x:0,y:0},
            {x:1,y:0},
            {x:2,y:0},
            {x:3,y:0}

        ];
        let x = fb.updateJson();
        Assert.equal(JSON.stringify(x),JSON.stringify(expected));
    }
}, "CollisionTest");