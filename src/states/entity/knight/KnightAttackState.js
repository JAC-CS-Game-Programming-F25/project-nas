import KnightState from "./KnightState.js";
import KnightStateName from "../../../enums/KnightStateName.js";

export default class KnightAttackState extends KnightState {
	constructor(knight) {
		super(knight);
	}

	enter() {
		// Select random attack animation
		this.knight.currentAttackType = this.knight.attackTypes[Math.floor(Math.random() * this.knight.attackTypes.length)];
		this.knight.currentAnimation = this.knight.currentAttackType;
		this.knight.currentFrame = 0;
		this.knight.attackTimer = 0;
		this.knight.lastAttackTime = 0;
		this.hasDealtDamage = false;
		this.hasDodged = false;
		
		// Play attack sound
		if (window.gameState && window.gameState.playSFX) {
			window.gameState.playSFX('sword-swing', 0.6);
		}
	}

	update(dt, player) {
		this.knight.attackTimer += dt;

		// Check for player detection
		let distanceToPlayer = Infinity;
		if (player && !player.isDead) {
			distanceToPlayer = Math.sqrt(
				(player.position.x - this.knight.position.x) ** 2 + 
				(player.position.y - this.knight.position.y) ** 2
			);
		}

		// Generous dodge detection (wider window and radius)
		// Allow dodge detection from start of attack until near end
		if (this.knight.attackTimer > 0.1 && this.knight.attackTimer < 0.8 && !this.hasDodged && !this.hasDealtDamage && player) {
			// Check if player is dashing within a reasonable range (1.5x attack range)
			// This rewards dodging "near" the enemy even if not perfectly in the damage zone
			if (distanceToPlayer <= this.knight.attackRange * 1.5 && player.isDashing) {
				this.hasDodged = true;
				this.hasDealtDamage = true; // Prevent damage if we've registered a dodge
				player.showDodgeText();
				//console.log('🏃 Player dodged knight attack (generous check)!');
			}
		}

		// Deal damage to player at middle of attack animation
		if (this.knight.attackTimer > 0.3 && this.knight.attackTimer < 0.5 && player && distanceToPlayer <= this.knight.attackRange) {
			if (!this.hasDealtDamage) {
				// Check if player is parrying
				if (player.isInParryWindow && player.isInParryWindow()) {
					this.hasDealtDamage = true;
					// Parry successful!
					player.successfulParry();
					this.knight.showParryText();
					this.knight.getStunned(); // This will change state to Hurt
					return;
				} else if (player.isDashing) {
					// Player dodged the attack!
					if (!this.hasDodged) {
						this.hasDodged = true;
						player.showDodgeText();
					}
					//console.log('🏃 Player dodged knight attack!');
				} else if (player.takeDamage) {
					// Normal damage
					const baseDamage = this.knight.getAttackDamage();
					player.takeDamage(baseDamage);
					//console.log(`Knight hit player for ${baseDamage} damage!`);
				}
				this.hasDealtDamage = true;
			}
		}

		// Attack animation finished
		if (this.knight.attackTimer >= this.knight.attackDuration) {
			// Check if player is still in range for another attack
			if (distanceToPlayer <= this.knight.attackRange && this.knight.lastAttackTime >= this.knight.attackCooldown) {
				// Start another attack (re-enter state)
				this.enter();
			} else {
				// Return to chasing
				this.knight.changeState(KnightStateName.Chase, { player: player });
			}
		}
	}
}
