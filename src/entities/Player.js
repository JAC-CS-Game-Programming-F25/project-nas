import GameEntity from "./GameEntity.js";
import { context, input, images } from "../globals.js";
import Sprite from "../../lib/Sprite.js";
import Vector from "../../lib/Vector.js";
import Direction from "../enums/Direction.js";
import StateMachine from "../../lib/StateMachine.js";
import PlayerStateName from "../enums/PlayerStateName.js";
import PlayerIdleState from "../states/entity/player/PlayerIdleState.js";
import PlayerWalkState from "../states/entity/player/PlayerWalkState.js";
import PlayerAttackState from "../states/entity/player/PlayerAttackState.js";
import PlayerDashState from "../states/entity/player/PlayerDashState.js";
import PlayerParryState from "../states/entity/player/PlayerParryState.js";

export default class Player extends GameEntity {
	static WIDTH = 16;
	static HEIGHT = 16;
	static SPEED = 120; // pixels per second

	/**
	 * The player character controlled by user input.
	 */
	constructor(x = 0, y = 0) {
		super(x, y, Player.WIDTH, Player.HEIGHT);
		
		this.speed = Player.SPEED;
		this.direction = Direction.Down;
		
		// Health system
		this.maxHealth = 100;
		this.health = this.maxHealth;
		this.isDead = false;
		this.damageImmunityTimer = 0;
		this.damageImmunityDuration = 1.0; // 1 second of immunity after taking damage
		this.damageMultiplier = 1.0; // Multiplier for incoming damage (set by game mode)
		
		// Animation timing
		this.animationTimer = 0;
		this.animationSpeed = 0.2; // seconds per frame
		this.walkFrames = 4; // number of walking frames per direction
		this.isMoving = false;
		
		// Idle animation properties
		this.idleTimer = 0;
		this.idleDelay = 0.5; // Short delay for testing, change back to 3.0 later
		this.idleFrames = 8; // total idle animation frames
		this.currentIdleFrame = 0;
		this.idleAnimationSpeed = 0.15; // seconds per idle frame
		this.isIdleAnimating = false;
		this.idleFrameTimer = 0; // Separate timer for idle frame cycling
		
		// Dash properties
		this.isDashing = false;
		this.dashTimer = 0;
		this.dashDuration = 0.2; // 0.2 seconds dash duration
		this.dashSpeed = 300; // pixels per second during dash
		this.dashCooldown = 1.0; // 1 second cooldown
		this.dashCooldownTimer = 0;
		this.dashDirection = { x: 0, y: 0 };
		
		// Attack properties
		this.isAttacking = false;
		this.attackTimer = 0;
		this.attackDuration = 0.5; // 0.5 seconds attack duration
		this.attackCooldown = 0.8; // 0.8 second cooldown
		this.attackCooldownTimer = 0;
		this.attackType = 1; // 1 or 2 for ATTACK1/ATTACK2
		this.hasDealtDamage = false; // Prevent multiple damage per attack
		
		// Parry properties
		this.isParrying = false;
		this.parryTimer = 0;
		this.parryDuration = 0.3; // 0.3 seconds parry animation
		this.parryWindow = 0.15; // 0.15 seconds active parry window
		this.parryCooldown = 1.0; // 1 second cooldown
		this.parryCooldownTimer = 0;
		
		// Damage text properties
		this.damageText = null;
		this.damageTextTimer = 0;
		this.damageTextY = 0;
		this.damageTextAlpha = 0;
		
		// Running sound properties
		this.wasMoving = false;
		this.runningSound = null;
		this.wasDashing = false;
		
		// Dodge text properties
		this.dodgeText = null;
		this.dodgeTextTimer = 0;
		this.dodgeTextY = 0;
		this.dodgeTextAlpha = 0;
		this.currentAttackFrame = 0;
		this.attackFrameTimer = 0;
		this.attackAnimationSpeed = 0.06; // Fast attack animation
		
		// Load player sprites
		this.initializeSprites();

		// Initialize State Machine
		this.stateMachine = new StateMachine();
		this.stateMachine.add(PlayerStateName.Idle, new PlayerIdleState(this));
		this.stateMachine.add(PlayerStateName.Walk, new PlayerWalkState(this));
		this.stateMachine.add(PlayerStateName.Attack, new PlayerAttackState(this));
		this.stateMachine.add(PlayerStateName.Dash, new PlayerDashState(this));
		this.stateMachine.add(PlayerStateName.Parry, new PlayerParryState(this));
		
		this.stateMachine.change(PlayerStateName.Idle);
	}

	/**
	 * Initialize player sprite animations
	 */
	initializeSprites() {
		// Load directional sprite sheets
		this.sprites = {
			idle: {
				down: images.get('player_idle_down'),
				left: images.get('player_idle_left'),
				right: images.get('player_idle_right'),
				up: images.get('player_idle_up')
			},
			run: {
				down: images.get('player_run_down'),
				left: images.get('player_run_left'),
				right: images.get('player_run_right'),
				up: images.get('player_run_up')
			},
			attack1: {
				down: images.get('player_attack1_down'),
				left: images.get('player_attack1_left'),
				right: images.get('player_attack1_right'),
				up: images.get('player_attack1_up')
			},
			attack2: {
				down: images.get('player_attack2_down'),
				left: images.get('player_attack2_left'),
				right: images.get('player_attack2_right'),
				up: images.get('player_attack2_up')
			}
		};
		
		// Frame configuration for all new sprite sheets (96x80 per frame)
		this.frameConfig = {
			frameWidth: 96,
			frameHeight: 80,
			columns: 8, // 768px wide / 96px per frame = 8 frames
			rows: 1
		};
		
		// Direction mapping: 0=down, 1=left, 2=right, 3=up
		this.directionNames = ['down', 'left', 'right', 'up'];
		
		//console.log("Player sprites loaded with 96x80 frame dimensions");
	}

	/**
	 * Update attack1 sprites with ability-specific versions
	 */
	updateAbilitySprites(abilitySprites) {
		// Validate all sprites exist
		if (!abilitySprites.attack1_down || !abilitySprites.attack1_left || 
		    !abilitySprites.attack1_right || !abilitySprites.attack1_up) {
			console.error('Missing ability sprites! Cannot update.');
			return;
		}
		
		this.sprites.attack1 = {
			down: abilitySprites.attack1_down,
			left: abilitySprites.attack1_left,
			right: abilitySprites.attack1_right,
			up: abilitySprites.attack1_up
		};
		
		// Player attack sprites updated successfully
	}

	/**
	 * Update player movement and animation
	 * @param {number} dt Delta time in seconds
	 * @param {object} levelMaker Level instance for collision checking
	 */
	update(dt, levelMaker = null) {
		// Update damage immunity timer
		if (this.damageImmunityTimer > 0) {
			this.damageImmunityTimer -= dt;
		}
		
		// Update parry cooldown timer
		if (this.parryCooldownTimer > 0) {
			this.parryCooldownTimer -= dt;
		}

		// Update dash cooldown timer
		if (this.dashCooldownTimer > 0) {
			this.dashCooldownTimer -= dt;
		}

		// Update attack cooldown timer
		if (this.attackCooldownTimer > 0) {
			this.attackCooldownTimer -= dt;
		}
		
		// Handle damage text animation
		if (this.damageTextTimer > 0) {
			this.damageTextTimer -= dt;
			this.damageTextY -= 40 * dt; // Float upward
			this.damageTextAlpha = this.damageTextTimer / 1.5; // Fade out over 1.5 seconds
		}
		
		// Handle dodge text animation
		if (this.dodgeTextTimer > 0) {
			this.dodgeTextTimer -= dt;
			this.dodgeTextY -= 50 * dt; // Float upward faster
			this.dodgeTextAlpha = this.dodgeTextTimer / 1.2; // Fade out over 1.2 seconds
		}
		
		// Only process input and animation if player is alive
		if (!this.isDead) {
			this.stateMachine.update(dt, levelMaker);
		}
		
		// super.update(dt); // Removed to prevent GameEntity from trying to update currentAnimation
		
		// Manually update position and hitbox (logic from GameEntity.update)
		this.position.x += this.velocity.x * dt;
		this.position.y += this.velocity.y * dt;
		
		if (this.hitbox) {
			this.hitbox.position.x = this.position.x;
			this.hitbox.position.y = this.position.y;
		}
	}

	changeState(stateName, params) {
		this.stateMachine.change(stateName, params);
	}

	/**
	 * Start parry animation and window
	 */
	startParry() {
		this.changeState(PlayerStateName.Parry);
	}

	/**
	 * Player takes damage from enemies
	 * @param {number} damage Amount of damage to take
	 */
	takeDamage(damage) {
		// Check if player is immune to damage
		if (this.damageImmunityTimer > 0 || this.isDead) {
			return false;
		}
		
		// Apply damage multiplier based on game difficulty
		const finalDamage = Math.round(damage * this.damageMultiplier);
		
		this.health -= finalDamage;
		this.damageImmunityTimer = this.damageImmunityDuration;
		this.showDamageText(finalDamage);
		
		// Trigger minimal screen shake on damage
		if (window.gameState && window.gameState.cameraService) {
			window.gameState.cameraService.shake(5, 0.2);
		}

		if (this.health <= 0) {
			this.health = 0;
			this.isDead = true;
			return true; // Player died
		}
		
		return false; // Player still alive
	}

	/**
	 * Check if player is in active parry window
	 */
	isInParryWindow() {
		return this.isParrying && this.parryTimer <= this.parryWindow;
	}

	/**
	 * Successful parry - provide feedback
	 */
	successfulParry() {
		// Reset parry state
		this.isParrying = false;
		this.parryTimer = 0;
		this.changeState(PlayerStateName.Idle);
		
		// Trigger screen shake on successful parry
		if (window.gameState && window.gameState.cameraService) {
			window.gameState.cameraService.shake(10, 0.3);
		}
		
		return true;
	}

	/**
	 * Start attack animation
	 */
	startAttack() {
		this.changeState(PlayerStateName.Attack);
	}

	/**
	 * Start dash movement
	 */
	startDash(dx, dy) {
		this.changeState(PlayerStateName.Dash, { dx, dy });
	}

	/**
	 * Render the player
	 * @param {object} offset Camera offset
	 */
	render(offset = { x: 0, y: 0 }) {
		const screenX = this.position.x - offset.x;
		const screenY = this.position.y - offset.y;
		
		// Get current direction name
		const directionName = this.directionNames[this.direction];
		
		// Choose sprite sheet based on current state
		let spriteSheet;
		let frameIndex = 0;
		
		if (this.isParrying) {
			// Use attack2 sprites for parry
			spriteSheet = this.sprites.attack2[directionName];
			frameIndex = this.currentAttackFrame;
		} else if (this.isAttacking) {
			// Use attack sprites
			const attackType = `attack${this.attackType}`;
			spriteSheet = this.sprites[attackType][directionName];
			frameIndex = this.currentAttackFrame;
		} else if (this.isMoving || this.isDashing) {
			// Use running sprites for movement and dash
			spriteSheet = this.sprites.run[directionName];
			frameIndex = this.currentFrame;
		} else {
			// Use idle sprites
			spriteSheet = this.sprites.idle[directionName];
			if (this.isIdleAnimating) {
				frameIndex = this.currentIdleFrame;
			}
		}
		
		if (spriteSheet && spriteSheet.image && spriteSheet.image.complete) {
			
			// Calculate source position (96x80 per frame)
			const srcX = frameIndex * this.frameConfig.frameWidth;
			const srcY = 0; // Single row
			
			// Apply centering offset to account for whitespace around 22x34px character
			// Center the 96x80 frame over the player's 16x16 collision box
			const centerOffsetX = -40; // (96-16)/2 = 40px to center horizontally
			const centerOffsetY = -32; // (80-16)/2 = 32px to center vertically
			
			// Destination size and position
			const destWidth = 96;
			const destHeight = 80;
			const destX = screenX + centerOffsetX;
			const destY = screenY + centerOffsetY;
			
			context.drawImage(
				spriteSheet.image,
				srcX, srcY, this.frameConfig.frameWidth, this.frameConfig.frameHeight, // Source: 96x80
				destX, destY, destWidth, destHeight // Destination: centered over collision box
			);
		} else {
			// Fallback to colored rectangle if sprites aren't loaded
			context.save();
			
			// Draw player body - color changes based on direction for visual feedback
			const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
			context.fillStyle = colors[this.direction];
			context.fillRect(screenX, screenY, this.dimensions.x, this.dimensions.y);
			
			// Draw a border to make the player more visible
			context.strokeStyle = '#FFFFFF';
			context.lineWidth = 1;
			context.strokeRect(screenX, screenY, this.dimensions.x, this.dimensions.y);
			
			// Draw face/eyes
			context.fillStyle = '#000000';
			context.fillRect(screenX + 3, screenY + 3, 2, 2); // left eye
			context.fillRect(screenX + 11, screenY + 3, 2, 2); // right eye
			
			context.restore();
		}
		
		// Draw damage text if active
		if (this.damageTextTimer > 0 && this.damageText) {
			context.save();
			
			// Set text properties
			context.font = 'bold 18px Arial';
			context.fillStyle = `rgba(255, 0, 0, ${this.damageTextAlpha})`; // Red color with fade
			context.strokeStyle = `rgba(255, 255, 255, ${this.damageTextAlpha})`; // White outline for visibility
			context.lineWidth = 3;
			context.textAlign = 'center';
			
			// Draw text with outline (position above player)
			context.strokeText(this.damageText, this.position.x, this.damageTextY);
			context.fillText(this.damageText, this.position.x, this.damageTextY);
			
			context.restore();
		}
		
		// Draw dodge text if active
		if (this.dodgeTextTimer > 0 && this.dodgeText) {
			context.save();
			
			// Set text properties
			context.font = 'bold 16px Arial';
			context.fillStyle = `rgba(0, 255, 0, ${this.dodgeTextAlpha})`; // Green color with fade
			context.strokeStyle = `rgba(0, 0, 0, ${this.dodgeTextAlpha})`;
			context.lineWidth = 2;
			context.textAlign = 'center';
			
			// Draw text with outline (position above player)
			context.strokeText(this.dodgeText, this.position.x, this.dodgeTextY);
			context.fillText(this.dodgeText, this.position.x, this.dodgeTextY);
			
			context.restore();
		}
	}

	/**
	 * Start a dash in the given direction
	 * @param {number} dx Current movement X
	 * @param {number} dy Current movement Y
	 */
	startDash(dx, dy) {
		// If no movement input, dash in facing direction
		if (dx === 0 && dy === 0) {
			switch (this.direction) {
				case 0: // down
					this.dashDirection = { x: 0, y: 1 };
					break;
				case 1: // left
					this.dashDirection = { x: -1, y: 0 };
					break;
				case 2: // right
					this.dashDirection = { x: 1, y: 0 };
					break;
				case 3: // up
					this.dashDirection = { x: 0, y: -1 };
					break;
			}
		} else {
			// Normalize the direction
			const magnitude = Math.sqrt(dx * dx + dy * dy);
			this.dashDirection = {
				x: dx / magnitude,
				y: dy / magnitude
			};
		}
		
		this.isDashing = true;
		this.dashTimer = 0;
		this.dashCooldownTimer = this.dashCooldown;
		
		// Stop running sound when dashing
		if (this.runningSound) {
			this.runningSound.pause();
			this.runningSound = null;
		}
		
		// Play dash sound
		if (window.gameState && window.gameState.playSFX) {
			window.gameState.playSFX('dash', 0.5);
		}
		// Dash activated
	}

	/**
	 * Start an attack
	 */
	startAttack() {
		this.isAttacking = true;
		this.attackTimer = 0;
		this.currentAttackFrame = 0;
		this.attackFrameTimer = 0;
		
		// Always use attack1 for normal attacks (attack2 is reserved for parry)
		this.attackType = 1;
		
		// Play sword swing sound
		if (window.gameState && window.gameState.playSFX) {
			window.gameState.playSFX('sword-swing', 0.4);
		}
	}

	showDamageText(damage) {
		// Create floating damage number for player
		this.damageText = `-${damage}`;
		this.damageTextTimer = 1.5; // Show for 1.5 seconds
		this.damageTextY = this.position.y - 40; // Start above player
		this.damageTextAlpha = 1.0;
	}
	
	showDodgeText() {
		// Create floating dodge indicator
		this.dodgeText = "DODGED!";
		this.dodgeTextTimer = 1.2; // Show for 1.2 seconds
		this.dodgeTextY = this.position.y - 50; // Start above damage text
		this.dodgeTextAlpha = 1.0;
	}

	/**
	 * Get the center position of the player
	 * @returns {object} Object with x, y center coordinates
	 */
	getCenterPosition() {
		return {
			x: this.position.x + this.dimensions.x / 2,
			y: this.position.y + this.dimensions.y / 2
		};
	}

	/**
	 * Reset player to spawn position
	 * @param {number} x Spawn X coordinate
	 * @param {number} y Spawn Y coordinate
	 */
	reset(x, y) {
		this.setPosition(x, y);
		this.health = this.maxHealth;
		this.isDead = false;
		this.direction = 0;
		this.currentFrame = 0;
		this.isMoving = false;
		this.velocity.x = 0;
		this.velocity.y = 0;
		
		// Stop running sound when resetting
		if (this.runningSound) {
			this.runningSound.pause();
			this.runningSound = null;
		}
		this.wasMoving = false;
	}
}