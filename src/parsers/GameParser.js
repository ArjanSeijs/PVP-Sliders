"use strict";
var Game = require("../classes/Game");
var Player = require("../classes/entities/Player");
var SimpleBot = require("../classes/entities/SimpleBot");
var config = require("../lib/config");
var util_1 = require("util");
var GameParser = (function () {
    function GameParser() {
    }
    GameParser.create = function (board, players, sessions, options) {
        var cellSize = 100;
        var game = new Game(board);
        var i = 0;
        var maxId = -1;
        var teams = GameParser.teamSizes(sessions);
        if (board.metadata.playerAmount < players)
            return null;
        for (var key in sessions) {
            if (!sessions.hasOwnProperty(key))
                continue;
            for (var _i = 0, _a = sessions[key].ids; _i < _a.length; _i++) {
                var session = _a[_i];
                var pos = board.metadata.mapData[i];
                if (util_1.isNullOrUndefined(pos))
                    return null;
                var team = session.team !== "random" ? session.team : GameParser.randomTeam(teams, false, i, players);
                game.entities[i] = new Player(pos.x * cellSize, pos.y * cellSize, session.id, team, session.name);
                if (session.id > maxId)
                    maxId = session.id;
                i++;
            }
        }
        if (options.bots) {
            teams.random += board.metadata.playerAmount - i;
            for (; i < board.metadata.playerAmount; i++) {
                var pos = board.metadata.mapData[i];
                game.entities[i] = new SimpleBot(pos.x * cellSize, pos.y * cellSize, maxId++, GameParser.randomTeam(teams, true, i, players), "BOT", game);
            }
        }
        return game;
    };
    GameParser.randomTeam = function (_teams, isBot, i, max) {
        var allTeams = config.get("teams");
        var filteredTeams = GameParser.mapTeams(allTeams, _teams);
        filteredTeams = filteredTeams.filter(function (t) { return t.amount !== 0; });
        if (filteredTeams.length === 1 || filteredTeams.length === 0) {
            if (filteredTeams.length === 1) {
                allTeams.splice(allTeams.indexOf(filteredTeams[0].team), 1);
            }
            var result = allTeams[Math.floor(Math.random() * allTeams.length)];
            _teams[result]++;
            _teams.random--;
            return result;
        }
        else {
            var result = filteredTeams[0].team;
            _teams[result]++;
            _teams.random--;
            return result;
        }
    };
    GameParser.mapTeams = function (allTeams, _teams) {
        return allTeams.map(function (k) {
            return { team: k, amount: _teams[k] };
        }).sort(function (a, b) { return a.amount - b.amount; });
    };
    GameParser.teamSizes = function (sessions) {
        var teams = { random: 0 };
        for (var _i = 0, _a = config.get("teams"); _i < _a.length; _i++) {
            var team = _a[_i];
            teams[team] = 0;
        }
        for (var key in sessions) {
            if (!sessions.hasOwnProperty(key))
                continue;
            for (var _b = 0, _c = sessions[key].ids; _b < _c.length; _b++) {
                var session = _c[_b];
                teams[session.team]++;
            }
        }
        return teams;
    };
    return GameParser;
}());
module.exports = GameParser;
//# sourceMappingURL=GameParser.js.map