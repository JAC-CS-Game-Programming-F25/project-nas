import Enemy from "./Enemy.js";
import { images, canvas, context } from "../globals.js";
import StateMachine from "../../lib/StateMachine.js";
import KnightStateName from "../enums/KnightStateName.js";
import KnightPatrolState from "../states/entity/knight/KnightPatrolState.js";
import KnightChaseState from "../states/entity/knight/KnightChaseState.js";
import KnightAttackState from "../states/entity/knight/KnightAttackState.js";
import KnightBlockState from "../states/entity/knight/KnightBlockState.js";
import KnightHurtState from "../states/entity/knight/KnightHurtState.js";
import KnightDeathState from "../states/entity/knight/KnightDeathState.js";

export default class Knight extends Enemy {
	constructor(x, y, levelMaker = null) {
		super(x, y, 'knight', levelMaker);
		
		// Override frame dimensions for knight (larger display, 32x32 sprite)
		this.frameWidth = 72;
		this.frameHeight = 72;
		
		// Set proper entity dimensions (collision box)
		this.width = 60;
		this.height = 60;
		
		// Knight specific properties
		this.blockChance = 1/3; // 1/3 chance to block attacks
		this.isBlocking = false;
		this.blockTimer = 0;
		this.blockDuration = 1.0; // How long block animation lasts
		
		// Knight level range (3-9)
		this.level = Math.floor(Math.random() * 7) + 3; // Random level 3-9
		this.maxHealth = this.getKnightMaxHealthForLevel(this.level);
		this.health = this.maxHealth;
		this.xpDrop = this.getKnightXPDropForLevel(this.level);
		
		// Combat properties
		this.attackTypes = ['attack1', 'attack2', 'attack3'];
		this.currentAttackType = 'attack1';
		this.attackCooldown = 2.0; // Longer cooldown for more powerful attacks
		
		// Blocked text properties
		this.blockedText = null;
		this.blockedTextTimer = 0;
		this.blockedTextY = 0;
		this.blockedTextAlpha = 0;
		
		// Damage text properties
		this.damageText = null;
		this.damageTextTimer = 0;
		this.damageTextY = 0;
		this.damageTextAlpha = 0;
		
		// Parry text properties
		this.parryText = null;
		this.parryTextTimer = 0;
		this.parryTextY = 0;
		this.parryTextAlpha = 0;
		
		// Set running sound
		this.runningSoundKey = 'knightrunning';
		
		// Initialize knight-specific sprites (override parent method)
		this.initializeSprites();
		
		// Initialize State Machine
		this.stateMachine = new StateMachine();
		this.stateMachine.add(KnightStateName.Patrol, new KnightPatrolState(this));
		this.stateMachine.add(KnightStateName.Chase, new KnightChaseState(this));
		this.stateMachine.add(KnightStateName.Attack, new KnightAttackState(this));
		this.stateMachine.add(KnightStateName.Block, new KnightBlockState(this));
		this.stateMachine.add(KnightStateName.Hurt, new KnightHurtState(this));
		this.stateMachine.add(KnightStateName.Death, new KnightDeathState(this));

		this.changeState(KnightStateName.Patrol);

		//console.log(`🛡️ Knight created - Level ${this.level}, Health: ${this.health}`);
	}
	
	getKnightMaxHealthForLevel(level) {
		// Knights are tougher than regular enemies
		return 100 + (level * 25); // Level 3 = 175 HP, Level 9 = 325 HP
	}
	
	getKnightXPDropForLevel(level) {
		// Knights give more XP
		return 75 + (level * 15); // Level 3 = 120 XP, Level 9 = 210 XP
	}
	
	// Override parent's sprite initialization
	initializeSprites() {
		// Initialize sprites object
		this.sprites = {};
		
		// Frame configuration for knight sprites (32x32 per frame)
		this.frameConfig = {
			frameWidth: 32,
			frameHeight: 32
		};
		
		// Frame counts for each animation based on requirements
		this.frameCount = {
			idle: 3,      // 3 frames
			walk: 8,      // 8 frames
			run: 8,       // 8 frames
			attack1: 6,   // 6 frames
			attack2: 5,   // 5 frames
			attack3: 6,   // 6 frames
			defend: 6,    // 6 frames
			hurt: 3,      // 3 frames
			death: 12,    // 12 frames
			jump: 3,      // 3 frames
			// Compatibility mappings
			flying: 8,    // Use walk frames
			attack: 6     // Use attack1 frames
		};

		try {
			// Load knight sprite sheets
			this.sprites = {
				idle: images.get('knight_idle'),
				walk: images.get('knight_walk'),
				run: images.get('knight_run'),
				attack1: images.get('knight_attack1'),
				attack2: images.get('knight_attack2'),
				attack3: images.get('knight_attack3'),
				defend: images.get('knight_defend'),
				hurt: images.get('knight_hurt'),
				death: images.get('knight_death'),
				jump: images.get('knight_jump'),
				// Map enemy animations to knight equivalents for compatibility
				flying: images.get('knight_walk'), // Use walk for flying
				attack: images.get('knight_attack1') // Use attack1 for basic attack
			};
			
			// Log sprite loading status
			for (const [name, sprite] of Object.entries(this.sprites)) {
				if (!sprite) {
					console.warn(`⚠️ Knight sprite '${name}' failed to load`);
				}
			}
			
			// console.log('✅ Knight sprites initialized successfully');
		} catch (error) {
			console.error('❌ Error initializing knight sprites:', error);
		}
	}
	
	// Override takeDamage to implement blocking and damage numbers
	takeDamage(amount, elementalType = null, isParried = false) {
		if (this.isDead || this.state === 'death') return false;
		
		let finalDamage = amount;
		
		// Handle parry attacks - they bypass blocking and do extra damage
		if (isParried) {
			finalDamage = Math.floor(amount * 1.5);
			//console.log(`🎯 Knight takes parry damage (cannot block)!`);
		} else {
			// Check if knight blocks the attack (only for non-parried attacks)
			if (Math.random() < this.blockChance && !this.isBlocking) {
				this.changeState(KnightStateName.Block);
				// Show "Attack Blocked" message
				this.showBlockedMessage();
				//console.log(`🛡️ Knight blocked attack!`);
				return; // No damage taken
			}
		}
		
		// Apply elemental effects
		if (elementalType) {
			switch (elementalType) {
				case 'fire':
					this.applyBurn(5, 3);
					break;
				case 'ice':
					this.applySlow(4);
					break;
				case 'water':
					finalDamage = Math.floor(finalDamage * 1.25);
					break;
			}
		}
		
		// Apply damage and show damage number
		this.health -= finalDamage;
		this.showDamageText(finalDamage);
		//console.log(`Knight took ${finalDamage} damage! Health: ${this.health}/${this.maxHealth}`);
		
		// Check if dead
		if (this.health <= 0) {
			this.health = 0;
			this.isDead = true;
			this.changeState(KnightStateName.Death);
			//console.log(`Knight died! Drops ${this.xpDrop} XP`);
			return true; // Return XP
		} else {
			this.changeState(KnightStateName.Hurt);
		}
		
		// No hurt state - knight continues current behavior
		return false;
	}
	
	showBlockedMessage() {
		// Create floating text effect for "Attack Blocked"
		if (this.blockedTextTimer <= 0) {
			this.blockedText = "ATTACK BLOCKED!";
			this.blockedTextTimer = 2.0; // Show for 2 seconds
			this.blockedTextY = this.position.y - 20;
			this.blockedTextAlpha = 1.0;
		}
	}
	
	// Override to use knight running sound
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
			// Just started moving - play knight running sound
			if (window.gameState && window.gameState.sounds) {
				this.runningSound = window.gameState.sounds.get('knightrunning');
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
	
	showDamageText(damage) {
		// Create floating damage number
		this.damageText = `-${damage}`;
		this.damageTextTimer = 1.5; // Show for 1.5 seconds
		this.damageTextY = this.position.y - 30; // Start slightly higher than blocked text
		this.damageTextAlpha = 1.0;
	}
	
	showParryText() {
		// Create floating parry indicator
		this.parryText = "PARRIED!";
		this.parryTextTimer = 2.0; // Show for 2 seconds
		this.parryTextY = this.position.y - 40; // Start above damage text
		this.parryTextAlpha = 1.0;
	}
	
	// Override update method to handle knight-specific behavior
	update(dt, player = null) {
		// Update animation
		this.updateAnimation(dt);
		
		// Update status effects
		this.updateStatusEffects(dt);
		
		// Update state machine
		this.stateMachine.update(dt, player);
		
		// Update timers
		this.lastAttackTime += dt;
		
		// Handle blocked text animation
		if (this.blockedTextTimer > 0) {
			this.blockedTextTimer -= dt;
			this.blockedTextY -= 30 * dt; // Float upward
			this.blockedTextAlpha = this.blockedTextTimer / 2.0; // Fade out
		}
		
		// Handle damage text animation
		if (this.damageTextTimer > 0) {
			this.damageTextTimer -= dt;
			this.damageTextY -= 40 * dt; // Float upward faster than blocked text
			this.damageTextAlpha = this.damageTextTimer / 1.5; // Fade out over 1.5 seconds
		}
		
		// Handle parry text animation
		if (this.parryTextTimer > 0) {
			this.parryTextTimer -= dt;
			this.parryTextY -= 50 * dt; // Float upward fastest
			this.parryTextAlpha = this.parryTextTimer / 2.0; // Fade out over 2 seconds
		}
		
		// Update hitbox position manually
		if (this.hitbox) {
			this.hitbox.position.x = this.position.x;
			this.hitbox.position.y = this.position.y;
		}
	}
	
	// Override render method to fix positioning and draw blocked text
	render() {
		const animKey = String(this.currentAnimation || '').toLowerCase().trim();
		const spriteSheet = this.sprites[animKey] || this.sprites[this.currentAnimation];
		
		if (spriteSheet && spriteSheet.image && spriteSheet.image.complete) {
			// Use natural size but fix hurt frame calculation
			const sheetW = spriteSheet.image.naturalWidth || spriteSheet.image.width || spriteSheet.width;
			const sheetH = spriteSheet.image.naturalHeight || spriteSheet.image.height || spriteSheet.height;
			let framesForAnim = this.frameCount[animKey];
			
			if (!framesForAnim) {
				// Try to calculate from frameConfig if available (fixes "3 knights in one" bug)
				if (this.frameConfig && this.frameConfig.frameWidth) {
					framesForAnim = Math.floor(sheetW / this.frameConfig.frameWidth);
				}
				
				// Ensure at least 1 frame
				if (!framesForAnim || framesForAnim < 1) {
					framesForAnim = 1;
				}
				// console.warn(`⚠️ Knight animation '${animKey}' not found in frameCount, using calculated ${framesForAnim}`);
			}
			
			// Standard calculation for all animations
			const srcW = Math.floor(sheetW / framesForAnim);
			const srcH = sheetH;
			
			const frameIndex = this.currentFrame % framesForAnim;
			const srcX = frameIndex * srcW;
			const srcY = 0;
			
			// Destination position - center the sprite on entity position (same as Enemy class)
			const destX = this.position.x - this.frameWidth / 2; // Center horizontally 
			const destY = this.position.y - this.frameHeight / 2; // Center vertically
			
			// Knight sheets face right by default; flip when moving left
			const shouldFlip = this.patrolDirection === Math.PI; // PI = moving left
			
				if (shouldFlip) {
				// Save context and flip horizontally
				context.save();
				context.scale(-1, 1); // Flip horizontally
				context.drawImage(
					spriteSheet.image,
					srcX, srcY, srcW, srcH, // Dynamic source rect
					-destX - this.frameWidth, destY, this.frameWidth, this.frameHeight // Flipped destination
				);
				context.restore();
			} else {
				// Draw normally (facing left)
					context.drawImage(
						spriteSheet.image,
						srcX, srcY, srcW, srcH, // Dynamic source rect
						destX, destY, this.frameWidth, this.frameHeight // Destination
					);
			}
			
			// Draw health bar above knight (adjust position for smaller sprite)
			this.renderHealthBar(context);
			
			// Draw status effect indicators and crit text
			this.renderStatusEffects(context);
		} else {
			// Fallback: draw red debug box if sprite fails to load
			context.fillStyle = 'red';
			context.fillRect(this.position.x - 16, this.position.y - 16, 32, 32);
			context.fillStyle = 'white';
			context.font = '10px Arial';
			context.fillText('NO SPRITE', this.position.x - 15, this.position.y);
			console.warn('Knight sprite not loaded:', this.currentAnimation);
		}
		
		// Draw "Attack Blocked" text if active
		if (this.blockedTextTimer > 0 && this.blockedText) {
			context.save();
			
			// Set text properties
			context.font = 'bold 14px Arial';
			context.fillStyle = `rgba(255, 215, 0, ${this.blockedTextAlpha})`; // Gold color with fade
			context.strokeStyle = `rgba(0, 0, 0, ${this.blockedTextAlpha})`;
			context.lineWidth = 2;
			context.textAlign = 'center';
			
			// Draw text with outline (position above knight)
			const textX = this.position.x;
			const textY = this.blockedTextY;
			
			context.strokeText(this.blockedText, textX, textY);
			context.fillText(this.blockedText, textX, textY);
			
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
			
			// Draw text with outline (position above knight)
			const textX = this.position.x + 25; // Offset to right of blocked text
			const textY = this.damageTextY;
			
			context.strokeText(this.damageText, textX, textY);
			context.fillText(this.damageText, textX, textY);
			
			context.restore();
		}
		
		// Draw parry text if active
		if (this.parryTextTimer > 0 && this.parryText) {
			context.save();
			
			// Set text properties
			context.font = 'bold 18px Arial';
			context.fillStyle = `rgba(255, 215, 0, ${this.parryTextAlpha})`; // Gold color with fade
			context.strokeStyle = `rgba(0, 0, 0, ${this.parryTextAlpha})`;
			context.lineWidth = 2;
			context.textAlign = 'center';
			
			// Draw text with outline (position above knight)
			context.strokeText(this.parryText, this.position.x, this.parryTextY);
			context.fillText(this.parryText, this.position.x, this.parryTextY);
			
			context.restore();
		}
	}
	
	getAttackDamage() {
		// Base damage scales with level
		return 20 + (this.level * 3); // Level 3 = 29 damage, Level 9 = 47 damage
	}

	// Override playAttackSound to use knight specific sounds
	playAttackSound() {
		if (window.gameState && window.gameState.playSFX) {
			// Play sword swing sound
			window.gameState.playSFX('sword-swing', 0.4);
			//console.log('⚔️ Knight playing attack sound');
		}
	}
}
