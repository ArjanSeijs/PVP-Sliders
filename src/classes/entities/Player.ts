import Entity = require("./Entity");

class Player extends Entity {
    name: string;

    /**
     * @constructor
     * @param {number} x
     * @param {number} y
     * @param {number} id
     * @param {string} team
     * @param {string} name
     */
    constructor(x: number, y: number, id: number, team: string, name : string) {
        super(x, y, id, team);
        this.name = name;
    }

    /**
     *
     * @return {*}
     */
    toJson(): any {
        let x : any = super.toJson();
        x.name = this.name;
        x.type = "Player";
        return x;
    }
}

export = Player;