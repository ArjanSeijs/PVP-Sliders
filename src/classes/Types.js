"use strict";
var Types = (function () {
    function Types(string) {
        this.string = string;
    }
    Types.prototype.toJson = function () {
        return this.string;
    };
    Types.None = new Types("none");
    Types.Wall = new Types("wall");
    Types.Stop = new Types("stop");
    return Types;
}());
module.exports = Types;
//# sourceMappingURL=Types.js.map