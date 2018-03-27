import GameMode = require("../../interfaces/GameMode");
import Entity = require("../entities/Entity");
import Game = require("../Game");

class GameModeStandard implements GameMode {
    game: Game;

    constructor(game : Game) {
        this.game = game;

    }
    onTeamCollision(e1: Entity, e2: Entity): boolean {
        return true;
    }

    onEnemyCollision(entity: Entity, other: Entity) : void {
        other.dead = true;
        let entities = Object.keys(this.game.entities).map(k => this.game.entities[k]).filter(e => !e.dead);

        if (entities.length === 0) {
            this.game.end();
            return;
        }

        for (let i = 1; i < entities.length; i++) {
            if (entities[i].team !== entities[0].team) {
                return;
            }
        }
        this.game.end();
    }

}

export = GameModeStandard;