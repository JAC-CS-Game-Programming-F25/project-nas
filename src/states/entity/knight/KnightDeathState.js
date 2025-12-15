import KnightState from "./KnightState.js";

export default class KnightDeathState extends KnightState {
	constructor(knight) {
		super(knight);
	}

	enter() {
		this.knight.currentAnimation = 'death';
		this.knight.currentFrame = 0;
		this.knight.animationTime = 0;
		
		// Stop running sound when dying
		if (this.knight.runningSound) {
			this.knight.runningSound.pause();
			this.knight.runningSound = null;
		}
		//console.log(`Knight died! Drops ${this.knight.xpDrop} XP`);
	}

	update(dt, player) {
		// Logic for death animation is handled in updateAnimation
	}
}
