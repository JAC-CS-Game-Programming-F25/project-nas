import EnemyState from "./EnemyState.js";
import EnemyStateName from "../../../enums/EnemyStateName.js";

export default class EnemyHurtState extends EnemyState {
	constructor(enemy) {
		super(enemy);
		this.duration = 0.5;
		this.timer = 0;
	}

	enter(params) {
		this.enemy.currentAnimation = 'hurt';
		this.enemy.currentFrame = 0;
		this.timer = 0;
		
		// If stunned, use stun duration
		if (this.enemy.isStunned) {
			this.duration = this.enemy.stunDuration;
		} else {
			this.duration = 0.5;
		}
	}

	update(dt, player) {
		this.timer += dt;

		if (this.timer >= this.duration) {
			if (this.enemy.isStunned) {
				this.enemy.isStunned = false;
				this.enemy.stunTimer = 0;
				//console.log('Enemy recovered from stun');
			}
			this.enemy.changeState(EnemyStateName.Idle);
		}
	}
}
