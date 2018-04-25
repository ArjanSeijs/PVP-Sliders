import Direction = require("../Direction");
import ToJson = require("../../interfaces/ToJson");

class Entity implements ToJson {

    pos: { x: number, y: number };
    direction: { curr: Direction, next: Direction };
    size: number;
    dead: boolean;

    team: string;
    id: number;

    private lastMove = 0;

    /**
     * @constructor
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

    /**
     * Moves an entity in a given direction.
     * @param {Direction} direction
     */
    forceMove(direction: Direction) {
        this.direction = {curr: direction, next: direction};
        this.lastMove = 0;
        //Small fix to move from stop.
        //This may cause the entity to go out of bounds for 1 pixel but this will be automatigily be fixed when
        //it snaps back to the grid in the cycle.
        //So for now this is a valid solution
        this.pos.x += this.direction.curr.x;
        this.pos.y += this.direction.curr.y;
    }

    /**
     * Moves an entity in an given direction if it is currently not moving.
     * @param {Direction} direction
     */
    move(direction: Direction): void {
        if (this.direction.curr === Direction.None && this.direction.next === Direction.None) {
            this.forceMove(direction);
        }
    }

    /**
     * Stop the entity from moving and snaps it to the grid.
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
     * Kills the entity
     */
    kill(): void {
        this.dead = true;
    }

    /**
     * Checks if an collision occurs on the new location with the other entity
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
     * Checks if an collision in the next step occurs with the other entity.
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
     * @return {*}
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
     * Sets the current direction to the next direction.
     */
    updateDir() {
        this.direction.curr = this.direction.next;
    }

    gameTick() {
        //All childeren should call super.gameTick()
        this.lastMove++;
        if (this.lastMove > 300) {
            this.move(Direction.random());
        }
    }
}

export = Entity