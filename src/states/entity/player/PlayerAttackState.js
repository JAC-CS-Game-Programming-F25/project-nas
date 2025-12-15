import PlayerState from "./PlayerState.js";
import PlayerStateName from "../../../enums/PlayerStateName.js";

export default class PlayerAttackState extends PlayerState {
	constructor(player) {
		super(player);
	}

	enter() {
		this.player.isAttacking = true;
		this.player.attackTimer = 0;
		this.player.currentAttackFrame = 0;
		this.player.attackFrameTimer = 0;
		this.player.hasDealtDamage = false;
		this.player.attackType = 1; // Default to attack1
		
		// Play sword swing sound (whiff sound)
		if (window.gameState) {
			window.gameState.playSFX('sword-swing', 0.5);
		}
	}

	exit() {
		this.player.isAttacking = false;
		this.player.attackCooldownTimer = this.player.attackCooldown;
	}

	update(dt) {
		this.player.attackTimer += dt;
		this.player.attackFrameTimer += dt;
		
		// Update attack animation frames
		if (this.player.attackFrameTimer >= this.player.attackAnimationSpeed) {
			this.player.currentAttackFrame = (this.player.currentAttackFrame + 1) % 8; // 8 frames per attack
			this.player.attackFrameTimer = 0;
		}
		
		// End attack when duration is reached
		if (this.player.attackTimer >= this.player.attackDuration) {
			this.player.changeState(PlayerStateName.Idle);
			return;
		}
	}
}