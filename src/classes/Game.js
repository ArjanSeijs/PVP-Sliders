"use strict";
var CollisionManager = require("./CollisionManager");
var GameModeStandard = require("./gamemodes/GameModeStandard");
var Types = require("./Types");
var config = require("../lib/config");
var State;
(function (State) {
    State[State["NotStarted"] = 0] = "NotStarted";
    State[State["InProgress"] = 1] = "InProgress";
    State[State["Finished"] = 2] = "Finished";
})(State || (State = {}));
var DefaultFillingBehaviour = (function () {
    function DefaultFillingBehaviour(game) {
        this.game = game;
        this.updateIndex = 0;
        this.updates = [];
        this.list = [];
        this.generateSpiral(this.game.board.height, this.game.board.width);
        this.counter = 0;
    }
    DefaultFillingBehaviour.prototype.doFill = function () {
        if (this.updateIndex < this.list.length) {
            if (this.counter === 0) {
                var pos = this.list[this.updateIndex];
                this.game.board.getTileAt(pos.x, pos.y).tile_type = Types.Wall;
                this.updates.push(pos);
                this.updateIndex++;
            }
            this.counter = (this.counter + 1) % config.get("removeInterval");
        }
    };
    DefaultFillingBehaviour.prototype.generateSpiral = function (endRowIndex, endColIndex) {
        var iter, startRowIndex = 0, startColIndex = 0;
        while (startRowIndex < endRowIndex && startColIndex < endColIndex) {
            for (iter = startColIndex; iter < endColIndex; ++iter) {
                this.list.push({ x: iter, y: startRowIndex });
            }
            startRowIndex++;
            for (iter = startRowIndex; iter < endRowIndex; ++iter) {
                this.list.push({ x: endColIndex - 1, y: iter });
            }
            endColIndex--;
            if (startRowIndex < endRowIndex) {
                for (iter = endColIndex - 1; iter >= startColIndex; --iter) {
                    this.list.push({ x: iter, y: endRowIndex - 1 });
                }
                endRowIndex--;
            }
            if (startColIndex < endColIndex) {
                for (iter = endRowIndex - 1; iter >= startRowIndex; --iter) {
                    this.list.push({ x: startColIndex, y: iter });
                }
                startColIndex++;
            }
        }
    };
    DefaultFillingBehaviour.prototype.updateJson = function () {
        return this.updates;
    };
    return DefaultFillingBehaviour;
}());
var Game = (function () {
    function Game(board) {
        this.board = board.clone();
        this.entities = {};
        this.collisionManager = new CollisionManager(this);
        this.gameMode = new GameModeStandard(this);
        this.state = State.NotStarted;
        this.filling = null;
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
        if (this.filling)
            this.filling.doFill();
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
        this.collisionManager.wallCollisions();
        for (var key in this.entities) {
            if (!this.entities.hasOwnProperty(key))
                continue;
            var entity = this.entities[key];
            if (entity.dead === true) {
                delete this.entities[key];
            }
        }
    };
    Game.prototype.end = function (winners) {
        this.state = State.Finished;
        this.winners = winners.map(function (e) { return e.toJson(); });
    };
    Game.prototype.toJson = function () {
        return {
            board: this.board.toJson(),
            entities: this.entitiesJson(),
            fillingUpdates: this.filling ? this.filling.updateJson() : null
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
    Game.prototype.initFill = function () {
        if (!this.filling)
            this.filling = new DefaultFillingBehaviour(this);
    };
    Game.getFillingBehaviour = function (game) {
        return new DefaultFillingBehaviour(game);
    };
    return Game;
}());
module.exports = Game;
//# sourceMappingURL=Game.js.map