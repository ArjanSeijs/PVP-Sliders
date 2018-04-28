"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Test = require("simple-tests-js");
var Assert = require("assert");
var GameParser = require("../src/parsers/GameParser");
Test.run({
    test1: function () {
        var team = GameParser.randomTeam({
            red: 0, green: 0, yellow: 0, blue: 0, random: 0
        }, false, -1, -1);
    },
    test2: function () {
        var team = GameParser.randomTeam({
            red: 2, green: 2, yellow: 2, blue: 1, random: 0
        }, false, -1, -1);
        Assert(team === "blue");
    },
    test3: function () {
        var team = GameParser.randomTeam({
            red: 2, green: 0, yellow: 2, blue: 1, random: 0
        }, false, -1, -1);
        Assert(team === "blue");
    }
}, "TestRandomTeam");
//# sourceMappingURL=TestRandomTeam.js.map