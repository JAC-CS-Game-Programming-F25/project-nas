import State from "../../lib/State.js";
import { context, CANVAS_WIDTH, CANVAS_HEIGHT, input, stateMachine, sounds } from "../globals.js";
import GameStateName from "../enums/GameStateName.js";

export default class VictoryState extends State {
	constructor() {
		super();
		this.stats = null;
	}

	enter(params) {
		this.stats = params;
		if (sounds.get('backgroundmusic')) {
			sounds.stop('backgroundmusic');
		}
		// Play victory sound if available
		// sounds.play('victory'); 
	}

	update(dt) {
		if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
			stateMachine.change('mainMenu');
		}
	}

	render() {
		// Background
		context.fillStyle = '#000000';
		context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Victory Text
		context.fillStyle = '#FFD700';
		context.font = 'bold 60px Arial';
		context.textAlign = 'center';
		context.fillText('VICTORY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100);

		// Stats
		if (this.stats) {
			context.fillStyle = '#FFFFFF';
			context.font = '24px Arial';
			context.fillText(`Level Reached: ${this.stats.level}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
			context.fillText(`Enemies Defeated: ${this.stats.kills}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
			
			const minutes = Math.floor(this.stats.time / 60);
			const seconds = Math.floor(this.stats.time % 60);
			context.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
		}

		// Instruction
		context.fillStyle = '#AAAAAA';
		context.font = '18px Arial';
		context.fillText('Press ENTER to return to Main Menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);

		context.textAlign = 'left';
	}
}
