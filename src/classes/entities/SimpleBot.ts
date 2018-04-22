import Bot = require("./Bot");
import Direction = require("../Direction");

class SimpleBot extends Bot {

    private dirFrom : Direction = Direction.None;
    private moveTickCounter = 0;
    /**
     * @override
     */
    gameTick() {
        super.gameTick();
        if (this.direction.curr !== Direction.None || this.direction.next !== Direction.None) return;
        if(this.moveTickCounter < 7) {
            this.moveTickCounter++;
            return;
        }
        this.moveTickCounter = 0;

        let directions = [Direction.South, Direction.East, Direction.North, Direction.West];
        let options: Direction[] = [];

        for (let dir of directions) {
            let newX = this.pos.x + dir.x;
            let newY = this.pos.y + dir.y;
            if (dir !== this.dirFrom && this.game.collisionManager.isFreeAt(this, 30, newX, newY)) {
                options.push(dir);
            }
        }
        if (options.length === 0) {
            this.move(this.dirFrom.opposite);
            this.dirFrom = this.dirFrom.opposite;
            return;
        }
        let i = Math.floor(Math.random() * options.length);
        this.move(options[i]);
        this.dirFrom = options[i].opposite;
    }
}

export = SimpleBot;