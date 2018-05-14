"use strict";
var CollisionManager = require("./CollisionManager");
var GameModeStandard = require("./gamemodes/GameModeStandard");
var Direction = require("./Direction");
var State;
(function (State) {
    State[State["NotStarted"] = 0] = "NotStarted";
    State[State["InProgress"] = 1] = "InProgress";
    State[State["Finished"] = 2] = "Finished";
})(State || (State = {}));
var DefaultFillingBehaviour = (function () {
    function DefaultFillingBehaviour(game) {
        this.game = game;
        this.updates = [];
        this.endRowIndex = this.game.board.width - 1;
        this.endColIndex = this.game.board.height - 1;
        this.startRowIndex = 0;
        this.startColIndex = 0;
        this.iter = null;
        this.curDir = Direction.East;
    }
    DefaultFillingBehaviour.prototype.doFillAt = function (y, x) {
        this.updates.push({ x: x, y: y });
    };
    DefaultFillingBehaviour.prototype.doFill = function () {
        if (this.startRowIndex < this.endRowIndex && this.startColIndex < this.endColIndex) {
            switch (this.curDir) {
                case Direction.North:
                    this.doFillNorth();
                    break;
                case Direction.South:
                    this.doFillSouth();
                    break;
                case Direction.West:
                    this.doFillWest();
                    break;
                case Direction.East:
                    this.doFillEast();
                    break;
            }
        }
    };
    DefaultFillingBehaviour.prototype.updateJson = function () {
        return this.updates;
    };
    DefaultFillingBehaviour.prototype.doFillEast = function () {
        if (this.startRowIndex >= this.endRowIndex || this.startColIndex >= this.endColIndex)
            return;
        if (this.iter === null)
            this.iter = this.startColIndex;
        if (this.iter < this.endColIndex) {
            this.doFillAt(this.startRowIndex, this.iter);
            this.iter++;
        }
        else {
            this.startRowIndex++;
            this.iter = null;
            this.curDir = Direction.South;
            this.doFillSouth();
        }
    };
    DefaultFillingBehaviour.prototype.doFillSouth = function () {
        if (this.startRowIndex >= this.endRowIndex || this.startColIndex >= this.endColIndex)
            return;
        if (this.iter === null)
            this.iter = this.startRowIndex;
        if (this.iter < this.endRowIndex) {
            this.doFillAt(this.iter, this.endColIndex - 1);
            this.iter++;
        }
        else {
            this.endColIndex--;
            this.iter = null;
            this.curDir = Direction.West;
            this.doFillWest();
        }
    };
    DefaultFillingBehaviour.prototype.doFillWest = function () {
        if (this.startRowIndex >= this.endRowIndex || this.startColIndex >= this.endColIndex)
            return;
        if (this.startRowIndex < this.endRowIndex) {
            if (this.iter === null)
                this.iter = this.endColIndex - 1;
            if (this.iter >= this.startColIndex) {
                this.doFillAt(this.endRowIndex - 1, this.iter);
                this.iter--;
            }
            else {
                this.endRowIndex--;
                this.iter = null;
                this.curDir = Direction.North;
                this.doFillNorth();
            }
        }
    };
    DefaultFillingBehaviour.prototype.doFillNorth = function () {
        if (this.startRowIndex >= this.endRowIndex || this.startColIndex >= this.endColIndex)
            return;
        if (this.startColIndex < this.endColIndex) {
            if (this.iter === null)
                this.iter = this.endRowIndex - 1;
            if (this.iter >= this.startRowIndex) {
                this.doFillAt(this.iter, this.startColIndex);
                this.iter--;
            }
            else {
                this.startColIndex++;
                this.iter = null;
                this.curDir = Direction.East;
                this.doFillEast();
            }
        }
    };
    return DefaultFillingBehaviour;
}());
var Game = (function () {
    function Game(board) {
        this.board = board;
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
        this.filling = new DefaultFillingBehaviour(this);
    };
    Game.getFillingBehaviour = function (game) {
        return new DefaultFillingBehaviour(game);
    };
    return Game;
}());
module.exports = Game;
//# sourceMappingURL=Game.js.map