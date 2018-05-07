import Board = require("./Board");
import CollisionManager = require("./CollisionManager");
import GameModeStandard = require("./gamemodes/GameModeStandard");
import GameMode = require("../interfaces/GameMode");
import Direction = require("./Direction");
import Entity = require("./entities/Entity");
import ToJson = require("../interfaces/ToJson");

interface EntityMap {
    [index: number]: Entity
}

enum State {
    NotStarted, InProgress, Finished

}

class Game implements ToJson {
    gameMode: GameMode;
    board: Board;
    collisionManager: CollisionManager;
    entities: EntityMap;
    state: State;
    winners: Entity[];

    /**
     * @constructor
     * @param {Board} board
     */
    constructor(board: Board) {
        this.board = board;
        this.entities = {};
        this.collisionManager = new CollisionManager(this);
        this.gameMode = new GameModeStandard(this);
        this.state = State.NotStarted;
    }

    /**
     * Moves an entity if the entity exists.
     * @param {number} id
     * @param {Direction} direction
     */
    move(id: number, direction: Direction) {
        for(let key in this.entities) {
            if(!this.entities.hasOwnProperty(key)) continue;
            let entity: Entity = this.entities[key];
            if(entity.id === id) {
                entity.move(direction)
            }
        }
    }

    /**
     *
     * @param {number} ms The amount of ms since last tick.
     * @param {number} interval The goal interval.
     */
    gameTick(ms: number, interval: number) {
        this.collisionManager.collisions(ms, interval);

        for (let key in this.entities) {
            if (!this.entities.hasOwnProperty(key)) continue;

            let entity: Entity = this.entities[key];
            if (entity.dead === true) {
                delete this.entities[key];
            }

            entity.gameTick();
        }

        this.collisionManager.movement(ms, interval);
    }

    /**
     *
     * @param {Array<Entity>} winners
     */
    end(winners: Array<Entity>): void {
        this.state = State.Finished;
        this.winners = winners.map(e => e.toJson());
    }

    /**
     *
     * @return {*}
     */
    toJson(): any {
        return {
            board: this.board.toJson(),
            entities: this.entitiesJson()
        }
    }

    /**
     * Converts the entity map to an entity json map.
     * @return {*}
     */
    entitiesJson(): any {
        let x = {};
        for (let key in this.entities) {
            if (!this.entities.hasOwnProperty(key)) continue;
            x[key] = this.entities[key].toJson();
        }
        return x;
        // return Object.keys(this.entities).map(x => this.entities[x].toJson());
    }

    /**
     * Starts the game.
     */
    start(): void {
        this.state = State.InProgress;
    }

    /**
     * Checks wheter the game has ended.
     * @return {boolean}
     */
    isFinished(): boolean {
        return this.state === State.Finished;
    }
}

export = Game