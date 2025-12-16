import KnightState from "./KnightState.js";
import KnightStateName from "../../../enums/KnightStateName.js";

export default class KnightHurtState extends KnightState {
	constructor(knight) {
		super(knight);
		this.duration = 0.5;
		this.timer = 0;
	}

	enter() {
		this.knight.isTakingDamage = true;
		this.knight.currentAnimation = 'defend'; // Use defend animation instead of broken hurt sprite
		this.knight.currentFrame = 0;
		this.timer = 0;

		// Force correct dimensions for hurt animation (same as movement/attack)
		this.knight.frameWidth = 72;
		this.knight.frameHeight = 72;
		
		// If stunned, use stun duration
		if (this.knight.isStunned) {
			this.duration = this.knight.stunDuration;
		} else {
			this.duration = 0.5;
		}
	}

	exit() {
		this.knight.isTakingDamage = false;
	}

	update(dt, player) {
		this.timer += dt;

		if (this.timer >= this.duration) {
			if (this.knight.isStunned) {
				this.knight.isStunned = false;
				this.knight.stunTimer = 0;
			}
			
			// Return to patrol or chase
			let distanceToPlayer = Infinity;
			if (player && !player.isDead) {
				distanceToPlayer = Math.sqrt(
					(player.position.x - this.knight.position.x) ** 2 + 
					(player.position.y - this.knight.position.y) ** 2
				);
			}

			if (distanceToPlayer <= this.knight.detectionRange) {
				this.knight.changeState(KnightStateName.Chase, { player: player });
			} else {
				this.knight.changeState(KnightStateName.Patrol);
			}
		}
	}
}
