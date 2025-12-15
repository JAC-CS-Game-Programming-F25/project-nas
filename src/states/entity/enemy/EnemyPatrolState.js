import EnemyState from "./EnemyState.js";
import EnemyStateName from "../../../enums/EnemyStateName.js";

export default class EnemyPatrolState extends EnemyState {
	constructor(enemy) {
		super(enemy);
	}

	enter() {
		this.enemy.currentAnimation = 'flying';
		this.enemy.patrolTimer = 0;
		
		// Choose a random cardinal direction (right, down, left, up)
		const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
		this.enemy.patrolDirection = dirs[Math.floor(Math.random() * dirs.length)];
	}

	update(dt, player) {
		this.enemy.patrolTimer += dt;

		// Check for player detection
		let distanceToPlayer = Infinity;
		if (player && !player.isDead) {
			distanceToPlayer = Math.sqrt(
				(player.position.x - this.enemy.position.x) ** 2 + 
				(player.position.y - this.enemy.position.y) ** 2
			);
		}

		if (distanceToPlayer <= this.enemy.detectionRange) {
			this.enemy.changeState(EnemyStateName.Chase, { player: player });
			return;
		}

		// Normal patrol movement
		const moveSpeed = this.enemy.speed * dt;
		const deltaX = Math.cos(this.enemy.patrolDirection) * moveSpeed;
		const deltaY = Math.sin(this.enemy.patrolDirection) * moveSpeed;
		const tryX = this.enemy.position.x + deltaX;
		const tryY = this.enemy.position.y + deltaY;
		
		let canMoveX = true;
		let canMoveY = true;
		if (!this.enemy.ignoreCollisions && this.enemy.levelMaker && this.enemy.levelMaker.isPositionCollidable) {
			canMoveX = !this.enemy.levelMaker.isPositionCollidable(tryX, this.enemy.position.y);
			canMoveY = !this.enemy.levelMaker.isPositionCollidable(this.enemy.position.x, tryY);
		}
		
		if (canMoveX) this.enemy.position.x = tryX;
		if (canMoveY) this.enemy.position.y = tryY;
		
		// If blocked on both axes, pick a new direction
		if (!canMoveX && !canMoveY) {
			const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
			this.enemy.patrolDirection = dirs[Math.floor(Math.random() * dirs.length)];
		}
		
		if (this.enemy.patrolTimer >= this.enemy.patrolDuration) {
			this.enemy.changeState(EnemyStateName.Idle);
		}
	}
}
