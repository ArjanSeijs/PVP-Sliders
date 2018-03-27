import Entity = require("./Entity");

class Player extends Entity {
    name: String;

    constructor(x: number, y: number, id: number, team: string) {
        super(x, y, id, team);
    }


    toJson(): any {
        let x : any = super.toJson();
        x.name = this.name;
        x.type = "Player";
        return x;
    }
}

export = Player;