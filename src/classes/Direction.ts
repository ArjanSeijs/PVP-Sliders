import ToJson = require("../interfaces/ToJson");

class Direction implements ToJson {
    static None = new Direction(0, 0);
    static North = new Direction(0, -1);
    static South = new Direction(0, 1);
    static West = new Direction(-1, 0);
    static East = new Direction(1, 0);

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }


    opposite: Direction;
    x: number;
    y: number;

    isOpposite(direction: Direction): boolean {
        return this.opposite === direction;
    }


    toJson(): { x: number, y: number } {
        return {
            x: this.x,
            y: this.y
        }
    }

    static from(direction: string): Direction {
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
    }
}

(function () {
    Direction.None.opposite = Direction.None;
    Direction.South.opposite = Direction.North;
    Direction.North.opposite = Direction.South;
    Direction.East.opposite = Direction.West;
    Direction.West.opposite = Direction.East;
})();

export = Direction;