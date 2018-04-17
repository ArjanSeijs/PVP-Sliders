"use strict";
var Direction = require("./Direction");
var Types = require("./Types");
var Logger = require("simple-nodejs-logger");
var logger = Logger("CollisionManager");
var CollisionHandler = (function () {
    function CollisionHandler(game) {
        this.game = game;
    }
    CollisionHandler.prototype.collisions = function (tps) {
        var entities = this.game.entities;
        for (var key in entities) {
            if (entities.hasOwnProperty(key)) {
                var entity = entities[key];
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
                var other = entities[key];
                this.collisionCheck(entity, other, speed);
            }
        }
    };
    CollisionHandler.prototype.collisionCheck = function (entity, other, speed) {
        if (entity === other)
            return;
        var dir = entity.direction.curr;
        var newX = entity.pos.x + dir.x * speed;
        var newY = entity.pos.y + dir.y * speed;
        if (other.collides(entity, newX, newY)) {
            if (other.team === entity.team && other.collidesNow(entity, newX, newY)) {
                this.bounce(entity, other, speed);
            }
            else if (other.team !== entity.team && other.collidesNow(entity, newX, newY)) {
                this.enemyCollision(entity, other);
            }
        }
    };
    CollisionHandler.prototype.bounce = function (entity, other, speed) {
        var bounce = this.game.gameMode.onTeamCollision(entity, other);
        if (!bounce)
            return;
        if (entity.direction.curr !== other.direction.curr.opposite) {
            entity.stop();
            var diffX = Math.abs(entity.pos.x - other.pos.x);
            var diffY = Math.abs(entity.pos.y - other.pos.y);
            if (!(Math.abs(diffX - diffY) < 0.2)) {
                if (diffX > diffY) {
                    other.pos.y = entity.pos.y;
                }
                else {
                    other.pos.x = entity.pos.x;
                }
                other.forceMove(entity.direction.curr);
            }
        }
        else {
            entity.direction.next = entity.direction.curr.opposite;
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
        if (Math.abs(diffX - diffY) < 5) {
            this.game.gameMode.onEnemyCollision(other, entity);
            this.game.gameMode.onEnemyCollision(entity, other);
        }
        else if (diffX > diffY && (other.direction.curr === Direction.North || other.direction.curr === Direction.South)) {
            this.game.gameMode.onEnemyCollision(entity, other);
        }
        else if (diffY > diffX && (other.direction.curr === Direction.West || other.direction.curr === Direction.East)) {
            this.game.gameMode.onEnemyCollision(entity, other);
        }
        else {
        }
    };
    CollisionHandler.prototype.movement = function (tps) {
        var entities = this.game.entities;
        for (var key in entities) {
            if (entities.hasOwnProperty(key)) {
                var entity = entities[key];
                this.handleMove(entity, 30);
            }
        }
    };
    CollisionHandler.prototype.handleMove = function (entity, speed) {
        entity.updateDir();
        if (this.isFree(entity, speed) && !this.isStop(entity, speed)) {
            var dir = entity.direction.curr;
            entity.pos.x += dir.x * speed;
            entity.pos.y += dir.y * speed;
        }
        else {
            entity.stop();
        }
    };
    CollisionHandler.prototype.isFree = function (entity, speed) {
        var dir = entity.direction.curr;
        var newX = entity.pos.x + dir.x * speed;
        var newY = entity.pos.y + dir.y * speed;
        if (!this.inBounds(newX, newY, entity))
            return false;
        return this.isFreeAt(entity, speed, newX, newY);
    };
    CollisionHandler.prototype.isFreeAt = function (entity, speed, newX, newY) {
        var cellSize = 100;
        switch (entity.direction.curr) {
            case Direction.North:
            case Direction.West:
                return this.game.board.getTileAt(Math.floor(newX / cellSize), Math.floor(newY / cellSize)).tile_type !== Types.Wall;
            case Direction.East:
                return this.game.board.getTileAt(Math.floor((newX + entity.size) / cellSize), Math.floor(newY / cellSize)).tile_type !== Types.Wall;
            case Direction.South:
                return this.game.board.getTileAt(Math.floor(newX / cellSize), Math.floor((newY + entity.size) / cellSize)).tile_type !== Types.Wall;
            default:
                return true;
        }
    };
    CollisionHandler.prototype.isStop = function (entity, speed) {
        var cellSize = 100;
        var dir = entity.direction.curr;
        var newX = entity.pos.x + dir.x * speed;
        var newY = entity.pos.y + dir.y * speed;
        if (!this.inBounds(newX, newY, entity))
            return false;
        var tile = null;
        switch (entity.direction.curr) {
            case Direction.North: {
                var x = Math.floor(newX / cellSize);
                var y = Math.floor(newY / cellSize) + 1;
                if (!this.indexInBounds(x, y))
                    return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === Types.Stop && tile.pos.y <= entity.pos.y;
            }
            case Direction.West: {
                var x = Math.floor(newX / cellSize) + 1;
                var y = Math.floor(newY / cellSize);
                if (!this.indexInBounds(x, y))
                    return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === Types.Stop && tile.pos.x <= entity.pos.x;
            }
            case Direction.East: {
                var x = Math.floor((newX + entity.size) / cellSize) - 1;
                var y = Math.floor(newY / cellSize);
                if (!this.indexInBounds(x, y))
                    return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === Types.Stop && tile.pos.x >= entity.pos.x;
            }
            case Direction.South: {
                var x = Math.floor(newX / cellSize);
                var y = Math.floor((newY + entity.size) / cellSize) - 1;
                if (!this.indexInBounds(x, y))
                    return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === Types.Stop && tile.pos.y >= entity.pos.y;
            }
        }
        return false;
    };
    CollisionHandler.prototype.inBounds = function (newX, newY, entity) {
        var cellSize = 100;
        return newX >= 0 && newY >= 0
            && newX + entity.size < this.game.board.width * cellSize
            && newY + entity.size < this.game.board.height * cellSize;
    };
    CollisionHandler.prototype.indexInBounds = function (x, y) {
        return x >= 0 && y >= 0
            && x < this.game.board.width
            && y < this.game.board.height;
    };
    return CollisionHandler;
}());
module.exports = CollisionHandler;
//# sourceMappingURL=CollisionManager.js.map