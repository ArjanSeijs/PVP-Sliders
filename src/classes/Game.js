"use strict";
var CollisionManager = require("./CollisionManager");
var GameModeStandard = require("./gamemodes/GameModeStandard");
var State;
(function (State) {
    State[State["NotStarted"] = 0] = "NotStarted";
    State[State["InProgress"] = 1] = "InProgress";
    State[State["Finished"] = 2] = "Finished";
})(State || (State = {}));
var Game = /** @class */ (function () {
    function Game(board) {
        this.board = board;
        this.entities = {};
        this.collisionManager = new CollisionManager(this);
        this.gameMode = new GameModeStandard(this);
        this.state = State.NotStarted;
    }
    Game.prototype.move = function (id, direction) {
        var entity = this.entities[id];
        if (entity) {
            entity.move(direction);
        }
    };
    Game.prototype.gameTick = function (tps) {
        this.collisionManager.collisions(tps);
        for (var key in this.entities) {
            if (!this.entities.hasOwnProperty(key))
                continue;
            var entity = this.entities[key];
            if (entity.dead === true) {
                delete this.entities[key];
            }
        }
        this.collisionManager.movement(tps);
    };
    Game.prototype.end = function (winners) {
        this.state = State.Finished;
        this.winners = winners.length > 0 ? winners[0].team : "";
    };
    Game.prototype.toJson = function () {
        var _this = this;
        return {
            board: this.board,
            entities: Object.keys(this.entities).map(function (x) { return _this.entities[x].toJson(); })
        };
    };
    Game.prototype.entitiesJson = function () {
        var _this = this;
        return Object.keys(this.entities).map(function (x) { return _this.entities[x].toJson(); });
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