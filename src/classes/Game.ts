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
    winners: string;

    /**
     *
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
     *
     * @param {number} id
     * @param {Direction} direction
     */
    move(id: number, direction: Direction) {
        let entity: Entity = this.entities[id.toString()];
        if (entity) {
            entity.move(direction)
        }
    }

    /**
     *
     * @param {number} tps
     */
    gameTick(tps: number) {
        this.collisionManager.collisions(tps);

        for (let key in this.entities) {
            if (!this.entities.hasOwnProperty(key)) continue;

            let entity: Entity = this.entities[key];
            if (entity.dead === true) {
                delete this.entities[key];
            }
        }

        this.collisionManager.movement(tps);
    }

    end(winners: Array<Entity>): void {
        this.state = State.Finished;
        this.winners = winners.length > 0 ? winners[0].team : "";
    }

    toJson(): any {
        return {
            board: this.board,
            entities: this.entitiesJson()
        }
    }

    entitiesJson(): any {
        let x = {};
        for (let key in this.entities) {
            if (!this.entities.hasOwnProperty(key)) continue;
            x[key] = this.entities[key].toJson();
        }
        return x;
        // return Object.keys(this.entities).map(x => this.entities[x].toJson());
    }

    start(): void {
        this.state = State.InProgress;
    }

    isFinished(): boolean {
        return this.state === State.Finished;
    }
}

export = Game