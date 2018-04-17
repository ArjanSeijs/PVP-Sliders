import Game = require("./Game");
import Entity = require("./entities/Entity");
import Direction = require("./Direction");
import Types = require("./Types");
import Tile = require("./Tile");
import * as Logger from 'simple-nodejs-logger';

const logger = Logger("CollisionManager");

class CollisionHandler {
    private game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    collisions(tps: number) {
        const entities = this.game.entities;
        for (let key in entities) {
            if (entities.hasOwnProperty(key)) {
                /** @type Entity */
                let entity = entities[key];
                //TODO Speed
                this.handleCollisions(entity, 30);
            }
        }
    }

    private handleCollisions(entity: Entity, speed: number) {
        const entities = this.game.entities;

        let dir = entity.direction.curr;
        if (dir === Direction.None) return;
        for (let key in entities) {
            if (entities.hasOwnProperty(key)) {
                /** @type Entity */
                let other = entities[key];
                this.collisionCheck(entity, other, speed);
            }
        }
    }

    private collisionCheck(entity: Entity, other: Entity, speed: number) {
        if (entity === other) return;

        let dir = entity.direction.curr;
        //TODO Depends ons TPS
        let newX = entity.pos.x + dir.x * speed;
        let newY = entity.pos.y + dir.y * speed;

        if (other.collides(entity, newX, newY)) {
            if (other.team === entity.team && other.collidesNow(entity, newX, newY)) {
                this.bounce(entity, other, speed);
            } else if (other.team !== entity.team && other.collidesNow(entity, newX, newY)) {
                this.enemyCollision(entity, other);
            }
        }
    }

    private bounce(entity: Entity, other: Entity, speed: number) {
        let bounce = this.game.gameMode.onTeamCollision(entity, other);
        if (!bounce) return;


        if (entity.direction.curr !== other.direction.curr.opposite) {
            entity.stop();
            let diffX = Math.abs(entity.pos.x - other.pos.x);
            let diffY = Math.abs(entity.pos.y - other.pos.y);
            //TODO config
            if (!(Math.abs(diffX - diffY) < 0.2)) {
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

    private enemyCollision(entity: Entity, other: Entity) {
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

        //TODO config
        if (Math.abs(diffX - diffY) < 5) {
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


    movement(tps: number) {
        const entities = this.game.entities;
        for (let key in entities) {
            if (entities.hasOwnProperty(key)) {
                let entity = entities[key];
                //TODO config
                this.handleMove(entity, 30);
            }
        }
    }

    /**
     * @param {Entity} entity
     * @param {Number} speed
     */
    handleMove(entity: Entity, speed: number) {
        entity.updateDir();
        //TODO Depends on TPS
        //TODO Binary search over speed.
        if (this.isFree(entity, speed) && !this.isStop(entity, speed)) {
            let dir = entity.direction.curr;
            entity.pos.x += dir.x * speed;
            entity.pos.y += dir.y * speed;
        } else {
            entity.stop();
        }
    }

    /**
     * Can move
     * @param {Entity} entity
     * @param {number} speed
     * @return {boolean}
     */
    isFree(entity: Entity, speed: number): boolean {
        //TODO config
        let dir = entity.direction.curr;

        //TODO Depends ons TPS
        let newX = entity.pos.x + dir.x * speed;
        let newY = entity.pos.y + dir.y * speed;

        if (!this.inBounds(newX, newY, entity)) return false;
        return this.isFreeAt(entity, speed, newX, newY);

    }

    isFreeAt(entity: Entity, speed: number, newX: number, newY: number): boolean {
        const cellSize = 100;
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

    private isStop(entity: Entity, speed: number): boolean {
        const cellSize = 100;
        let dir = entity.direction.curr;

        //TODO Depends ons TPS
        let newX = entity.pos.x + dir.x * speed;
        let newY = entity.pos.y + dir.y * speed;

        if (!this.inBounds(newX, newY, entity)) return false;
        let tile: Tile = null;
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
     * @param {int} newX
     * @param {int} newY
     * @param {Entity} entity
     * @return {boolean}
     */
    inBounds(newX: number, newY: number, entity: Entity) {
        //TODO config
        const cellSize = 100;
        return newX >= 0 && newY >= 0
            && newX + entity.size < this.game.board.width * cellSize
            && newY + entity.size < this.game.board.height * cellSize;
    }

    indexInBounds(x: number, y: number): boolean {
        return x >= 0 && y >= 0
            && x < this.game.board.width
            && y < this.game.board.height;
    }
}

export = CollisionHandler;