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

    constructor(board: Board) {
        this.board = board;
        this.entities = {};
        this.collisionManager = new CollisionManager(this);
        this.gameMode = new GameModeStandard(this);
        this.state = State.NotStarted;
    }

    move(id: number, direction: Direction) {
        let entity: Entity = this.entities[id];
        if (entity) {
            entity.move(direction)
        }
    }

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

    end() {
        this.state = State.Finished;
    }

    toJson(): any {
        return {
            board: this.board,
            entities: Object.keys(this.entities).map(x => this.entities[x].toJson())
        }
    }

    entitiesJson(): any {
        return Object.keys(this.entities).map(x => this.entities[x].toJson());
    }

    start(): void {
        this.state = State.InProgress;
    }

    isFinished(): boolean {
        return this.state === State.Finished;
    }
}

export = Game