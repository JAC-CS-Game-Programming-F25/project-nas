import GameEntity from './GameEntity.js';
import { images, context } from '../globals.js';

export default class Chest extends GameEntity {
	constructor(x, y, chestName = 'TutorialChest1') {
		super();
		
		this.position = { x, y };
		this.dimensions = { width: 48, height: 40 }; // Big chest size
		this.chestName = chestName;
		
		// Animation properties
		this.currentFrame = 0;
		this.animationTimer = 0;
		this.animationSpeed = 0.4; // Seconds per frame (slower animation)
		this.totalFrames = 9; // Opening animation has 9 frames
		this.isOpening = false;
		this.isOpened = false;
		this.canInteract = true;
		this.isVisible = true; // Track visibility
		
		// Collision box
		this.hitbox = {
			x: this.position.x,
			y: this.position.y,
			width: this.dimensions.width,
			height: this.dimensions.height
		};
		
		// Set chest type and spritesheet position based on name
		this.setChestType(chestName);
		
		// Load chest sprite
		this.sprite = images.get('chest');
		
		//console.log(`Chest created at (${x}, ${y}) - Name: ${chestName}, Row: ${this.spritesheetRow}`);
		//console.log(`📦 Chest hitbox: (${this.hitbox.x}, ${this.hitbox.y}) ${this.hitbox.width}x${this.hitbox.height}`);
		if (!this.sprite) {
			console.error('Failed to load chest sprite!');
		} else {
			//console.log(`✅ Chest sprite loaded: ${this.sprite.width}x${this.sprite.height}`);
		}
	}
	
	/**
	 * Set chest type and spritesheet position based on chest name
	 */
	setChestType(chestName) {
		// Define chest positions in spritesheet (0-indexed)
		switch (chestName) {
			case 'TutorialChest1':
				this.spritesheetRow = 3; // 4th row (0-indexed)
				this.spritesheetCol = 12; // 13th column (0-indexed)
				break;
			case 'TutorialChest2':
				this.spritesheetRow = 1; // 2nd row (0-indexed)
				this.spritesheetCol = 12; // 13th column (0-indexed)
				break;
			case 'TutorialChest3':
				this.spritesheetRow = 5; // 6th row (0-indexed)
				this.spritesheetCol = 12; // 13th column (0-indexed)
				break;
			default:
				// Default to first chest
				this.spritesheetRow = 3;
				this.spritesheetCol = 12;
				break;
		}
	}
	
	update(dt) {
		// Update hitbox position
		this.hitbox.x = this.position.x;
		this.hitbox.y = this.position.y;
		
		// Update opening animation
		if (this.isOpening && !this.isOpened) {
			this.animationTimer += dt;
			
			if (this.animationTimer >= this.animationSpeed) {
				this.animationTimer = 0;
				this.currentFrame++;
				
				// Check if animation is complete (9 frames: 0-8)
				if (this.currentFrame >= this.totalFrames) {
					this.currentFrame = this.totalFrames - 1;
					this.isOpened = true;
					this.isOpening = false;
					this.canInteract = false;
					//console.log('Chest opening animation complete!');
					// Trigger completion callback if set
					if (this.onOpenComplete) {
						//console.log(`🎆 Calling onOpenComplete for ${this.chestName}`);
						this.onOpenComplete(this);
					} else {
						//console.log(`❌ No onOpenComplete callback set for ${this.chestName}`);
					}
				}
			}
		}
	}
	
	render() {
		// Don't render if not visible
		if (!this.isVisible) return;
		
		if (!this.sprite) {
			// Fallback rendering if sprite not loaded
			context.fillStyle = '#8B4513'; // Brown color for chest
			context.fillRect(
				this.position.x, 
				this.position.y, 
				this.dimensions.width, 
				this.dimensions.height
			);
			
			// Draw a simple treasure chest shape
			context.fillStyle = '#FFD700'; // Gold color for lock/trim
			context.fillRect(
				this.position.x + 20, 
				this.position.y + 15, 
				8, 
				10
			);
			return;
		}
		
		// Calculate frame position in spritesheet
		const frameWidth = 48;
		const frameHeight = 40;
		// Opening animation: frames are to the right of the initial closed chest frame
		// Closed chest is at spritesheetCol, opening frames are spritesheetCol + 1 through spritesheetCol + 9
		const frameOffset = this.isOpening || this.isOpened ? this.currentFrame + 1 : 0;
		const frameX = (this.spritesheetCol + frameOffset) * frameWidth;
		const frameY = this.spritesheetRow * frameHeight;
		
		try {
			context.drawImage(
				this.sprite.image,
				frameX, frameY, frameWidth, frameHeight, // Source
				this.position.x, this.position.y, this.dimensions.width, this.dimensions.height // Destination
			);
		} catch (error) {
			console.error('Error rendering chest sprite:', error);
			// Fallback to colored rectangle
			context.fillStyle = this.isOpened ? '#90EE90' : '#8B4513';
			context.fillRect(
				this.position.x, 
				this.position.y, 
				this.dimensions.width, 
				this.dimensions.height
			);
		}
	}
	
	/**
	 * Check if player is near enough to interact with chest
	 */
	isPlayerNearby(player) {
		if (!player || !this.canInteract) return false;
		
		// Calculate center-to-center distance
		const chestCenterX = this.position.x + this.dimensions.width / 2;
		const chestCenterY = this.position.y + this.dimensions.height / 2;
		
		const playerCenterX = player.position.x + player.dimensions.x / 2;
		const playerCenterY = player.position.y + player.dimensions.y / 2;
		
		const distance = Math.sqrt(
			(chestCenterX - playerCenterX) ** 2 + 
			(chestCenterY - playerCenterY) ** 2
		);
		
		const isNear = distance <= 60;
		
		// Interaction range of 60 pixels
		return isNear;
	}
	
	/**
	 * Open the chest and trigger animation
	 */
	open() {
		if (this.canInteract && !this.isOpening && !this.isOpened) {
			this.isOpening = true;
			this.currentFrame = 0;
			this.animationTimer = 0;
			
			// Play chest open sound
			if (window.gameState && window.gameState.playSFX) {
				window.gameState.playSFX('chestboxopen', 0.6);
			}
			
			//console.log('Opening chest!');
			return true; // Successfully opened
		}
		return false; // Could not open
	}
	
	/**
	 * Get the center position of the chest
	 */
	getCenterPosition() {
		return {
			x: this.position.x + this.dimensions.width / 2,
			y: this.position.y + this.dimensions.height / 2
		};
	}

	/**
	 * Hide the chest (make it disappear)
	 */
	hide() {
		this.isVisible = false;
		this.canInteract = false;
	}

	/**
	 * Set callback for when chest opening animation completes
	 */
	setOnOpenComplete(callback) {
		this.onOpenComplete = callback;
	}

	/**
	 * Check collision with another entity
	 */
	checkCollision(entity) {
		if (!this.isVisible) return false;
		
		const collision = entity.position.x < this.hitbox.x + this.hitbox.width &&
			   entity.position.x + entity.dimensions.x > this.hitbox.x &&
			   entity.position.y < this.hitbox.y + this.hitbox.height &&
			   entity.position.y + entity.dimensions.y > this.hitbox.y;
		
		if (collision) {
			// //console.log(`🔥 Collision detected! Player: (${entity.position.x}, ${entity.position.y}) ${entity.dimensions.x}x${entity.dimensions.y}, Chest: (${this.hitbox.x}, ${this.hitbox.y}) ${this.hitbox.width}x${this.hitbox.height}`);
		}
		
		return collision;
	}
}