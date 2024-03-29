import Game = require("./Game");
import Entity = require("./entities/Entity");
import Direction = require("./Direction");
import Types = require("./Types");
import Tile = require("./Tile");
import config = require("../lib/config");


class CollisionHandler {
    private game: Game;

    /**
     * @constructor
     * @param {Game} game
     */
    constructor(game: Game) {
        this.game = game;
    }

    /**
     * Handle all the collisions.
     * @param {number} ms The time in ms since last tick
     * @param interval The goal interval
     */
    collisions(ms: number, interval: number): void {
        const factor = ms / interval;
        const entities = this.game.entities;
        for (let key in entities) {
            if (entities.hasOwnProperty(key)) {
                /** @type Entity */
                let entity = entities[key];
                //TODO Speed
                this.handleCollisions(entity, config.get("speed"), factor);
            }
        }
    }

    /**
     *
     * @param {Entity} entity
     * @param {number} speed
     * @param factor
     */
    private handleCollisions(entity: Entity, speed: number, factor: number): void {
        const entities = this.game.entities;

        let dir = entity.direction.curr;
        if (dir === Direction.None) return;
        for (let key in entities) {
            if (entities.hasOwnProperty(key)) {
                /** @type Entity */
                let other = entities[key];
                this.collisionCheck(entity, other, speed, factor);
            }
        }
    }

    /**
     * If the player is not moving check if the current index is a wall.
     */
    wallCollisions() {
        const entities = this.game.entities;
        const cellSize = config.get("cellSize");
        for (let key in entities) {
            if (entities.hasOwnProperty(key)) {
                let entity = entities[key];
                let x = Math.floor(entity.pos.x / cellSize);
                let y = Math.floor(entity.pos.y / cellSize);
                if (entity.direction.curr === Direction.None && this.game.board.getTileAt(x, y).tile_type === Types.Wall) {
                    this.game.gameMode.onNewWallCollision(entity);
                }
            }
        }
    }

    /**
     *
     * @param {Entity} entity
     * @param {Entity} other
     * @param {number} speed
     * @param factor
     */
    private collisionCheck(entity: Entity, other: Entity, speed: number, factor: number) {
        if (entity === other) return;

        let dir = entity.direction.curr;
        //TODO Depends ons TPS
        let newX = entity.pos.x + dir.x * speed * factor;
        let newY = entity.pos.y + dir.y * speed * factor;

        if (other.collides(entity, newX, newY)) {
            if (other.team === entity.team && other.collidesNow(entity, newX, newY)) {
                this.bounce(entity, other, speed);
            } else if (other.team !== entity.team && other.collidesNow(entity, newX, newY)) {
                this.enemyCollision(entity, other);
            }
        }
    }

    /**
     * Bounce two players of the same team.
     * @param {Entity} entity
     * @param {Entity} other
     * @param {number} speed
     */
    private bounce(entity: Entity, other: Entity, speed: number) {
        let bounce = this.game.gameMode.onTeamCollision(entity, other);
        if (!bounce) return;

        if (entity.direction.curr !== other.direction.curr.opposite) {
            entity.stop();
            let diffX = Math.abs(entity.pos.x - other.pos.x);
            let diffY = Math.abs(entity.pos.y - other.pos.y);
            if (!(Math.abs(diffX - diffY) < config.get("EPSILON"))) {
                if (diffX > diffY) {
                    other.pos.y = entity.pos.y;
                } else {
                    other.pos.x = entity.pos.x;
                }
                other.forceMove(entity.direction.curr);
            }
        } else {
            entity.direction.next = entity.direction.curr.opposite;
        }
    }

    /**
     * Handle collision of two enemies.
     * @param {Entity} entity
     * @param {Entity} other
     */
    private enemyCollision(entity: Entity, other: Entity) {
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
            let dir = entity.direction.curr;
            //This only happens when speeds are not equal.
            if (dir.x * entity.pos.x < dir.x * other.pos.x || dir.y * entity.pos.y < dir.y * other.pos.y) {
                this.game.gameMode.onEnemyCollision(other, entity);
            } else {
                this.game.gameMode.onEnemyCollision(entity, other);
            }
            return;
        }

        let diffX = Math.abs(entity.pos.x - other.pos.x);
        let diffY = Math.abs(entity.pos.y - other.pos.y);

        if (Math.abs(diffX - diffY) < config.get("EPSILON")) {
            this.game.gameMode.onEnemyCollision(other, entity);
            this.game.gameMode.onEnemyCollision(entity, other);
        } else if (diffX > diffY && (other.direction.curr === Direction.North || other.direction.curr === Direction.South)) {
            this.game.gameMode.onEnemyCollision(entity, other);
        } else if (diffY > diffX && (other.direction.curr === Direction.West || other.direction.curr === Direction.East)) {
            this.game.gameMode.onEnemyCollision(entity, other);
        } else {
            // It should never reach this?
            // But ignore in the case it does.
        }
    }

    /* Movement */

    /**
     * Move all the entities.
     * @param {number} ms Time since last interval.
     * @param {number} interval The goal interval.
     */
    movement(ms: number, interval: number) {
        const factor = ms / interval;
        const entities = this.game.entities;
        for (let key in entities) {
            if (entities.hasOwnProperty(key)) {
                let entity = entities[key];
                this.handleMove(entity, config.get("speed"), factor);
            }
        }
    }

    /**
     * Update the position of the entity if it is able to move.
     * @param {Entity} entity
     * @param {Number} speed
     * @param factor
     */
    handleMove(entity: Entity, speed: number, factor: number) {
        entity.updateDir();
        //TODO Depends on TPS
        //TODO Binary search over speed?
        if (this.isFree(entity, speed, factor) && !this.isStop(entity, speed, factor)) {
            let dir = entity.direction.curr;
            entity.pos.x += dir.x * speed * factor;
            entity.pos.y += dir.y * speed * factor;
        } else {
            entity.stop();
        }
    }

    /**
     * Checks if the next position is in bounds and there is no wall.
     * @param {Entity} entity
     * @param {number} speed
     * @param factor
     * @return {boolean}
     */
    isFree(entity: Entity, speed: number, factor: number): boolean {
        let dir = entity.direction.curr;

        //TODO Depends ons TPS
        let newX = entity.pos.x + dir.x * speed * factor;
        let newY = entity.pos.y + dir.y * speed * factor;

        if (!this.inBounds(newX, newY, entity)) return false;
        return this.isFreeAt(entity, speed, newX, newY);

    }

    /**
     * Checks if the next position is a block.
     * @param {Entity} entity
     * @param {number} speed
     * @param {number} newX
     * @param {number} newY
     * @return {boolean}
     */
    isFreeAt(entity: Entity, speed: number, newX: number, newY: number): boolean {
        const cellSize = config.get("cellSize");
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
    }

    /**
     * Checks if the entity will collide with a stop tile.
     * @param {Entity} entity
     * @param {number} speed
     * @param factor
     * @return {boolean}
     */
    private isStop(entity: Entity, speed: number, factor: number): boolean {
        const cellSize = 100;
        let dir = entity.direction.curr;

        //TODO Depends ons TPS
        let newX = entity.pos.x + dir.x * speed * factor;
        let newY = entity.pos.y + dir.y * speed * factor;

        if (!this.inBounds(newX, newY, entity)) return false;
        let tile: Tile = null;
        //TODO make it a lot cleaner.
        switch (entity.direction.curr) {
            case Direction.North: {
                let x = Math.floor(newX / cellSize);
                let y = Math.floor(newY / cellSize) + 1;
                if (!this.indexInBounds(x, y)) return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === Types.Stop && tile.pos.y <= entity.pos.y;
            }
            case Direction.West: {
                let x = Math.floor(newX / cellSize) + 1;
                let y = Math.floor(newY / cellSize);
                if (!this.indexInBounds(x, y)) return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === Types.Stop && tile.pos.x <= entity.pos.x;
            }
            case Direction.East: {
                let x = Math.floor((newX + entity.size) / cellSize) - 1;
                let y = Math.floor(newY / cellSize);
                if (!this.indexInBounds(x, y)) return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === Types.Stop && tile.pos.x >= entity.pos.x;
            }
            case Direction.South: {
                let x = Math.floor(newX / cellSize);
                let y = Math.floor((newY + entity.size) / cellSize) - 1;
                if (!this.indexInBounds(x, y)) return false;
                tile = this.game.board.getTileAt(x, y);
                return tile.tile_type === Types.Stop && tile.pos.y >= entity.pos.y;
            }
        }
        return false;
    }

    /**
     * Checks if the coordinates are in bounds.
     * @param {int} newX
     * @param {int} newY
     * @param {Entity} entity
     * @return {boolean}
     */
    inBounds(newX: number, newY: number, entity: Entity) {
        const cellSize = config.get("cellSize");
        return newX >= 0 && newY >= 0
            && newX + entity.size < this.game.board.width * cellSize
            && newY + entity.size < this.game.board.height * cellSize;
    }

    /**
     * Checks if the tiles are in bounds.
     * @param {number} x
     * @param {number} y
     * @return {boolean}
     */
    indexInBounds(x: number, y: number): boolean {
        return x >= 0 && y >= 0
            && x < this.game.board.width
            && y < this.game.board.height;
    }
}

export = CollisionHandler;