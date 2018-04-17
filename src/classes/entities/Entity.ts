import Direction = require("../Direction");
import ToJson = require("../../interfaces/ToJson");

class Entity implements ToJson {

    pos: { x: number, y: number };
    direction: { curr: Direction, next: Direction };
    size: number;
    dead: boolean;

    team: string;
    id: number;

    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {number} id
     * @param {string} team
     */
    constructor(x: number, y: number, id: number, team: string) {
        this.pos = {x: x, y: y};
        this.direction = {curr: Direction.None, next: Direction.None};
        this.size = 99; //TODO config
        this.dead = false;
        this.id = id;
        this.team = team;
    }

    forceMove(direction: Direction) {
        this.direction = {curr: direction, next: direction};
        //Small fix to move from stop.
        //This may cause the entity to go out of bounds for 1 pixel but this will be automatigily be fixed when
        //it snaps back to the grid in the cycle.
        //So for now this is a valid solution
        this.pos.x += this.direction.curr.x;
        this.pos.y += this.direction.curr.y;
    }

    /**
     *
     * @param {Direction} direction
     */
    move(direction: Direction): void {
        if (this.direction.curr === Direction.None && this.direction.next === Direction.None) {
            this.forceMove(direction);
        }
    }

    /**
     *
     * @param {boolean} immediate
     */
    stop(immediate?: boolean): void {
        this.direction.next = Direction.None;
        if (immediate) this.direction.curr = Direction.None;
        let cellSize = 100; //TODO config.
        let x = Math.round(this.pos.x / cellSize) * cellSize;
        let y = Math.round(this.pos.y / cellSize) * cellSize;
        this.pos = {
            x: x,
            y: y
        }
    }

    /**
     *
     */
    kill(): void {
        this.dead = true;
    }

    /**
     *
     * @param {Entity} entity
     * @param {number} xPos
     * @param {number} yPos
     * @return {boolean}
     */
    collidesNow(entity: Entity, xPos: number, yPos: number): boolean {
        //TODO SPEED
        let x = this.pos.x;
        let y = this.pos.y;
        return !(x > xPos + entity.size ||
            y > yPos + entity.size ||
            x < xPos - this.size ||
            y < yPos - this.size);
    }

    /**
     *
     * @param {Entity} entity
     * @param {number} xPos
     * @param {number} yPos
     * @return {boolean}
     */
    collides(entity: Entity, xPos: number, yPos: number): boolean {
        //TODO SPEED
        let x = this.pos.x + this.direction.curr.x * 30;
        let y = this.pos.y + this.direction.curr.y * 30;
        return !(x > xPos + entity.size ||
            y > yPos + entity.size ||
            x < xPos - this.size ||
            y < yPos - this.size);
    }


    /**
     *
     * @return {any}
     */
    toJson(): any {
        return {
            size: this.size,
            pos: this.pos,
            direction: this.direction.curr.toJson(),
            id: this.id,
            team: this.team,
            type: "Entity"
        }
    }

    /**
     *
     */
    updateDir() {
        this.direction.curr = this.direction.next;
    }
}

export = Entity