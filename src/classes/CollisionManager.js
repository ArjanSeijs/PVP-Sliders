"use strict";
var Direction = require("./Direction");
var Logger = require("simple-nodejs-logger");
var logger = Logger("CollisionManager");
var CollisionHandler = /** @class */ (function () {
    function CollisionHandler(game) {
        this.game = game;
    }
    CollisionHandler.prototype.collisions = function (tps) {
        var entities = this.game.entities;
        for (var key in entities) {
            if (entities.hasOwnProperty(key)) {
                /** @type Entity */
                var entity = entities[key];
                //TODO Speed
                this.handleCollisions(entity, 30);
            }
        }
    };
    CollisionHandler.prototype.handleCollisions = function (entity, speed) {
        var entities = this.game.entities;
        var dir = entity.direction.curr;
        if (dir === Direction.None)
            return;
        for (var key in entities) {
            if (entities.hasOwnProperty(key)) {
                /** @type Entity */
                var other = entities[key];
                this.collisionCheck(entity, other, speed);
            }
        }
    };
    CollisionHandler.prototype.collisionCheck = function (entity, other, speed) {
        if (entity === other)
            return;
        var dir = entity.direction.curr;
        //TODO Depends ons TPS
        var newX = entity.pos.x + dir.x * speed;
        var newY = entity.pos.y + dir.y * speed;
        if (other.collides(entity, newX, newY)) {
            if (other.team === entity.team && other.collidesNow(entity, newX, newY)) {
                this.bounce(entity, other, speed);
            }
            else if (other.team !== entity.team) {
                this.enemyCollision(entity, other);
            }
        }
    };
    CollisionHandler.prototype.bounce = function (entity, other, speed) {
        var bounce = this.game.gameMode.onTeamCollision(entity, other);
        if (!bounce)
            return;
        entity.direction.next = entity.direction.curr.opposite;
        if (entity.direction.curr !== other.direction.curr.opposite) {
            var diffX = Math.abs(entity.pos.x - other.pos.x);
            var diffY = Math.abs(entity.pos.y - other.pos.y);
            //TODO config
            if (!(Math.abs(diffX - diffY) < 0.2)) {
                if (diffX > diffY) {
                    other.pos.y = entity.pos.y;
                }
                else {
                    other.pos.x = entity.pos.x;
                }
                other.direction.next = entity.direction.curr;
            }
        }
    };
    CollisionHandler.prototype.enemyCollision = function (entity, other) {
        logger.log("Collision " + JSON.stringify(entity.toJson()) + " " + JSON.stringify(other.toJson()));
        if (other.direction.curr === Direction.None) {
            this.game.gameMode.onEnemyCollision(entity, other);
            return;
        }
        if (entity.direction.curr === other.direction.curr.opposite) {
            this.game.gameMode.onEnemyCollision(entity, other);
            this.game.gameMode.onEnemyCollision(other, entity);
            return;
        }
        if (entity.direction === other.direction) {
            var dir = entity.direction.curr;
            //This only happens when speeds are not equal.
            if (dir.x * entity.pos.x < dir.x * other.pos.x || dir.y * entity.pos.y < dir.y * other.pos.y) {
                this.game.gameMode.onEnemyCollision(other, entity);
            }
            else {
                this.game.gameMode.onEnemyCollision(entity, other);
            }
            return;
        }
        var diffX = Math.abs(entity.pos.x - other.pos.x);
        var diffY = Math.abs(entity.pos.y - other.pos.y);
        //TODO config
        if (Math.abs(diffX - diffY) < 0.2) {
            this.game.gameMode.onEnemyCollision(other, entity);
            this.game.gameMode.onEnemyCollision(entity, other);
        }
        else if (diffX > diffY && (other.direction.curr === Direction.North || other.direction.curr === Direction.South)) {
            this.game.gameMode.onEnemyCollision(other, entity);
        }
        else if (diffY > diffX && (other.direction.curr === Direction.West || other.direction.curr === Direction.East)) {
            this.game.gameMode.onEnemyCollision(other, entity);
        }
        else {
            // It should never reach this?
            //But ignore in the case it does.
        }
    };
    /* Movement */
    CollisionHandler.prototype.movement = function (tps) {
        var entities = this.game.entities;
        for (var key in entities) {
            if (entities.hasOwnProperty(key)) {
                var entity = entities[key];
                //TODO config
                this.handleMove(entity, 30);
            }
        }
    };
    /**
     * @param {Entity} entity
     * @param {Number} speed
     */
    CollisionHandler.prototype.handleMove = function (entity, speed) {
        entity.updateDir();
        //TODO Depends on TPS
        //TODO Binary search over speed.
        if (this.canMove(entity, speed)) {
            var dir = entity.direction.curr;
            entity.pos.x += dir.x * speed;
            entity.pos.y += dir.y * speed;
        }
        else {
            entity.stop();
        }
    };
    /**
     * Can move
     * @param {Entity} entity
     * @param {number} speed
     * @return {boolean}
     */
    CollisionHandler.prototype.canMove = function (entity, speed) {
        //TODO config
        var cellSize = 100;
        var dir = entity.direction.curr;
        //TODO Depends ons TPS
        var newX = entity.pos.x + dir.x * speed;
        var newY = entity.pos.y + dir.y * speed;
        if (!this.inBounds(newX, newY, entity))
            return false;
        switch (entity.direction.curr) {
            case Direction.North:
            case Direction.West:
                return !this.game.board.getTileAt(Math.floor(newX / cellSize), Math.floor(newY / cellSize)).wall;
            case Direction.East:
                return !this.game.board.getTileAt(Math.floor((newX + entity.size) / cellSize), Math.floor(newY / cellSize)).wall;
            case Direction.South:
                return !this.game.board.getTileAt(Math.floor(newX / cellSize), Math.floor((newY + entity.size) / cellSize)).wall;
            default:
                return true;
        }
    };
    /**
     * @param {int} newX
     * @param {int} newY
     * @param {Entity} entity
     * @return {boolean}
     */
    CollisionHandler.prototype.inBounds = function (newX, newY, entity) {
        //TODO config
        var cellSize = 100;
        return newX >= 0 && newY >= 0
            && newX + entity.size < this.game.board.width * cellSize
            && newY + entity.size < this.game.board.height * cellSize;
    };
    return CollisionHandler;
}());
module.exports = CollisionHandler;
//# sourceMappingURL=CollisionManager.js.map