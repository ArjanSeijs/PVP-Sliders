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
var Bot = require("./Bot");
var Direction = require("../Direction");
var SimpleBot = (function (_super) {
    __extends(SimpleBot, _super);
    function SimpleBot() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.dirFrom = Direction.None;
        _this.moveTickCounter = 0;
        return _this;
    }
    SimpleBot.prototype.gameTick = function () {
        _super.prototype.gameTick.call(this);
        if (this.direction.curr !== Direction.None || this.direction.next !== Direction.None)
            return;
        if (this.moveTickCounter < 7) {
            this.moveTickCounter++;
            return;
        }
        this.moveTickCounter = 0;
        var directions = [Direction.South, Direction.East, Direction.North, Direction.West];
        var options = [];
        for (var _i = 0, directions_1 = directions; _i < directions_1.length; _i++) {
            var dir = directions_1[_i];
            var newX = this.pos.x + dir.x;
            var newY = this.pos.y + dir.y;
            if (dir !== this.dirFrom && this.game.collisionManager.isFreeAt(this, 30, newX, newY)) {
                options.push(dir);
            }
        }
        if (options.length === 0) {
            this.move(this.dirFrom.opposite);
            this.dirFrom = this.dirFrom.opposite;
            return;
        }
        var i = Math.floor(Math.random() * options.length);
        this.move(options[i]);
        this.dirFrom = options[i].opposite;
    };
    return SimpleBot;
}(Bot));
module.exports = SimpleBot;
//# sourceMappingURL=SimpleBot.js.map