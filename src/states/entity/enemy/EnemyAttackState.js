import EnemyState from "./EnemyState.js";
import EnemyStateName from "../../../enums/EnemyStateName.js";

export default class EnemyAttackState extends EnemyState {
	constructor(enemy) {
		super(enemy);
	}

	enter() {
		this.hasDealtDamage = false;
		this.enemy.currentAnimation = 'attack';
		this.enemy.currentFrame = 0;
		this.enemy.attackTimer = 0;
		this.enemy.lastAttackTime = 0;
		this.enemy.playAttackSound();
	}

	update(dt, player) {
		this.enemy.attackTimer += dt;

		// Check for player detection
		let distanceToPlayer = Infinity;
		if (player && !player.isDead) {
			distanceToPlayer = Math.sqrt(
				(player.position.x - this.enemy.position.x) ** 2 + 
				(player.position.y - this.enemy.position.y) ** 2
			);
		}

		// Only chase again if player moves too far away
		if (distanceToPlayer > this.enemy.attackRange * 1.5) {
			this.enemy.changeState(EnemyStateName.Chase, { player: player });
			return;
		}

		// Deal damage to player at middle of attack animation
		// We use a flag to ensure damage is dealt only once per attack
		if (this.enemy.attackTimer > 0.3 && this.enemy.attackTimer < 0.4 && player && distanceToPlayer <= this.enemy.attackRange) {
			if (!this.hasDealtDamage) {
				// Check if player is parrying
				if (player.isInParryWindow && player.isInParryWindow()) {
					this.hasDealtDamage = true;
					// Parry successful!
					player.successfulParry();
					this.enemy.getStunned();
					return; // State change happens in getStunned
				} else if (player.isDashing) {
					// Player dodged the attack!
					player.showDodgeText();
					//console.log('🏃 Player dodged enemy attack!');
					this.hasDealtDamage = true;
				} else if (player.takeDamage) {
					// Normal damage
					const baseDamage = this.enemy.getAttackDamage();
					player.takeDamage(baseDamage);
					//console.log(`Enemy hit player for ${baseDamage} damage!`);
					this.hasDealtDamage = true;
				}
			}
		}

		// Attack animation finished
		if (this.enemy.attackTimer >= this.enemy.attackDuration) {
			// Check if player is still in range for another attack
			if (distanceToPlayer <= this.enemy.attackRange && this.enemy.lastAttackTime >= this.enemy.attackCooldown) {
				// Start another attack
				this.enemy.currentFrame = 0;
				this.enemy.attackTimer = 0;
				this.enemy.lastAttackTime = 0;
				this.hasDealtDamage = false;
				this.enemy.playAttackSound();
			} else {
				// Return to chasing or wait
				this.enemy.changeState(EnemyStateName.Chase, { player: player });
			}
		}
	}


}
