import Direction = require("../Direction");
import ToJson = require("../../interfaces/ToJson");

class Entity implements ToJson {

    pos: { x: number, y: number };
    direction: { curr: Direction, next: Direction };
    size: number;
    dead: boolean;

    team: string;
    id: number;

    constructor(x: number, y: number, id: number, team: string) {
        this.pos = {x: x, y: y};
        this.direction = {curr: Direction.None, next: Direction.None};
        this.size = 99; //TODO config
        this.dead = false;
        this.id = id;
        this.team = team;
    }

    move(direction: Direction): void {
        if (this.direction.curr === Direction.None && this.direction.next === Direction.None) {
            this.direction = {curr: direction, next: direction};
        }
    }

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

    kill(): void {
        this.dead = true;
    }

    collidesNow(entity: Entity, xPos: number, yPos: number): boolean {
        //TODO SPEED
        let x = this.pos.x;
        let y = this.pos.y;
        return !(x > xPos + entity.size ||
            y > yPos + entity.size ||
            x < xPos - this.size ||
            y < yPos - this.size);
    }

    collides(entity: Entity, xPos: number, yPos: number): boolean {
        //TODO SPEED
        let x = this.pos.x + this.direction.curr.x * 30;
        let y = this.pos.y + this.direction.curr.y * 30;
        return !(x > xPos + entity.size ||
            y > yPos + entity.size ||
            x < xPos - this.size ||
            y < yPos - this.size);
    }


    toJson(): any {
        return {
            pos: this.pos,
            direction: this.direction.curr.toJson(),
            id: this.id,
            team: this.team,
            type: "Entity"
        }
    }

    updateDir() {
        this.direction.curr = this.direction.next;
    }
}
export = Entity