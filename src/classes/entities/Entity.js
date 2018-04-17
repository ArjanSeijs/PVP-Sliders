"use strict";
var Direction = require("../Direction");
var Entity = (function () {
    function Entity(x, y, id, team) {
        this.pos = { x: x, y: y };
        this.direction = { curr: Direction.None, next: Direction.None };
        this.size = 99;
        this.dead = false;
        this.id = id;
        this.team = team;
    }
    Entity.prototype.forceMove = function (direction) {
        this.direction = { curr: direction, next: direction };
        this.pos.x += this.direction.curr.x;
        this.pos.y += this.direction.curr.y;
    };
    Entity.prototype.move = function (direction) {
        if (this.direction.curr === Direction.None && this.direction.next === Direction.None) {
            this.forceMove(direction);
        }
    };
    Entity.prototype.stop = function (immediate) {
        this.direction.next = Direction.None;
        if (immediate)
            this.direction.curr = Direction.None;
        var cellSize = 100;
        var x = Math.round(this.pos.x / cellSize) * cellSize;
        var y = Math.round(this.pos.y / cellSize) * cellSize;
        this.pos = {
            x: x,
            y: y
        };
    };
    Entity.prototype.kill = function () {
        this.dead = true;
    };
    Entity.prototype.collidesNow = function (entity, xPos, yPos) {
        var x = this.pos.x;
        var y = this.pos.y;
        return !(x > xPos + entity.size ||
            y > yPos + entity.size ||
            x < xPos - this.size ||
            y < yPos - this.size);
    };
    Entity.prototype.collides = function (entity, xPos, yPos) {
        var x = this.pos.x + this.direction.curr.x * 30;
        var y = this.pos.y + this.direction.curr.y * 30;
        return !(x > xPos + entity.size ||
            y > yPos + entity.size ||
            x < xPos - this.size ||
            y < yPos - this.size);
    };
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
    Entity.prototype.updateDir = function () {
        this.direction.curr = this.direction.next;
    };
    return Entity;
}());
module.exports = Entity;
//# sourceMappingURL=Entity.js.map