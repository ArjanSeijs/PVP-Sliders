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
var Player = require("./Player");
var Bot = (function (_super) {
    __extends(Bot, _super);
    function Bot(x, y, id, team, name, game) {
        var _this = _super.call(this, x, y, id, team, name) || this;
        _this.game = game;
        return _this;
    }
    Bot.prototype.gameTick = function () {
        _super.prototype.gameTick.call(this);
    };
    return Bot;
}(Player));
module.exports = Bot;
//# sourceMappingURL=Bot.js.map