"use strict";
var CollisionManager = require("./CollisionManager");
var GameModeStandard = require("./gamemodes/GameModeStandard");
var State;
(function (State) {
    State[State["NotStarted"] = 0] = "NotStarted";
    State[State["InProgress"] = 1] = "InProgress";
    State[State["Finished"] = 2] = "Finished";
})(State || (State = {}));
var Game = (function () {
    function Game(board) {
        this.board = board;
        this.entities = {};
        this.collisionManager = new CollisionManager(this);
        this.gameMode = new GameModeStandard(this);
        this.state = State.NotStarted;
    }
    Game.prototype.move = function (id, direction) {
        for (var key in this.entities) {
            if (!this.entities.hasOwnProperty(key))
                continue;
            var entity = this.entities[key];
            if (entity.id === id) {
                entity.move(direction);
            }
        }
    };
    Game.prototype.gameTick = function (ms, interval) {
        this.collisionManager.collisions(ms, interval);
        for (var key in this.entities) {
            if (!this.entities.hasOwnProperty(key))
                continue;
            var entity = this.entities[key];
            if (entity.dead === true) {
                delete this.entities[key];
            }
            entity.gameTick();
        }
        this.collisionManager.movement(ms, interval);
    };
    Game.prototype.end = function (winners) {
        this.state = State.Finished;
        this.winners = winners.map(function (e) { return e.toJson(); });
    };
    Game.prototype.toJson = function () {
        return {
            board: this.board.toJson(),
            entities: this.entitiesJson()
        };
    };
    Game.prototype.entitiesJson = function () {
        var x = {};
        for (var key in this.entities) {
            if (!this.entities.hasOwnProperty(key))
                continue;
            x[key] = this.entities[key].toJson();
        }
        return x;
    };
    Game.prototype.start = function () {
        this.state = State.InProgress;
    };
    Game.prototype.isFinished = function () {
        return this.state === State.Finished;
    };
    return Game;
}());
module.exports = Game;
//# sourceMappingURL=Game.js.map