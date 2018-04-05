import ToJson = require("../interfaces/ToJson");

class Direction implements ToJson {
    static None = new Direction(0, 0, "NONE");
    static North = new Direction(0, -1, "NORTH");
    static South = new Direction(0, 1, "SOUTH");
    static West = new Direction(-1, 0, "WEST");
    static East = new Direction(1, 0, "EAST");

    constructor(x: number, y: number, string: string) {
        this.x = x;
        this.y = y;
        this.string = string;
    }


    opposite: Direction;
    x: number;
    y: number;
    string: string;

    isOpposite(direction: Direction): boolean {
        return this.opposite === direction;
    }


    toJson(): { x: number, y: number, string: string } {
        return {
            x: this.x,
            y: this.y,
            string: this.string
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