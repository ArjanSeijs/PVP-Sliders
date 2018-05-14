"use strict";
var GameModeStandard = (function () {
    function GameModeStandard(game) {
        this.game = game;
    }
    GameModeStandard.prototype.onTeamCollision = function (e1, e2) {
        return true;
    };
    GameModeStandard.prototype.onEnemyCollision = function (entity, other) {
        other.kill();
        this.checkEnd();
    };
    GameModeStandard.prototype.onNewWallCollision = function (entity) {
        entity.kill();
        this.checkEnd();
    };
    GameModeStandard.prototype.checkEnd = function () {
        var _this = this;
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