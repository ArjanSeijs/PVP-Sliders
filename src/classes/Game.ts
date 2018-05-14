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

interface FillingBehaviour {
    doFill();

    updateJson(): any;
}

class DefaultFillingBehaviour implements FillingBehaviour {
    //Adapted from https://www.geeksforgeeks.org/print-a-given-matrix-in-spiral-form/
    private readonly game: Game;
    private readonly updates: { x: number, y: number }[];

    private endRowIndex: number;
    private endColIndex: number;
    private startRowIndex: number;
    private startColIndex: number;
    private iter: number;
    private curDir: Direction;

    constructor(game: Game) {
        this.game = game;
        this.updates = [];
        this.endRowIndex = this.game.board.width - 1;
        this.endColIndex = this.game.board.height - 1;
        this.startRowIndex = 0;
        this.startColIndex = 0;
        this.iter = null;
        this.curDir = Direction.East;
    }

    doFillAt(y: number, x: number) {
        this.updates.push({x: x, y: y});
    }

    doFill(): void {
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
    }

    updateJson(): any {
        return this.updates;
    }

    private doFillEast() {
        if (this.startRowIndex >= this.endRowIndex || this.startColIndex >= this.endColIndex) return;
        if (this.iter === null) this.iter = this.startColIndex;
        if (this.iter < this.endColIndex) {
            this.doFillAt(this.startRowIndex, this.iter);
            this.iter++;
        } else {
            this.startRowIndex++;
            this.iter = null;
            this.curDir = Direction.South;
            this.doFillSouth();
        }
    }

    private doFillSouth() {
        if (this.startRowIndex >= this.endRowIndex || this.startColIndex >= this.endColIndex) return;
        if (this.iter === null) this.iter = this.startRowIndex;
        if (this.iter < this.endRowIndex) {
            this.doFillAt(this.iter, this.endColIndex - 1);
            this.iter++;
        } else {
            this.endColIndex--;
            this.iter = null;
            this.curDir = Direction.West;
            this.doFillWest();
        }
    }

    private doFillWest() {
        if (this.startRowIndex >= this.endRowIndex || this.startColIndex >= this.endColIndex) return;
        if (this.startRowIndex < this.endRowIndex) {
            if (this.iter === null) this.iter = this.endColIndex - 1;
            if (this.iter >= this.startColIndex) {
                this.doFillAt(this.endRowIndex - 1, this.iter);
                this.iter--;
            } else {
                this.endRowIndex--;
                this.iter = null;
                this.curDir = Direction.North;
                this.doFillNorth();
            }

        }

    }

    private doFillNorth() {
        if (this.startRowIndex >= this.endRowIndex || this.startColIndex >= this.endColIndex) return;
        if (this.startColIndex < this.endColIndex) {
            if (this.iter === null) this.iter = this.endRowIndex - 1;
            if (this.iter >= this.startRowIndex) {
                this.doFillAt(this.iter, this.startColIndex);
                this.iter--;
            } else {
                this.startColIndex++;
                this.iter = null;
                this.curDir = Direction.East;
                this.doFillEast();
            }
        }
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
        this.board = board;
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
        this.filling = new DefaultFillingBehaviour(this);
    }

    static getFillingBehaviour(game: Game): FillingBehaviour {
        return new DefaultFillingBehaviour(game);
    }
}

export = Game