const Assert = require("assert");
const Direction = require("../src/classes/Direction");

require("simple-tests-js").run({
    testEquals() {
        Assert(Direction.South === Direction.North.opposite);
        Assert(Direction.North === Direction.South.opposite);
        Assert(Direction.West === Direction.East.opposite);
        Assert(Direction.East === Direction.West.opposite);
        Assert(Direction.None === Direction.None.opposite);
    }
}, "DirectionTest");