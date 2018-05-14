import Entity = require("../classes/entities/Entity");

interface GameMode {
    /**
     * This method is called when two entity collides.
     * @param {Entity} e1
     * @param {Entity} e2
     * @return {boolean} Whether the entity should bounce off each other.
     */
    onTeamCollision(e1: Entity, e2: Entity): boolean;

    /**
     * This methd is called when two enemy entity collides.
     * @param {Entity} entity
     * @param {Entity} other
     */
    onEnemyCollision(entity : Entity, other : Entity)

    /**
     * This event is fired when a entity collides when a new wall is placed.
     * @param {Entity} entity
     */
    onNewWallCollision(entity: Entity)
}

export = GameMode
