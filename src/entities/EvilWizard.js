import Enemy from "./Enemy.js";
import { images, canvas, context } from "../globals.js";

export default class EvilWizard extends Enemy {
	constructor(x, y, levelMaker = null) {
		super(x, y, 'evil_wizard', levelMaker);
		
		// Override frame dimensions for wizard (much larger display)
		this.frameWidth = 160;
		this.frameHeight = 160;
		
		// Set proper entity dimensions (collision box - smaller than display)
		this.width = 80;
		this.height = 80;
		
		// Wizard specific properties
		this.isRangedAttacker = true;
		this.attackRange = 100; // Medium range for fireball attacks
		this.detectionRange = 180; // Better detection for ranged enemy
		
		// Wizard level range (12+)
		this.level = Math.floor(Math.random() * 5) + 12; // Random level 12-16
		this.maxHealth = this.getWizardMaxHealthForLevel(this.level);
		this.health = this.maxHealth;
		this.xpDrop = this.getWizardXPDropForLevel(this.level);
		
		// Combat properties
		this.attackCooldown = 3.0; // Slower but more powerful attacks
		this.chaseSpeed = 40; // Slower movement (wizards aren't fast)
		this.speed = 30; // Slower patrol speed
		
		// Fireball properties
		this.fireballs = [];
		this.fireballSpeed = 150; // pixels per second
		this.fireballDamage = 25; // Base fireball damage
		
		// Set running sound
		this.runningSoundKey = 'wizardrunning';
		
		// Initialize wizard-specific sprites
		this.initializeWizardSprites();
		
		//console.log(`🧙 Evil Wizard created - Level ${this.level}, Health: ${this.health}`);
	}
	
	getWizardMaxHealthForLevel(level) {
		// Wizards are powerful but fragile
		return 80 + (level * 15); // Level 12 = 260 HP, Level 16 = 320 HP
	}
	
	getWizardXPDropForLevel(level) {
		// Wizards give lots of XP
		return 100 + (level * 20); // Level 12 = 340 XP, Level 16 = 420 XP
	}
	
	// Initialize wizard sprites
	initializeWizardSprites() {
		try {
			// Load wizard sprite sheets
			this.sprites = {
				idle: images.get('wizard_idle'),
				move: images.get('wizard_move'),
				attack: images.get('wizard_attack'),
				takehit: images.get('wizard_takehit'),
				death: images.get('wizard_death'),
				// Map enemy animations to wizard equivalents for compatibility
				flying: images.get('wizard_move'), // Use move for flying
				hurt: images.get('wizard_takehit') // Use takehit for hurt
			};
			
			// Frame configuration for wizard sprites (320x64 sheets with 8 frames = 40x64 per frame)
			this.frameConfig = {
				frameWidth: 40,
				frameHeight: 64
			};
			
			// Frame counts for each animation (actual counts from sprite sheets)
			this.frameCount = {
				idle: 8,      // 8 frames
				move: 8,      // 8 frames  
				attack: 8,    // 8 frames
				takehit: 4,   // 4 frames
				death: 5,     // 5 frames
				// Compatibility mappings
				flying: 8,    // Use move frames
				hurt: 4       // Use takehit frames
			};
			
			// Log sprite loading status
			for (const [name, sprite] of Object.entries(this.sprites)) {
				if (!sprite) {
					console.warn(`⚠️ Wizard sprite '${name}' failed to load`);
				} else {
					//console.log(`✅ Wizard sprite '${name}' loaded successfully`);
				}
			}
			
			//console.log('✅ Wizard sprites initialized successfully');
		} catch (error) {
			console.error('❌ Error initializing wizard sprites:', error);
		}
	}
	
	// Override update to handle ranged attacks and fireballs
	update(dt, player = null) {
		this.target = player; // Store player reference for attack logic
		// Update fireballs first
		this.updateFireballs(dt, player);
		
		// Call parent update for normal AI
		super.update(dt, player);
	}
	
	updateFireballs(dt, player) {
		// Update existing fireballs
		for (let i = this.fireballs.length - 1; i >= 0; i--) {
			const fireball = this.fireballs[i];
			
			// Move fireball
			fireball.x += fireball.velocityX * dt;
			fireball.y += fireball.velocityY * dt;
			
			// Update lifetime
			fireball.lifetime -= dt;
			
			// Check collision with player
			if (player && !player.isDead) {
				const distance = Math.sqrt(
					(player.position.x - fireball.x) ** 2 + 
					(player.position.y - fireball.y) ** 2
				);
				
				if (distance <= 20) { // Fireball hit radius
					// Check if player is dashing (dodge)
					if (player.isDashing) {
						player.showDodgeText();
						//console.log('🏃 Player dodged wizard fireball!');
					} else {
						// Hit player
						const damage = this.fireballDamage + (this.level * 2);
						player.takeDamage(damage);
						//console.log(`🔥 Wizard fireball hit player for ${damage} damage!`);
					}
					
					// Remove fireball
					this.fireballs.splice(i, 1);
					continue;
				}
			}
			
			// Check collision with walls (optional - fireballs can pass through walls for now)
			// Remove fireball if lifetime expired or out of bounds
			if (fireball.lifetime <= 0 || 
				fireball.x < 0 || fireball.x > 2000 || 
				fireball.y < 0 || fireball.y > 2000) {
				this.fireballs.splice(i, 1);
			}
		}
	}
	
	// performAttack removed - logic moved to playAttackSound to integrate with Enemy state machine
	
	// Override getAttackDamage to return 0 (wizards don't do melee damage)
	getAttackDamage() {
		return 0; // Wizards only damage with fireballs
	}
	
	shootFireball(target) {
		if (!target) return;
		
		// Calculate direction to target
		const dx = target.position.x - this.position.x;
		const dy = target.position.y - this.position.y;
		const distance = Math.sqrt(dx * dx + dy * dy);
		
		// Set facing direction for attack animation based on fireball direction
		// If attacking more horizontally, face that direction
		// If attacking more vertically, face the closer horizontal direction or default to current
		if (Math.abs(dx) > Math.abs(dy) * 0.5) { // More horizontal than vertical (or close)
			this.patrolDirection = dx > 0 ? 0 : Math.PI; // Face right if dx > 0, left if dx < 0
		}
		// For purely vertical attacks, keep current facing direction
		
		// Normalize direction
		const dirX = dx / distance;
		const dirY = dy / distance;
		
		// Create fireball
		const fireball = {
			x: this.position.x,
			y: this.position.y,
			velocityX: dirX * this.fireballSpeed,
			velocityY: dirY * this.fireballSpeed,
			lifetime: 3.0 // 3 seconds max flight time
		};
		
		this.fireballs.push(fireball);
	}
	
	// Override render method
	render() {
		const animKey = String(this.currentAnimation || '').toLowerCase();
		const spriteSheet = this.sprites[animKey] || this.sprites[this.currentAnimation];
		
		if (spriteSheet && spriteSheet.image && spriteSheet.image.complete) {
			// Use natural image size for proper frame calculation
			const sheetW = spriteSheet.image.naturalWidth || spriteSheet.image.width || spriteSheet.width;
			const sheetH = spriteSheet.image.naturalHeight || spriteSheet.image.height || spriteSheet.height;
			let framesForAnim = this.frameCount[animKey];
			if (!framesForAnim) {
				// Safe defaults
				framesForAnim = 5;
				console.warn(`⚠️ Wizard animation '${animKey}' not found in frameCount, using default ${framesForAnim}`);
			}
			
			// Proper frame calculation - most sheets have 8 frames (320/8=40px), takehit has 4 frames (320/4=80px)
			const srcW = Math.floor(sheetW / framesForAnim);
			const srcH = sheetH;
			const frameIndex = this.currentFrame % framesForAnim;
			const srcX = frameIndex * srcW;
			const srcY = 0;
			
			// Destination position (centered on wizard position)
			const destX = this.position.x - this.frameWidth / 2;
			const destY = this.position.y - this.frameHeight / 2;
			
			// Check if we need to flip the sprite
			const shouldFlip = this.patrolDirection === Math.PI; // PI = moving left
			
			if (shouldFlip) {
				// Save context and flip horizontally
				context.save();
				context.scale(-1, 1);
				context.drawImage(
					spriteSheet.image,
					srcX, srcY, srcW, srcH, // Dynamic source rect
					-destX - this.frameWidth, destY, this.frameWidth, this.frameHeight // Flipped destination
				);
				context.restore();
			} else {
				// Draw normally
				context.drawImage(
					spriteSheet.image,
					srcX, srcY, srcW, srcH, // Dynamic source rect
					destX, destY, this.frameWidth, this.frameHeight // Destination
				);
			}
			
			// Draw health bar above wizard
			this.renderHealthBar(context);
			
			// Draw status effect indicators
			this.renderStatusEffects(context);
		} else {
			// Fallback: draw purple debug box
			context.fillStyle = 'purple';
			context.fillRect(this.position.x - 32, this.position.y - 32, 64, 64);
			context.fillStyle = 'white';
			context.font = '10px Arial';
			context.fillText('NO WIZARD SPRITE', this.position.x - 25, this.position.y);
			console.warn('Wizard sprite not loaded:', this.currentAnimation);
		}
		
		// Render fireballs
		this.renderFireballs();
	}
	
	renderFireballs() {
		for (const fireball of this.fireballs) {
			context.save();
			
			// Draw fireball as orange circle with flame effect
			const gradient = context.createRadialGradient(
				fireball.x, fireball.y, 0,
				fireball.x, fireball.y, 12
			);
			gradient.addColorStop(0, '#FFFF00'); // Yellow center
			gradient.addColorStop(0.5, '#FF4500'); // Orange middle
			gradient.addColorStop(1, '#FF0000'); // Red outer
			
			context.fillStyle = gradient;
			context.beginPath();
			context.arc(fireball.x, fireball.y, 12, 0, Math.PI * 2);
			context.fill();
			
			// Add glow effect
			context.shadowColor = '#FF4500';
			context.shadowBlur = 10;
			context.beginPath();
			context.arc(fireball.x, fireball.y, 8, 0, Math.PI * 2);
			context.fill();
			
			context.restore();
		}
	}
	
	// Override animation mapping
	updateAnimation() {
		// Map states to wizard animations
		switch (this.state) {
			case 'idle':
				this.currentAnimation = 'idle';
				break;
			case 'patrol':
				this.currentAnimation = 'move';
				break;
			case 'chase':
				this.currentAnimation = 'move';
				break;
			case 'attack':
				this.currentAnimation = 'attack';
				break;
			case 'hurt':
				this.currentAnimation = 'takehit';
				break;
			case 'death':
				this.currentAnimation = 'death';
				break;
			default:
				this.currentAnimation = 'idle';
		}
		
		// Update frame animation
		this.animationTime += 0.016; // Approximate dt for 60fps
		
		if (this.animationTime >= this.animationSpeed) {
			this.animationTime = 0;
			
			// Get current animation frame count
			const maxFrames = this.frameCount[this.currentAnimation] || 1;
			
			// For death animation, don't loop - stay on last frame
			if (this.currentAnimation === 'death') {
				if (this.currentFrame < maxFrames - 1) {
					this.currentFrame++;
				}
			} else {
				this.currentFrame = (this.currentFrame + 1) % maxFrames;
			}
		}
	}
	
	getAttackDamage() {
		// Base damage for melee attacks (if any)
		return 15 + (this.level * 2); // Fireballs use separate damage calculation
	}

	// Override to use wizard running sound
	handleRunningSound(isMoving, distanceToPlayer) {
		// Stop sound if wizard is dead
		if (this.isDead || this.state === 'death') {
			if (this.runningSound) {
				this.runningSound.pause();
				this.runningSound = null;
			}
			return;
		}

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
			// Just started moving - play wizard running sound
			if (window.gameState && window.gameState.sounds) {
				this.runningSound = window.gameState.sounds.get('wizardrunning');
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

	// Override playAttackSound to handle fireball shooting and sound
	playAttackSound() {
		// Play wizard attack sound
		if (window.gameState && window.gameState.playSFX) {
			//console.log('🧙 EvilWizard: Requesting wizardattack sound');
			window.gameState.playSFX('wizardattack', 0.8);
		} else {
			console.error('🧙 EvilWizard: Cannot play sound, gameState or playSFX missing');
		}
		
		// Create fireball projectile if we have a target
		if (this.target) {
			this.shootFireball(this.target);
			//console.log('🧙 Wizard shoots fireball attack!');
		}
	}
}