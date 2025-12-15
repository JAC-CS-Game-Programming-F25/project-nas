import EnemyState from "./EnemyState.js";
import EnemyStateName from "../../../enums/EnemyStateName.js";

export default class EnemyChaseState extends EnemyState {
	constructor(enemy) {
		super(enemy);
	}

	enter() {
		this.enemy.currentAnimation = 'flying';
	}

	update(dt, player) {
		// Check for player detection
		let distanceToPlayer = Infinity;
		if (player && !player.isDead) {
			distanceToPlayer = Math.sqrt(
				(player.position.x - this.enemy.position.x) ** 2 + 
				(player.position.y - this.enemy.position.y) ** 2
			);
		}

		// Lost player or player too far
		if (distanceToPlayer > this.enemy.detectionRange * 1.5) {
			this.enemy.changeState(EnemyStateName.Idle);
			return;
		}

		const optimalDistance = 25; // Maintain 25 pixel distance from player

		// Close enough to attack
		if (distanceToPlayer <= this.enemy.attackRange && this.enemy.lastAttackTime >= this.enemy.attackCooldown) {
			this.enemy.changeState(EnemyStateName.Attack, { player: player });
			return;
		}

		// Move toward player but maintain optimal distance
		if (player && distanceToPlayer > 0) {
			const angle = Math.atan2(player.position.y - this.enemy.position.y, player.position.x - this.enemy.position.x);
			
			// Only move if we're not at optimal distance
			if (distanceToPlayer > optimalDistance + 5) { // Add 5px buffer
				const moveSpeed = this.enemy.chaseSpeed * dt;
				
				const newX = this.enemy.position.x + Math.cos(angle) * moveSpeed;
				const newY = this.enemy.position.y + Math.sin(angle) * moveSpeed;
				
				// Track movement for running sound
				const isMoving = Math.abs(Math.cos(angle) * moveSpeed) > 0.1 || Math.abs(Math.sin(angle) * moveSpeed) > 0.1;
				this.enemy.handleRunningSound(isMoving, distanceToPlayer);
				
				// Check wall collisions using the same method as player (unless ignoring collisions)
				let canMoveX = true;
				let canMoveY = true;
				
				if (!this.enemy.ignoreCollisions && this.enemy.levelMaker && this.enemy.levelMaker.isPositionCollidable) {
					canMoveX = !this.enemy.levelMaker.isPositionCollidable(newX, this.enemy.position.y);
					canMoveY = !this.enemy.levelMaker.isPositionCollidable(this.enemy.position.x, newY);
				}
				
				// Move only if no collision
				if (canMoveX) {
					this.enemy.position.x = newX;
				}
				if (canMoveY) {
					this.enemy.position.y = newY;
				}
			} else if (distanceToPlayer < optimalDistance - 5) {
				// Too close, back away slightly
				const moveSpeed = this.enemy.chaseSpeed * dt * 0.5; // Move away slower
				
				const newX = this.enemy.position.x - Math.cos(angle) * moveSpeed;
				const newY = this.enemy.position.y - Math.sin(angle) * moveSpeed;
				
				// Check wall collisions (unless ignoring collisions)
				let canMoveX = true;
				let canMoveY = true;
				
				if (!this.enemy.ignoreCollisions && this.enemy.levelMaker && this.enemy.levelMaker.isPositionCollidable) {
					canMoveX = !this.enemy.levelMaker.isPositionCollidable(newX, this.enemy.position.y);
					canMoveY = !this.enemy.levelMaker.isPositionCollidable(this.enemy.position.x, newY);
				}
				
				// Move only if no collision
				if (canMoveX) {
					this.enemy.position.x = newX;
				}
				if (canMoveY) {
					this.enemy.position.y = newY;
				}
			}
			
			// Update facing direction
			this.enemy.patrolDirection = Math.cos(angle) > 0 ? 0 : Math.PI;
		}
	}
}
