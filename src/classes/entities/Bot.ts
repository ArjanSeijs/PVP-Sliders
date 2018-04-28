import Player = require("./Player");

import Game = require("../Game");

abstract class Bot extends Player {

    protected readonly game: Game;

    /**
     * @constructor
     * @param {number} x
     * @param {number} y
     * @param {number} id
     * @param {string} team
     * @param {string} name
     * @param {Game} game
     */
    constructor(x: number, y: number, id: number, team: string, name: string, game: Game) {
        super(x, y, id, team, name);
        this.game = game;
    }

    /**
     * @override
     */
    gameTick() {
        super.gameTick();
    }
}

export = Bot;