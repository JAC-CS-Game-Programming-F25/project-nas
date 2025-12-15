import Vector from "../../lib/Vector.js";
import Hitbox from "../../lib/Hitbox.js";
import Direction from "../enums/Direction.js";

export default class GameEntity {
	/**
	 * Base class for all game entities (player, enemies, NPCs, etc.)
	 */
	constructor(x = 0, y = 0, width = 16, height = 16) {
		this.position = new Vector(x, y);
		this.dimensions = new Vector(width, height);
		this.velocity = new Vector(0, 0);
		this.hitbox = new Hitbox(x, y, width, height);
		
		// Visual properties
		this.sprites = [];
		this.currentAnimation = null;
		this.currentFrame = 0;
		this.direction = Direction.Down;
		
		// Game properties
		this.health = 100;
		this.maxHealth = 100;
		this.isDead = false;
		this.isCollidable = true;
		this.renderPriority = 0;
		
		// Movement
		this.speed = 100; // pixels per second
	}

	/**
	 * Update entity logic
	 * @param {number} dt Delta time in seconds
	 */
	update(dt) {
		// Update position based on velocity
		this.position.x += this.velocity.x * dt;
		this.position.y += this.velocity.y * dt;
		
		// Update hitbox position
		this.hitbox.position.x = this.position.x;
		this.hitbox.position.y = this.position.y;
		
		// Update animation if present
		if (this.currentAnimation) {
			this.currentAnimation.update(dt);
		}
	}

	/**
	 * Render the entity
	 * @param {object} offset Optional camera offset
	 */
	render(offset = { x: 0, y: 0 }) {
		if (this.currentAnimation) {
			this.currentAnimation.render(
				this.position.x - offset.x,
				this.position.y - offset.y
			);
		} else if (this.sprites && this.sprites.length > 0) {
			// Render current sprite based on direction and frame
			const spriteIndex = this.direction * 4 + Math.floor(this.currentFrame);
			if (this.sprites[spriteIndex]) {
				this.sprites[spriteIndex].render(
					this.position.x - offset.x,
					this.position.y - offset.y
				);
			}
		}
	}

	/**
	 * Check collision with another entity
	 * @param {GameEntity} entity Other entity to check
	 * @returns {boolean} True if colliding
	 */
	didCollideWithEntity(entity) {
		return this.hitbox.didCollideWithHitbox(entity.hitbox);
	}

	/**
	 * Move the entity by a given amount
	 * @param {number} dx Change in X position
	 * @param {number} dy Change in Y position
	 */
	move(dx, dy) {
		this.position.x += dx;
		this.position.y += dy;
		this.hitbox.position.x = this.position.x;
		this.hitbox.position.y = this.position.y;
	}

	/**
	 * Set the entity's position
	 * @param {number} x New X position
	 * @param {number} y New Y position
	 */
	setPosition(x, y) {
		this.position.x = x;
		this.position.y = y;
		this.hitbox.position.x = x;
		this.hitbox.position.y = y;
	}

	/**
	 * Take damage
	 * @param {number} amount Damage amount
	 */
	takeDamage(amount) {
		this.health -= amount;
		if (this.health <= 0) {
			this.health = 0;
			this.isDead = true;
		}
	}

	/**
	 * Heal the entity
	 * @param {number} amount Heal amount
	 */
	heal(amount) {
		this.health = Math.min(this.health + amount, this.maxHealth);
	}
}
