"use strict";
var Direction = require("../Direction");
var Entity = /** @class */ (function () {
    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {number} id
     * @param {string} team
     */
    function Entity(x, y, id, team) {
        this.pos = { x: x, y: y };
        this.direction = { curr: Direction.None, next: Direction.None };
        this.size = 99; //TODO config
        this.dead = false;
        this.id = id;
        this.team = team;
    }
    /**
     *
     * @param {Direction} direction
     */
    Entity.prototype.move = function (direction) {
        if (this.direction.curr === Direction.None && this.direction.next === Direction.None) {
            this.direction = { curr: direction, next: direction };
        }
    };
    /**
     *
     * @param {boolean} immediate
     */
    Entity.prototype.stop = function (immediate) {
        this.direction.next = Direction.None;
        if (immediate)
            this.direction.curr = Direction.None;
        var cellSize = 100; //TODO config.
        var x = Math.round(this.pos.x / cellSize) * cellSize;
        var y = Math.round(this.pos.y / cellSize) * cellSize;
        this.pos = {
            x: x,
            y: y
        };
    };
    /**
     *
     */
    Entity.prototype.kill = function () {
        this.dead = true;
    };
    /**
     *
     * @param {Entity} entity
     * @param {number} xPos
     * @param {number} yPos
     * @return {boolean}
     */
    Entity.prototype.collidesNow = function (entity, xPos, yPos) {
        //TODO SPEED
        var x = this.pos.x;
        var y = this.pos.y;
        return !(x > xPos + entity.size ||
            y > yPos + entity.size ||
            x < xPos - this.size ||
            y < yPos - this.size);
    };
    /**
     *
     * @param {Entity} entity
     * @param {number} xPos
     * @param {number} yPos
     * @return {boolean}
     */
    Entity.prototype.collides = function (entity, xPos, yPos) {
        //TODO SPEED
        var x = this.pos.x + this.direction.curr.x * 30;
        var y = this.pos.y + this.direction.curr.y * 30;
        return !(x > xPos + entity.size ||
            y > yPos + entity.size ||
            x < xPos - this.size ||
            y < yPos - this.size);
    };
    /**
     *
     * @return {any}
     */
    Entity.prototype.toJson = function () {
        return {
            size: this.size,
            pos: this.pos,
            direction: this.direction.curr.toJson(),
            id: this.id,
            team: this.team,
            type: "Entity"
        };
    };
    /**
     *
     */
    Entity.prototype.updateDir = function () {
        this.direction.curr = this.direction.next;
    };
    return Entity;
}());
module.exports = Entity;
//# sourceMappingURL=Entity.js.map