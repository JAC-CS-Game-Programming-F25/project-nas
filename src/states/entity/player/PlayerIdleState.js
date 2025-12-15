import PlayerState from "./PlayerState.js";
import PlayerStateName from "../../../enums/PlayerStateName.js";
import { input } from "../../../globals.js";

export default class PlayerIdleState extends PlayerState {
	constructor(player) {
		super(player);
	}

	enter() {
		this.player.currentAnimation = 'idle';
		this.player.currentFrame = 0;
		this.player.animationTimer = 0;
		
		// Reset idle specific timers
		this.player.idleTimer = 0;
		this.player.isIdleAnimating = false;
		this.player.currentIdleFrame = 0;
		this.player.idleFrameTimer = 0;
	}

	update(dt) {
		// Handle idle animation
		this.player.idleTimer += dt;
		
		if (this.player.idleTimer >= this.player.idleDelay) {
			if (!this.player.isIdleAnimating) {
				this.player.isIdleAnimating = true;
				this.player.idleFrameTimer = 0;
			}
			
			this.player.idleFrameTimer += dt;

			if (this.player.idleFrameTimer >= this.player.idleAnimationSpeed) {
				this.player.currentIdleFrame = (this.player.currentIdleFrame + 1) % this.player.idleFrames;
				this.player.idleFrameTimer = 0;
			}
		}

		// Check for movement
		if (input.isKeyHeld('W') || input.isKeyHeld('S') || input.isKeyHeld('A') || input.isKeyHeld('D') ||
			input.isKeyHeld('ARROWUP') || input.isKeyHeld('ARROWDOWN') || input.isKeyHeld('ARROWLEFT') || input.isKeyHeld('ARROWRIGHT')) {
			this.player.changeState(PlayerStateName.Walk);
			return;
		}

		// Check for attack
		if ((input.isKeyPressed('SPACE') || input.isMouseButtonPressed(0)) && this.player.attackCooldownTimer <= 0) {
			this.player.changeState(PlayerStateName.Attack);
			return;
		}

		// Check for dash
		if (input.isKeyPressed('SHIFT') && this.player.dashCooldownTimer <= 0) {
			this.player.changeState(PlayerStateName.Dash);
			return;
		}

		// Check for parry
		if (input.isKeyPressed('E') && this.player.parryCooldownTimer <= 0) {
			this.player.changeState(PlayerStateName.Parry);
			return;
		}
	}
}