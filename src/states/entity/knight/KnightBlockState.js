import KnightState from "./KnightState.js";
import KnightStateName from "../../../enums/KnightStateName.js";
import { sounds } from "../../../globals.js";

export default class KnightBlockState extends KnightState {
	constructor(knight) {
		super(knight);
	}

	enter() {
		this.knight.isBlocking = true;
		this.knight.blockTimer = this.knight.blockDuration;
		this.knight.currentAnimation = 'defend';
		
		// Play knight block sound
		if (window.gameState && window.gameState.playSFX) {
			window.gameState.playSFX('knightblock', 1.0);
		} else {
			// Fallback if gameState is not available
			sounds.play('knightblock');
		}
		//console.log(`🛡️ Knight is defending!`);
	}

	exit() {
		this.knight.isBlocking = false;
	}

	update(dt, player) {
		this.knight.blockTimer -= dt;
		
		if (this.knight.blockTimer <= 0) {
			// Return to patrol or chase depending on player distance
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
