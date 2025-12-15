import KnightState from "./KnightState.js";
import KnightStateName from "../../../enums/KnightStateName.js";

export default class KnightPatrolState extends KnightState {
	constructor(knight) {
		super(knight);
	}

	enter() {
		this.knight.currentAnimation = 'walk';
		this.knight.patrolTimer = 0;
		
		// Choose a random cardinal direction if not already set
		if (!this.knight.patrolDirection) {
			const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
			this.knight.patrolDirection = dirs[Math.floor(Math.random() * dirs.length)];
		}
	}

	update(dt, player) {
		this.knight.patrolTimer += dt;

		// Check for player detection
		let distanceToPlayer = Infinity;
		if (player && !player.isDead) {
			distanceToPlayer = Math.sqrt(
				(player.position.x - this.knight.position.x) ** 2 + 
				(player.position.y - this.knight.position.y) ** 2
			);
		}

		if (distanceToPlayer <= this.knight.detectionRange) {
			this.knight.changeState(KnightStateName.Chase, { player: player });
			return;
		}

		// Continuous patrol movement
		const moveSpeed = this.knight.speed * dt;
		const deltaX = Math.cos(this.knight.patrolDirection) * moveSpeed;
		const deltaY = Math.sin(this.knight.patrolDirection) * moveSpeed;
		const tryX = this.knight.position.x + deltaX;
		const tryY = this.knight.position.y + deltaY;
		
		let canMoveX = true;
		let canMoveY = true;
		if (!this.knight.ignoreCollisions && this.knight.levelMaker && this.knight.levelMaker.isPositionCollidable) {
			canMoveX = !this.knight.levelMaker.isPositionCollidable(tryX, this.knight.position.y);
			canMoveY = !this.knight.levelMaker.isPositionCollidable(this.knight.position.x, tryY);
		}
		
		if (canMoveX) this.knight.position.x = tryX;
		if (canMoveY) this.knight.position.y = tryY;
		
		// If blocked, pick new direction and keep moving
		if (!canMoveX && !canMoveY) {
			const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
			this.knight.patrolDirection = dirs[Math.floor(Math.random() * dirs.length)];
		}
		
		// Change direction periodically but never stop
		if (this.knight.patrolTimer >= 4.0) {
			const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
			this.knight.patrolDirection = dirs[Math.floor(Math.random() * dirs.length)];
			this.knight.patrolTimer = 0;
		}
	}
}
