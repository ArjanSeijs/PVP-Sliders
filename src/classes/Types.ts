import ToJson = require("../interfaces/ToJson");

class Types implements ToJson {

    static None = new Types("none");
    static Wall = new Types("wall");
    static Stop = new Types("stop");

    private readonly string;

    /**
     * @constructor
     * @param string
     */
    constructor(string) {
        this.string = string;
    }

    /**
     *
     * @return {string}
     */
    toJson(): string {
        return this.string;
    }
}

export = Types