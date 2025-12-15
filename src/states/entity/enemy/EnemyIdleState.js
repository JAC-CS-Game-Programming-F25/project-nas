import EnemyState from "./EnemyState.js";
import EnemyStateName from "../../../enums/EnemyStateName.js";

export default class EnemyIdleState extends EnemyState {
	constructor(enemy) {
		super(enemy);
	}

	enter() {
		this.enemy.currentAnimation = 'idle';
		this.enemy.patrolTimer = 0;
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
		} else if (this.enemy.patrolTimer >= 1.0) {
			this.enemy.changeState(EnemyStateName.Patrol);
		}
	}
}
