import State from "../../lib/State.js";
import GameStateName from "../enums/GameStateName.js";
import {
	context,
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	input,
	stateMachine,
	sounds
} from "../globals.js";

export default class GameOverState extends State {
	constructor() {
		super();
		this.stats = null;
	}

	enter(parameters) {
		this.stats = parameters;
		// Ensure sounds are stopped
		if (sounds && sounds.stopAll) {
			sounds.stopAll();
		}
	}

	update(dt) {
		// Press Enter to return to Main Menu
		if (input.isKeyPressed('Enter')) {
			stateMachine.change('mainMenu');
		}
	}

	render() {
		// Draw black background with some transparency
		context.fillStyle = 'rgba(0, 0, 0, 0.8)';
		context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		context.save();
		
		// Game Over Text
		context.font = 'bold 80px Arial';
		context.fillStyle = '#DC143C'; // Crimson
		context.textBaseline = 'middle';
		context.textAlign = 'center';
		context.shadowColor = 'black';
		context.shadowBlur = 10;
		context.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
		
		// Display stats if available
		if (this.stats) {
			context.font = '30px Arial';
			context.fillStyle = 'white';
			context.shadowBlur = 0;
			
			let yOffset = 20;
			
			if (this.stats.level) {
				context.fillText(`Level Reached: ${this.stats.level}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + yOffset);
				yOffset += 40;
			}
			
			if (this.stats.xp !== undefined) {
				context.fillText(`Total XP: ${this.stats.xp}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + yOffset);
				yOffset += 40;
			}
		}

		// Instruction Text
		context.font = '24px Arial';
		context.fillStyle = '#AAAAAA';
		
		// Blinking effect for instruction
		const alpha = Math.abs(Math.sin(Date.now() / 500));
		context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
		
		context.fillText('Press Enter to Return to Menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 100);
		context.restore();
	}
}
