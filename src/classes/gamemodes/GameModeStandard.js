"use strict";
var GameModeStandard = /** @class */ (function () {
    /**
     *
     * @param {Game} game
     */
    function GameModeStandard(game) {
        this.game = game;
    }
    /**
     *
     * @param {Entity} e1
     * @param {Entity} e2
     * @return {boolean}
     */
    GameModeStandard.prototype.onTeamCollision = function (e1, e2) {
        return true;
    };
    /**
     *
     * @param {Entity} entity
     * @param {Entity} other
     */
    GameModeStandard.prototype.onEnemyCollision = function (entity, other) {
        var _this = this;
        other.dead = true;
        var entities = Object.keys(this.game.entities).map(function (k) { return _this.game.entities[k]; }).filter(function (e) { return !e.dead; });
        if (entities.length === 0) {
            this.game.end(entities);
            return;
        }
        for (var i = 1; i < entities.length; i++) {
            if (entities[i].team !== entities[0].team) {
                return;
            }
        }
        this.game.end(entities);
    };
    return GameModeStandard;
}());
module.exports = GameModeStandard;
//# sourceMappingURL=GameModeStandard.js.map