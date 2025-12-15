import KnightState from "./KnightState.js";
import KnightStateName from "../../../enums/KnightStateName.js";

export default class KnightChaseState extends KnightState {
	constructor(knight) {
		super(knight);
	}

	enter() {
		this.knight.currentAnimation = 'run';
	}

	update(dt, player) {
		// Check for player detection
		let distanceToPlayer = Infinity;
		if (player && !player.isDead) {
			distanceToPlayer = Math.sqrt(
				(player.position.x - this.knight.position.x) ** 2 + 
				(player.position.y - this.knight.position.y) ** 2
			);
		}

		// Lost player or player too far
		if (distanceToPlayer > this.knight.detectionRange * 1.5) {
			this.knight.changeState(KnightStateName.Patrol);
			return;
		}

		const optimalDistance = 30; // Maintain close distance for melee

		// Close enough to attack
		if (distanceToPlayer <= this.knight.attackRange && this.knight.lastAttackTime >= this.knight.attackCooldown) {
			this.knight.changeState(KnightStateName.Attack, { player: player });
			return;
		}

		// Move toward player
		if (player && distanceToPlayer > 0) {
			const angle = Math.atan2(player.position.y - this.knight.position.y, player.position.x - this.knight.position.x);
			
			// Only move if we're not at optimal distance
			if (distanceToPlayer > optimalDistance) {
				const moveSpeed = this.knight.chaseSpeed * dt;
				
				const newX = this.knight.position.x + Math.cos(angle) * moveSpeed;
				const newY = this.knight.position.y + Math.sin(angle) * moveSpeed;
				
				// Track movement for running sound
				const isMoving = Math.abs(Math.cos(angle) * moveSpeed) > 0.1 || Math.abs(Math.sin(angle) * moveSpeed) > 0.1;
				this.knight.handleRunningSound(isMoving, distanceToPlayer);
				
				// Check wall collisions
				let canMoveX = true;
				let canMoveY = true;
				
				if (!this.knight.ignoreCollisions && this.knight.levelMaker && this.knight.levelMaker.isPositionCollidable) {
					canMoveX = !this.knight.levelMaker.isPositionCollidable(newX, this.knight.position.y);
					canMoveY = !this.knight.levelMaker.isPositionCollidable(this.knight.position.x, newY);
				}
				
				// Move only if no collision
				if (canMoveX) {
					this.knight.position.x = newX;
				}
				if (canMoveY) {
					this.knight.position.y = newY;
				}
			}
			
			// Update facing direction
			this.knight.patrolDirection = Math.cos(angle) > 0 ? 0 : Math.PI;
		}
	}
}
