import GameEntity from "./GameEntity.js";
import { images } from "../globals.js";
import StateMachine from "../../lib/StateMachine.js";
import EnemyStateName from "../enums/EnemyStateName.js";
import EnemyIdleState from "../states/entity/enemy/EnemyIdleState.js";
import EnemyPatrolState from "../states/entity/enemy/EnemyPatrolState.js";
import EnemyChaseState from "../states/entity/enemy/EnemyChaseState.js";
import EnemyAttackState from "../states/entity/enemy/EnemyAttackState.js";
import EnemyHurtState from "../states/entity/enemy/EnemyHurtState.js";
import EnemyDeathState from "../states/entity/enemy/EnemyDeathState.js";

export default class Enemy extends GameEntity {
	constructor(x, y, enemyType = 'flying_demon', levelMaker = null) {
		super(x, y);
		
		this.enemyType = enemyType;
		this.levelMaker = levelMaker;
		this.frameWidth = 64;
		this.frameHeight = 64;
		
		// Animation states
		this.currentAnimation = 'idle';
		this.animationTime = 0;
		this.animationSpeed = 0.2; // Time per frame
		this.currentFrame = 0;
		
		// Sprites for different animations
		this.sprites = {};
		
		// Load sprites
		this.initializeSprites();
		
		// Level and combat properties
		this.level = Math.floor(Math.random() * 3) + 1; // Random level 1-3
		this.maxHealth = this.getMaxHealthForLevel(this.level);
		this.health = this.maxHealth;
		this.xpDrop = this.getXPDropForLevel(this.level);
		this.isDead = false;
		this.speed = 50; // pixels per second
		this.attackRange = 80;
		this.attackDamage = 10;
		
		// AI state
		this.state = 'idle'; // Kept for backward compatibility with subclasses
		this.target = null;
		this.patrolDirection = 0; // 0 = right, PI = left
		this.patrolTimer = 0;
		this.patrolDuration = 2; // seconds before changing behavior
		
		// Player detection and attack
		this.detectionRange = 150; // pixels to detect player
		this.attackRange = 40; // pixels to start attacking
		this.chaseSpeed = 60; // pixels per second when chasing
		this.attackTimer = 0;
		this.attackDuration = 0.8; // seconds for attack animation
		this.attackCooldown = 1.5; // seconds between attacks
		this.lastAttackTime = 0;
		
		// Status effects
		this.statusEffects = {
			burn: {
				active: false,
				duration: 0,
				timer: 0,
				damage: 2 // damage per second
			},
			slow: {
				active: false,
				duration: 0,
				timer: 0,
				speedMultiplier: 0.5 // 50% speed
			},
			freeze: {
				active: false,
				duration: 0,
				timer: 0,
				hitCount: 0
			},
			frostbite: {
				active: false,
				duration: 0,
				timer: 0,
				damage: 10 // 10 damage per second
			}
		};
		this.originalSpeed = this.speed;
		
		// Stun system
		this.isStunned = false;
		this.stunTimer = 0;
		this.stunDuration = 2.0; // 2 seconds of stun
		
		// Collision system
		this.ignoreCollisions = false; // Can be set to true for special enemies
		
		// Damage text properties
		this.damageText = null;
		this.damageTextTimer = 0;
		this.damageTextY = 0;
		this.damageTextAlpha = 0;
		
		// Running sound properties
		this.wasMoving = false;
		this.runningSound = null;
		this.soundRadius = 400; // Increased from 120 to 400 to ensure sound is audible
		this.runningSoundKey = 'devilconstant'; // Default running sound
		
		this.stateMachine = new StateMachine();
		this.stateMachine.add(EnemyStateName.Idle, new EnemyIdleState(this));
		this.stateMachine.add(EnemyStateName.Patrol, new EnemyPatrolState(this));
		this.stateMachine.add(EnemyStateName.Chase, new EnemyChaseState(this));
		this.stateMachine.add(EnemyStateName.Attack, new EnemyAttackState(this));
		this.stateMachine.add(EnemyStateName.Hurt, new EnemyHurtState(this));
		this.stateMachine.add(EnemyStateName.Death, new EnemyDeathState(this));

		this.changeState(EnemyStateName.Idle);

		//console.log(`Enemy created at (${x}, ${y}) of type ${enemyType} - Level ${this.level} with ${this.maxHealth} HP`);
	}

	changeState(state, params) {
		this.state = state;
		this.stateMachine.change(state, params);
	}

	getMaxHealthForLevel(level) {
		const healthValues = { 1: 75, 2: 113, 3: 150 };
		return healthValues[level] || 75;
	}

	getXPDropForLevel(level) {
		const xpValues = { 1: 50, 2: 65, 3: 80 };
		return xpValues[level] || 50;
	}
	
	initializeSprites() {
		try {
			// Load enemy sprite sheets directly like the player does
			this.sprites = {
				idle: images.get('enemy_idle'),
				flying: images.get('enemy_flying'),
				attack: images.get('enemy_attack'),
				hurt: images.get('enemy_hurt'),
				death: images.get('enemy_death')
			};
			
			// Frame configuration for enemy sprites (80x64 per frame)
			this.frameConfig = {
				frameWidth: 80,
				frameHeight: 64
			};
			
			// Frame counts for each animation (based on 80px frame width)
			this.frameCount = {
				idle: 3,    // 256/80 = 3.2, so 3 frames
				flying: 3,  // 256/80 = 3.2, so 3 frames
				attack: 5,  // 512/80 = 6.4, but use 5 frames to prevent disappearing
				hurt: 3,    // 256/80 = 3.2, so 3 frames
				death: 4    // 448/80 = 5.6, but use 4 frames to prevent disappearing
			};
			
		} catch (error) {
			console.error('Error initializing enemy sprites:', error);
		}
	}
	
	update(dt, player = null) {
		// Update animation
		this.updateAnimation(dt);
		
		// Update status effects
		this.updateStatusEffects(dt);
		
		// Update state machine
		this.stateMachine.update(dt, player);
		
		// Update timers
		this.lastAttackTime += dt;

		// Update hitbox position manually (since we're not calling super.update)
		if (this.hitbox) {
			this.hitbox.position.x = this.position.x;
			this.hitbox.position.y = this.position.y;
		}
	}
	
	updateAnimation(dt) {
		this.animationTime += dt;
		
		if (this.animationTime >= this.animationSpeed) {
			this.animationTime = 0;
			
			// Get current animation frame count
			const maxFrames = this.frameCount[this.currentAnimation] || 1;
			
			// For death animation, don't loop - stay on last frame
			if (this.currentAnimation === 'death') {
				if (this.currentFrame < maxFrames - 1) {
					this.currentFrame++;
				}
				// Stay on last frame when death animation completes
			} else {
				this.currentFrame = (this.currentFrame + 1) % maxFrames;
			}
		}
	}

	render() {
		const spriteSheet = this.sprites[this.currentAnimation];
		
		if (spriteSheet && spriteSheet.image && spriteSheet.image.complete) {
			// Get canvas context
			const canvas = document.querySelector('canvas');
			const context = canvas.getContext('2d');
			
			// Calculate source position with correct frame width
			const srcX = this.currentFrame * this.frameConfig.frameWidth;
			const srcY = 0;
			
			// Destination position (centered on enemy position)
			const destX = this.position.x - this.frameConfig.frameWidth / 2;
			const destY = this.position.y - this.frameConfig.frameHeight / 2;
			
			// Check if we need to flip the sprite (when moving right)
			const shouldFlip = this.patrolDirection === 0; // 0 = moving right
			
			if (shouldFlip) {
				// Save context and flip horizontally
				context.save();
				context.scale(-1, 1); // Flip horizontally
				context.drawImage(
					spriteSheet.image,
					srcX, srcY, this.frameConfig.frameWidth, this.frameConfig.frameHeight, // Source
					-destX - this.frameConfig.frameWidth, destY, this.frameConfig.frameWidth, this.frameConfig.frameHeight // Flipped destination
				);
				context.restore();
			} else {
				// Draw normally (facing right)
				context.drawImage(
					spriteSheet.image,
					srcX, srcY, this.frameConfig.frameWidth, this.frameConfig.frameHeight, // Source
					destX, destY, this.frameConfig.frameWidth, this.frameConfig.frameHeight // Destination
				);
			}
		
			// Draw health bar above enemy
			this.renderHealthBar(context);
			
			// Draw status effect indicators and crit text
			this.renderStatusEffects(context);
		} else {
			// Fallback rendering - red square
			const canvas = document.querySelector('canvas');
			const context = canvas.getContext('2d');
			
			context.fillStyle = '#FF0000';
			context.fillRect(
				this.position.x - 32,
				this.position.y - 32,
				64,
				64
			);
			
			// Draw health bar above fallback enemy too
			this.renderHealthBar(context);
		}
	}

	renderHealthBar(context) {
		if (this.isDead || this.currentAnimation === 'death') return;
		
		const barWidth = 50;
		const barHeight = 6;
		const barX = this.position.x - barWidth / 2;
		const barY = this.position.y - 40; // Fixed position above enemy
		
		// Background (black border)
		context.fillStyle = '#000000';
		context.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
		
		// Background (dark red)
		context.fillStyle = '#660000';
		context.fillRect(barX, barY, barWidth, barHeight);
		
		// Health (color based on health percentage)
		const healthPercent = this.health / this.maxHealth;
		context.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
		context.fillRect(barX, barY, barWidth * healthPercent, barHeight);
		
		// Level indicator above health bar
		context.fillStyle = '#FFFFFF';
		context.font = 'bold 10px Arial';
		context.textAlign = 'center';
		context.strokeStyle = '#000000';
		context.lineWidth = 2;
		context.strokeText(`Lv.${this.level}`, this.position.x, barY - 3);
		context.fillText(`Lv.${this.level}`, this.position.x, barY - 3);
	}
	
	renderStatusEffects(context) {
		let yOffset = -55; // Start above health bar
		
		// Show burn effect
		if (this.statusEffects.burn.active) {
			context.fillStyle = '#FF4500';
			context.font = '16px Arial';
			context.textAlign = 'center';
			context.fillText('🔥', this.position.x - 15, this.position.y + yOffset);
			yOffset -= 20;
		}
		
		// Show slow effect
		if (this.statusEffects.slow.active) {
			context.fillStyle = '#87CEEB';
			context.font = '16px Arial';
			context.textAlign = 'center';
			context.fillText('❄️', this.position.x + 15, this.position.y + yOffset);
		}

		// Show freeze effect
		if (this.statusEffects.freeze.active) {
			context.fillStyle = '#00FFFF';
			context.font = '16px Arial';
			context.textAlign = 'center';
			context.fillText('🧊', this.position.x, this.position.y + yOffset - 20);
		}

		// Show frostbite effect
		if (this.statusEffects.frostbite.active) {
			context.fillStyle = '#E0FFFF';
			context.font = '16px Arial';
			context.textAlign = 'center';
			context.fillText('🥶', this.position.x + 30, this.position.y + yOffset);
		}
		
		// Show crit text
		if (this.showCritText) {
			const alpha = Math.max(0, 1 - (this.critTextTimer / 1.5));
			context.save();
			context.globalAlpha = alpha;
			
			// Animate upward movement
			const floatY = this.position.y - 60 - (this.critTextTimer * 30);
			
			// Crit text with outline
			context.strokeStyle = '#000000';
			context.fillStyle = '#FFD700';
			context.font = 'bold 24px Arial';
			context.textAlign = 'center';
			context.lineWidth = 2;
			
			context.strokeText('CRIT!', this.position.x, floatY);
			context.fillText('CRIT!', this.position.x, floatY);
			
			context.restore();
		}
		
		// Draw damage text if active
		if (this.damageTextTimer > 0 && this.damageText) {
			context.save();
			
			// Set text properties
			context.font = 'bold 16px Arial';
			context.fillStyle = `rgba(255, 0, 0, ${this.damageTextAlpha})`; // Red color with fade
			context.strokeStyle = `rgba(0, 0, 0, ${this.damageTextAlpha})`;
			context.lineWidth = 2;
			context.textAlign = 'center';
			
			// Draw text with outline (position above enemy)
			const textX = this.position.x + 20; // Offset to avoid overlap with health bar
			const textY = this.damageTextY;
			
			context.strokeText(this.damageText, textX, textY);
			context.fillText(this.damageText, textX, textY);
			
			context.restore();
		}
	}

	takeDamage(damage, elementType = null, isParried = false) {
		if (this.isDead || this.currentAnimation === 'death') return false;
		
		let finalDamage = damage;
		let isCrit = false;
		
		// Apply elemental effects
		if (elementType) {
			switch (elementType) {
				case 'fire':
					// Apply burn effect
					this.applyBurn(5, 3); // 3 seconds of burn
					break;
				case 'ice':
					// Apply freeze effect
					if (this.statusEffects.freeze.active) {
						this.statusEffects.freeze.hitCount++;
						this.statusEffects.freeze.timer = 0; // Refresh freeze duration
						//console.log(`🧊 Frozen enemy hit! Count: ${this.statusEffects.freeze.hitCount}`);
						
						if (this.statusEffects.freeze.hitCount >= 3) {
							this.applyFrostbite(10, 5); // 10 dmg for 5 sec
							this.statusEffects.freeze.hitCount = 0; 
						}
					} else {
						this.applyFreeze(4); // 4 seconds of freeze
					}
					break;
				case 'water':
					// Crit damage
					finalDamage = Math.floor(damage * 1.25);
					isCrit = true;
					break;
			}
		}
		
		this.health -= finalDamage;
		//console.log(`Enemy Lv.${this.level} took ${finalDamage} ${isCrit ? 'CRIT ' : ''}damage! Health: ${this.health}/${this.maxHealth}`);
		
		// Show damage number
		this.showDamageText(finalDamage, isCrit);
		
		// Store crit info for visual feedback (keep for compatibility)
		if (isCrit) {
			this.showCritText = true;
			this.critTextTimer = 0;
		}
		
		if (this.health <= 0) {
			this.health = 0;
			this.isDead = true;
			this.changeState(EnemyStateName.Death);
			return true; // Enemy died, return XP
		} else {
			this.changeState(EnemyStateName.Hurt);
		}
		
		return false; // Enemy still alive
	}

	/**
	 * Stun this enemy (from successful parry)
	 */
	getStunned() {
		this.isStunned = true;
		this.stunTimer = 0;
		this.changeState(EnemyStateName.Hurt);
		//console.log('Enemy was stunned by parry!');
		
		// Trigger parry success feedback in game state
		if (window.gameState) {
			if (window.gameState.combatSystem && typeof window.gameState.combatSystem.showParrySuccess === 'function') {
				window.gameState.combatSystem.showParrySuccess();
			} else if (typeof window.gameState.showParrySuccess === 'function') {
				window.gameState.showParrySuccess();
			}
		}
	}
	
	/**
	 * Get base attack damage (can be overridden by subclasses)
	 */
	getAttackDamage() {
		return 15; // Base enemy damage
	}
	
	startPatrol() {
		this.changeState(EnemyStateName.Patrol);
	}
	
	stopPatrol() {
		this.changeState(EnemyStateName.Idle);
	}
	
	/**
	 * Apply burn status effect
	 */
	applyBurn(damagePerSecond, duration) {
		this.statusEffects.burn.active = true;
		this.statusEffects.burn.damage = damagePerSecond;
		this.statusEffects.burn.duration = duration;
		this.statusEffects.burn.timer = 0;
		//console.log(`🔥 Applied burn: ${damagePerSecond} DPS for ${duration}s`);
	}
	
	/**
	 * Apply slow status effect
	 */
	applySlow(duration) {
		this.statusEffects.slow.active = true;
		this.statusEffects.slow.duration = duration;
		this.statusEffects.slow.timer = 0;
		
		// Only apply slow speed if not frozen
		if (!this.statusEffects.freeze.active) {
			this.speed = this.originalSpeed * this.statusEffects.slow.speedMultiplier;
		}
		//console.log(`❄️ Applied slow for ${duration}s`);
	}

	/**
	 * Apply freeze status effect
	 */
	applyFreeze(duration) {
		this.statusEffects.freeze.active = true;
		this.statusEffects.freeze.duration = duration;
		this.statusEffects.freeze.timer = 0;
		this.speed = 0; // Immobilize
		//console.log(`🧊 Applied freeze for ${duration}s`);
	}

	/**
	 * Apply frostbite status effect
	 */
	applyFrostbite(damagePerSecond, duration) {
		this.statusEffects.frostbite.active = true;
		this.statusEffects.frostbite.damage = damagePerSecond;
		this.statusEffects.frostbite.duration = duration;
		this.statusEffects.frostbite.timer = 0;
		//console.log(`🥶 Applied frostbite: ${damagePerSecond} DPS for ${duration}s`);
	}
	
	showDamageText(damage, isCrit = false) {
		// Create floating damage number
		this.damageText = isCrit ? `CRIT -${damage}` : `-${damage}`;
		this.damageTextTimer = 1.5; // Show for 1.5 seconds
		this.damageTextY = this.position.y - 30; // Start above enemy
		this.damageTextAlpha = 1.0;
	}
	
	/**
	 * Update status effects
	 */
	updateStatusEffects(dt) {
		// Handle burn effect
		if (this.statusEffects.burn.active) {
			this.statusEffects.burn.timer += dt;
			
			// Apply burn damage every second
			if (Math.floor(this.statusEffects.burn.timer) > Math.floor(this.statusEffects.burn.timer - dt)) {
				this.health -= this.statusEffects.burn.damage;
				if (this.health <= 0) {
					this.health = 0;
					this.isDead = true;
					this.changeState(EnemyStateName.Death);
				}
			}
			
			// Check if burn effect expired
			if (this.statusEffects.burn.timer >= this.statusEffects.burn.duration) {
				this.statusEffects.burn.active = false;
				//console.log('🔥 Burn effect expired');
			}
		}
		
		// Handle slow effect
		if (this.statusEffects.slow.active) {
			this.statusEffects.slow.timer += dt;
			
			// Check if slow effect expired
			if (this.statusEffects.slow.timer >= this.statusEffects.slow.duration) {
				this.statusEffects.slow.active = false;
				
				// Only restore speed if not frozen
				if (!this.statusEffects.freeze.active) {
					this.speed = this.originalSpeed; 
				}
				//console.log('❄️ Slow effect expired');
			}
		}

		// Handle freeze effect
		if (this.statusEffects.freeze.active) {
			this.statusEffects.freeze.timer += dt;
			
			// Check if freeze effect expired
			if (this.statusEffects.freeze.timer >= this.statusEffects.freeze.duration) {
				this.statusEffects.freeze.active = false;
				this.statusEffects.freeze.hitCount = 0; // Reset hit count
				
				// Restore speed (check if slow is still active)
				if (this.statusEffects.slow.active) {
					this.speed = this.originalSpeed * this.statusEffects.slow.speedMultiplier;
				} else {
					this.speed = this.originalSpeed;
				}
				//console.log('🧊 Freeze effect expired');
			}
		}

		// Handle frostbite effect
		if (this.statusEffects.frostbite.active) {
			this.statusEffects.frostbite.timer += dt;
			
			// Apply frostbite damage every second
			if (Math.floor(this.statusEffects.frostbite.timer) > Math.floor(this.statusEffects.frostbite.timer - dt)) {
				this.health -= this.statusEffects.frostbite.damage;
				this.showDamageText(this.statusEffects.frostbite.damage); // Show damage number
				
				if (this.health <= 0) {
					this.health = 0;
					this.isDead = true;
					this.changeState(EnemyStateName.Death);
				}
			}
			
			// Check if frostbite effect expired
			if (this.statusEffects.frostbite.timer >= this.statusEffects.frostbite.duration) {
				this.statusEffects.frostbite.active = false;
				//console.log('🥶 Frostbite effect expired');
			}
		}
		
		// Handle crit text display
		if (this.showCritText) {
			this.critTextTimer += dt;
			if (this.critTextTimer >= 1.5) { // Show for 1.5 seconds
				this.showCritText = false;
			}
		}
		
		// Handle damage text animation
		if (this.damageTextTimer > 0) {
			this.damageTextTimer -= dt;
			this.damageTextY -= 40 * dt; // Float upward
			this.damageTextAlpha = this.damageTextTimer / 1.5; // Fade out over 1.5 seconds
		}
	}

	handleRunningSound(isMoving, distanceToPlayer) {
		// Only play sound if within radius of player
		if (distanceToPlayer > this.soundRadius) {
			// Too far - stop any running sound
			if (this.runningSound) {
				this.runningSound.pause();
				this.runningSound = null;
			}
			this.wasMoving = false;
			return;
		}
		
		if (isMoving && !this.wasMoving) {
			// Just started moving - play running sound
			if (window.gameState && window.gameState.sounds) {
				this.runningSound = window.gameState.sounds.get(this.runningSoundKey); // Use configured sound
				if (this.runningSound) {
					this.runningSound.play();
				}
			}
		} else if (!isMoving && this.wasMoving) {
			// Just stopped moving - stop running sound
			if (this.runningSound) {
				this.runningSound.pause();
				this.runningSound = null;
			}
		}
		
		this.wasMoving = isMoving;
	}

	playAttackSound() {
		// Default demon attack sound (can be overridden by subclasses)
		if (window.gameState && window.gameState.playSFX) {
			window.gameState.playSFX('devilattack', 0.6);
		}
	}
}
