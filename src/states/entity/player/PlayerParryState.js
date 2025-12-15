import PlayerState from "./PlayerState.js";
import PlayerStateName from "../../../enums/PlayerStateName.js";

export default class PlayerParryState extends PlayerState {
	constructor(player) {
		super(player);
	}

	enter() {
		this.player.isParrying = true;
		this.player.parryTimer = 0;
		this.player.parryCooldownTimer = this.player.parryCooldown;
		this.player.attackType = 2; // Use attack2 animation
		this.player.currentAttackFrame = 0;
		this.player.attackFrameTimer = 0;
		//console.log('Player started parry with attack2 animation!');
	}

	exit() {
		this.player.isParrying = false;
		this.player.attackType = 1; // Reset to normal attack
	}

	update(dt) {
		this.player.parryTimer += dt;
		this.player.attackFrameTimer += dt;
		
		// Update parry animation frames
		if (this.player.attackFrameTimer >= this.player.attackAnimationSpeed) {
			this.player.currentAttackFrame = (this.player.currentAttackFrame + 1) % 8;
			this.player.attackFrameTimer = 0;
		}
		
		// End parry when duration is reached
		if (this.player.parryTimer >= this.player.parryDuration) {
			// Check if parry was successful by looking for any stunned enemies nearby
			let parrySuccessful = false;
			if (window.gameState && window.gameState.enemies) {
				for (const enemy of window.gameState.enemies) {
					if (enemy.isStunned && enemy.stunTimer > 0) {
						parrySuccessful = true;
						break;
					}
				}
			}
			
			// Play sword swing sound if parry was unsuccessful
			if (!parrySuccessful && window.gameState && window.gameState.playSFX) {
				window.gameState.playSFX('sword-swing', 0.4);
			}
			
			this.player.changeState(PlayerStateName.Idle);
		}
	}
}