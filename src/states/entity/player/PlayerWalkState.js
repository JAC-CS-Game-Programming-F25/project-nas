import PlayerState from "./PlayerState.js";
import PlayerStateName from "../../../enums/PlayerStateName.js";
import { input } from "../../../globals.js";

export default class PlayerWalkState extends PlayerState {
	constructor(player) {
		super(player);
	}

	enter() {
		this.player.currentAnimation = 'run';
		this.player.animationTimer = 0;
		this.player.isMoving = true;
	}

	exit() {
		this.player.isMoving = false;
		// Stop running sound
		if (this.player.runningSound) {
			this.player.runningSound.pause();
			this.player.runningSound = null;
		}
	}

	update(dt, levelMaker) {
		let dx = 0;
		let dy = 0;
		let moved = false;

		// WASD movement
		if (input.isKeyHeld('W') || input.isKeyHeld('ARROWUP')) {
			dy = -this.player.speed * dt;
			this.player.direction = 3; // up
			moved = true;
		}
		if (input.isKeyHeld('S') || input.isKeyHeld('ARROWDOWN')) {
			dy = this.player.speed * dt;
			this.player.direction = 0; // down
			moved = true;
		}
		if (input.isKeyHeld('A') || input.isKeyHeld('ARROWLEFT')) {
			dx = -this.player.speed * dt;
			this.player.direction = 1; // left
			moved = true;
		}
		if (input.isKeyHeld('D') || input.isKeyHeld('ARROWRIGHT')) {
			dx = this.player.speed * dt;
			this.player.direction = 2; // right
			moved = true;
		}

		if (!moved) {
			this.player.changeState(PlayerStateName.Idle);
			return;
		}

		// Handle running sound
		if (!this.player.runningSound) {
			if (window.gameState && window.gameState.sounds) {
				const runningSoundPool = window.gameState.sounds.get('playerrunning');
				if (runningSoundPool) {
					const volume = window.gameState.gameSettings ? 
						window.gameState.gameSettings.sfxVolume * window.gameState.gameSettings.masterVolume * 0.4 : 0.4;
					runningSoundPool.setVolume(volume);
					runningSoundPool.play();
					this.player.runningSound = runningSoundPool;
				}
			}
		}

		// Check for collision before moving
		if (dx !== 0 || dy !== 0) {
			const newX = this.player.position.x + dx;
			const newY = this.player.position.y + dy;
			
			// Check collision with level geometry
			if (levelMaker && levelMaker.isPositionCollidable(newX, newY)) {
				// Try moving just horizontally
				if (!levelMaker.isPositionCollidable(newX, this.player.position.y)) {
					this.player.position.x = newX;
				}
				// Try moving just vertically
				else if (!levelMaker.isPositionCollidable(this.player.position.x, newY)) {
					this.player.position.y = newY;
				}
			} else {
				// No collision, move normally
				this.player.position.x = newX;
				this.player.position.y = newY;
			}
		}

		// Animation update
		this.player.animationTimer += dt;
		if (this.player.animationTimer >= this.player.animationSpeed) {
			this.player.currentFrame = (this.player.currentFrame + 1) % this.player.walkFrames;
			this.player.animationTimer = 0;
		}

		// State transitions
		if ((input.isKeyPressed('SPACE') || input.isMouseButtonPressed(0)) && this.player.attackCooldownTimer <= 0) {
			this.player.changeState(PlayerStateName.Attack);
			return;
		}

		if (input.isKeyPressed('SHIFT') && this.player.dashCooldownTimer <= 0) {
			this.player.changeState(PlayerStateName.Dash);
			return;
		}

		if (input.isKeyPressed('E') && this.player.parryCooldownTimer <= 0) {
			this.player.changeState(PlayerStateName.Parry);
			return;
		}
	}
}