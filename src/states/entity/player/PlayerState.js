import State from "../../../../lib/State.js";

export default class PlayerState extends State {
	constructor(player) {
		super();
		this.player = player;
	}
}