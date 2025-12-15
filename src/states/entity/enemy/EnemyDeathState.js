import EnemyState from "./EnemyState.js";

export default class EnemyDeathState extends EnemyState {
	constructor(enemy) {
		super(enemy);
	}

	enter() {
		this.enemy.currentAnimation = 'death';
		this.enemy.currentFrame = 0;
		this.enemy.animationTime = 0;
		
		// Stop running sound when dying
		if (this.enemy.runningSound) {
			this.enemy.runningSound.pause();
			this.enemy.runningSound = null;
		}
		//console.log(`Enemy died! Playing death animation. Drops ${this.enemy.xpDrop} XP`);
	}

	update(dt, player) {
		// Logic for death animation is handled in Enemy.updateAnimation
		// We don't need to do anything here, just stay in this state
	}
}
