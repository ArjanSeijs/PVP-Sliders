import Entity = require("../classes/entities/Entity");

interface GameMode {
    onTeamCollision(e1: Entity, e2: Entity): boolean;

    onEnemyCollision(entity : Entity, other : Entity)
}

export = GameMode
