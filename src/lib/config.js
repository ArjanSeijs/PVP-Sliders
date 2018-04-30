const fs = require("fs");
const path = require("path");
let config = {};

/**
 *
 * @param variable
 * @return {*}
 */
module.exports.get = function (variable) {
    //TODO better copy method.
    return JSON.parse(JSON.stringify(config[variable]));
};

/**
 *
 * @param variable
 * @param value
 */
module.exports.set = function (variable, value) {
    config[variable] = value;
};

/**
 *
 */
module.exports.getConfig = function () {
    return config;
};

/**
 *
 */
module.exports.init = function () {
    config = JSON.parse(fs.readFileSync(path.join(global.rootDir, "/src/lib/config.json"), "utf-8"));
};

/**
 *
 */
module.exports.write = function () {
    fs.writeFileSync("./config.json", JSON.stringify(config));
};