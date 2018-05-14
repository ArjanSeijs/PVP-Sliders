import Board = require("./Board");
import CollisionManager = require("./CollisionManager");
import GameModeStandard = require("./gamemodes/GameModeStandard");
import GameMode = require("../interfaces/GameMode");
import Direction = require("./Direction");
import Entity = require("./entities/Entity");
import ToJson = require("../interfaces/ToJson");
import Types = require("./Types");
import config = require("../lib/config");


interface EntityMap {
    [index: number]: Entity
}

enum State {
    NotStarted, InProgress, Finished
}

interface FillingBehaviour {
    doFill();

    updateJson(): any;
}

class DefaultFillingBehaviour implements FillingBehaviour {
    //Adapted from https://www.geeksforgeeks.org/print-a-given-matrix-in-spiral-form/
    private readonly game: Game;
    private readonly updates: { x: number, y: number }[];
    private updateIndex: number;
    private readonly list: { x: number, y: number }[];
    private counter: number;

    constructor(game: Game) {
        this.game = game;
        this.updateIndex = 0;
        this.updates = [];
        this.list = [];
        this.generateSpiral(this.game.board.height, this.game.board.width);
        this.counter = 0;
    }

    doFill(): void {
        if (this.updateIndex < this.list.length) {
            if (this.counter === 0) {
                let pos = this.list[this.updateIndex];
                this.game.board.getTileAt(pos.x, pos.y).tile_type = Types.Wall;
                this.updates.push(pos);
                this.updateIndex++;
            }
            this.counter = (this.counter + 1) % config.get("removeInterval")
        }
    }

    generateSpiral(endRowIndex: number, endColIndex: number) {
        let iter, startRowIndex = 0, startColIndex = 0;
        /*  startRowIndex - starting row index
        endRowIndex - ending row index
        startColIndex - starting column index
        endColIndex - ending column index
        iter - iterator
        */

        while (startRowIndex < endRowIndex && startColIndex < endColIndex) {
            for (iter = startColIndex; iter < endColIndex; ++iter) {
                this.list.push({x: iter, y: startRowIndex});
            }
            startRowIndex++;

            for (iter = startRowIndex; iter < endRowIndex; ++iter) {
                this.list.push({x: endColIndex - 1, y: iter});
            }
            endColIndex--;

            if (startRowIndex < endRowIndex) {
                for (iter = endColIndex - 1; iter >= startColIndex; --iter) {
                    this.list.push({x: iter, y: endRowIndex - 1});
                }
                endRowIndex--;
            }

            if (startColIndex < endColIndex) {
                for (iter = endRowIndex - 1; iter >= startRowIndex; --iter) {
                    this.list.push({x: startColIndex, y: iter});
                }
                startColIndex++;
            }
        }
    }

    updateJson(): any {
        return this.updates;
    }
}

class Game implements ToJson {

    gameMode: GameMode;
    board: Board;
    collisionManager: CollisionManager;
    entities: EntityMap;
    state: State;
    winners: Entity[];
    filling: FillingBehaviour;

    /**
     * @constructor
     * @param {Board} board
     */
    constructor(board: Board) {
        this.board = board.clone();
        this.entities = {};
        this.collisionManager = new CollisionManager(this);
        this.gameMode = new GameModeStandard(this);
        this.state = State.NotStarted;
        this.filling = null;
    }

    /**
     * Moves an entity if the entity exists.
     * @param {number} id
     * @param {Direction} direction
     */
    move(id: number, direction: Direction) {
        for (let key in this.entities) {
            if (!this.entities.hasOwnProperty(key)) continue;
            let entity: Entity = this.entities[key];
            if (entity.id === id) {
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
        if (this.filling) this.filling.doFill();

        for (let key in this.entities) {
            if (!this.entities.hasOwnProperty(key)) continue;

            let entity: Entity = this.entities[key];
            if (entity.dead === true) {
                delete this.entities[key];
            }

            entity.gameTick();
        }

        this.collisionManager.movement(ms, interval);
        this.collisionManager.wallCollisions();

        for (let key in this.entities) {
            if (!this.entities.hasOwnProperty(key)) continue;

            let entity: Entity = this.entities[key];
            if (entity.dead === true) {
                delete this.entities[key];
            }
        }
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
            entities: this.entitiesJson(),
            fillingUpdates: this.filling ? this.filling.updateJson() : null
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

    /**
     * Initialize the process of filling the board with walls from the outside.
     * When you collide when one is placed you die.
     */
    initFill() {
        if (!this.filling) this.filling = new DefaultFillingBehaviour(this);
    }

    static getFillingBehaviour(game: Game): FillingBehaviour {
        return new DefaultFillingBehaviour(game);
    }
}

export = Game