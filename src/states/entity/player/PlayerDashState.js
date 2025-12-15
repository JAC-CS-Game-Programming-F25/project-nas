import PlayerState from "./PlayerState.js";
import PlayerStateName from "../../../enums/PlayerStateName.js";

export default class PlayerDashState extends PlayerState {
	constructor(player) {
		super(player);
	}

	enter(params = {}) {
		this.player.isDashing = true;
		this.player.dashTimer = 0;
		this.player.dashCooldownTimer = this.player.dashCooldown;
		
		const dx = params.dx || 0;
		const dy = params.dy || 0;

		// Determine dash direction
		if (dx === 0 && dy === 0) {
			// If not moving, dash in facing direction
			switch (this.player.direction) {
				case 0: this.player.dashDirection = { x: 0, y: 1 }; break; // Down
				case 1: this.player.dashDirection = { x: -1, y: 0 }; break; // Left
				case 2: this.player.dashDirection = { x: 1, y: 0 }; break; // Right
				case 3: this.player.dashDirection = { x: 0, y: -1 }; break; // Up
			}
		} else {
			// Normalize vector
			// Note: dx and dy passed from WalkState are already scaled by speed*dt, so they represent velocity vector
			// But we want direction.
			const length = Math.sqrt(dx*dx + dy*dy);
			if (length > 0) {
				this.player.dashDirection = { x: dx/length, y: dy/length };
			} else {
				// Fallback
				this.player.dashDirection = { x: 0, y: 1 };
			}
		}

		// Play dash sound
		if (window.gameState && window.gameState.playSFX) {
			window.gameState.playSFX('dash', 0.5);
		}
	}

	exit() {
		this.player.isDashing = false;
	}

	update(dt, levelMaker) {
		this.player.dashTimer += dt;
		
		// Move
		const dx = this.player.dashDirection.x * this.player.dashSpeed * dt;
		const dy = this.player.dashDirection.y * this.player.dashSpeed * dt;

		// Check collision
		if (dx !== 0 || dy !== 0) {
			const newX = this.player.position.x + dx;
			const newY = this.player.position.y + dy;
			
			if (levelMaker && levelMaker.isPositionCollidable(newX, newY)) {
				// Try moving just horizontally
				if (!levelMaker.isPositionCollidable(newX, this.player.position.y)) {
					this.player.position.x = newX;
				}
				// Try moving just vertically
				else if (!levelMaker.isPositionCollidable(this.player.position.x, newY)) {
					this.player.position.y = newY;
				}
				// Stop dash if hitting wall
				this.player.changeState(PlayerStateName.Idle);
				return;
			} else {
				this.player.position.x = newX;
				this.player.position.y = newY;
			}
		}

		if (this.player.dashTimer >= this.player.dashDuration) {
			this.player.changeState(PlayerStateName.Idle);
		}
	}
}