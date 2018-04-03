"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Entity = require("./Entity");
var Player = /** @class */ (function (_super) {
    __extends(Player, _super);
    function Player(x, y, id, team, name) {
        var _this = _super.call(this, x, y, id, team) || this;
        _this.name = name;
        return _this;
    }
    Player.prototype.toJson = function () {
        var x = _super.prototype.toJson.call(this);
        x.name = this.name;
        x.type = "Player";
        return x;
    };
    return Player;
}(Entity));
module.exports = Player;
//# sourceMappingURL=Player.js.map