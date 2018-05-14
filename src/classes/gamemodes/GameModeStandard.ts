import GameMode = require("../../interfaces/GameMode");
import Entity = require("../entities/Entity");
import Game = require("../Game");

interface EntityMap {
    [index: number]: Entity
}

class GameModeStandard implements GameMode {
    game: Game;

    /**
     *
     * @param {Game} game
     */
    constructor(game: Game) {
        this.game = game;

    }

    /**
     *
     * @param {Entity} e1
     * @param {Entity} e2
     * @return {boolean}
     */
    onTeamCollision(e1: Entity, e2: Entity): boolean {
        return true;
    }

    /**
     *
     * @param {Entity} entity
     * @param {Entity} other
     */
    onEnemyCollision(entity: Entity, other: Entity): void {
        other.kill();
        this.checkEnd();
    }

    /**
     * @inheritDoc
     * @param {Entity} entity
     */
    onNewWallCollision(entity: Entity) {
        entity.kill();
        this.checkEnd();
    }

    private checkEnd() {
        let entities: Array<Entity> = Object.keys(this.game.entities).map(k => this.game.entities[k]).filter(e => !e.dead);

        if (entities.length === 0) {
            this.game.end(entities);
            return;
        }

        for (let i = 1; i < entities.length; i++) {
            if (entities[i].team !== entities[0].team) {
                return;
            }
        }
        this.game.end(entities);
    }
}

export = GameModeStandard;