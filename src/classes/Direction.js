"use strict";
var Direction = (function () {
    function Direction(x, y) {
        this.x = x;
        this.y = y;
    }
    Direction.prototype.isOpposite = function (direction) {
        return this.opposite === direction;
    };
    Direction.prototype.toJson = function () {
        return {
            x: this.x,
            y: this.y
        };
    };
    Direction.from = function (direction) {
        switch (direction) {
            case "NORTH":
                return Direction.North;
            case "SOUTH":
                return Direction.South;
            case "WEST":
                return Direction.West;
            case "EAST":
                return Direction.East;
            default:
                return Direction.None;
        }
    };
    Direction.None = new Direction(0, 0);
    Direction.North = new Direction(0, -1);
    Direction.South = new Direction(0, 1);
    Direction.West = new Direction(-1, 0);
    Direction.East = new Direction(1, 0);
    return Direction;
}());
(function () {
    Direction.None.opposite = Direction.None;
    Direction.South.opposite = Direction.North;
    Direction.North.opposite = Direction.South;
    Direction.East.opposite = Direction.West;
    Direction.West.opposite = Direction.East;
})();
module.exports = Direction;
