import Board = require("./Board");
import CollisionManager = require("./CollisionManager");
import GameModeStandard = require("./gamemodes/GameModeStandard");
import GameMode = require("../interfaces/GameMode");
import Direction = require("./Direction");
import Entity = require("./entities/Entity");
import ToJson = require("../interfaces/ToJson");

interface EntityMap {
    [index: string]: Entity
}

class Game implements ToJson {
    gameMode: GameMode;
    board: Board;
    collisionManager: CollisionManager;
    entities: EntityMap;

    constructor(board: Board) {
        this.board = board;
        this.entities = {};
        this.collisionManager = new CollisionManager(this);
        this.gameMode = new GameModeStandard(this);
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

    }

    toJson(): any {
        return {
            board: this.board,
            entities: Object.keys(this.entities).map(x => this.entities[x].toJson())
        }
    }

    entitiesJson() {
        return Object.keys(this.entities).map(x => this.entities[x].toJson());
    }
}

export = Game