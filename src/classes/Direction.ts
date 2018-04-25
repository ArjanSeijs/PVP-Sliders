import ToJson = require("../interfaces/ToJson");

class Direction implements ToJson {
    static None = new Direction(0, 0, "NONE");
    static North = new Direction(0, -1, "NORTH");
    static South = new Direction(0, 1, "SOUTH");
    static West = new Direction(-1, 0, "WEST");
    static East = new Direction(1, 0, "EAST");

    opposite: Direction;
    x: number;
    y: number;
    string: string;

    /**
     * @constructor
     * @param {number} x
     * @param {number} y
     * @param {string} string
     */
    constructor(x: number, y: number, string: string) {
        this.x = x;
        this.y = y;
        this.string = string;
    }

    /**
     * Checks if the direction is the opposite direction.
     * @param {Direction} direction
     * @return {boolean}
     */
    isOpposite(direction: Direction): boolean {
        return this.opposite === direction;
    }


    /**
     *
     * @return {{x: number, y: number, string: string}}
     */
    toJson(): { x: number, y: number, string: string } {
        return {
            x: this.x,
            y: this.y,
            string: this.string
        }
    }

    /**
     * Gets the direction from a given string.
     * @param {string} direction
     * @return {Direction}
     */
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

    static random(): Direction {
        let dirs = [Direction.West, Direction.East, Direction.North, Direction.South];
        return dirs[Math.floor(Math.random() * dirs.length)];
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