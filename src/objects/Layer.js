import Tile from "./Tile.js";

export default class Layer {
	static BOTTOM = 0;
	static COLLISION = 1;
	static TOP = 2;

	/**
	 * A collection of tiles that comprises one layer of the map.
	 * Handles both regular layers and Tiled's infinite chunk-based layers.
	 *
	 * @param {object} layerDefinition Layer data from Tiled JSON
	 * @param {array} sprites Array of sprites for this layer
	 */
	constructor(layerDefinition, sprites) {
		this.name = layerDefinition.name;
		this.visible = layerDefinition.visible !== false;
		this.opacity = layerDefinition.opacity || 1;
		this.sprites = sprites;
		
		// Debug output for CaveBottom layer
		if (this.name === 'CaveBottom') {
			//console.log(`🏔️ Creating CaveBottom layer - visible: ${this.visible}, opacity: ${this.opacity}, sprites available: ${sprites ? sprites.length : 0}`);
		}
		
		// Handle chunk-based infinite maps
		if (layerDefinition.chunks) {
			this.chunks = new Map();
			this.isInfinite = true;
			this.processChunks(layerDefinition.chunks);
		} else {
			// Handle regular finite maps
			this.tiles = Layer.generateTiles(layerDefinition.data, sprites, this.isCollidable);
			this.width = layerDefinition.width;
			this.height = layerDefinition.height;
			this.isInfinite = false;
		}
	}

	/**
	 * Process chunk data for infinite maps.
	 *
	 * @param {array} chunks Array of chunk data from Tiled
	 */
	processChunks(chunks) {
		chunks.forEach(chunk => {
			const chunkKey = `${chunk.x},${chunk.y}`;
			const tiles = Layer.generateTiles(chunk.data, this.sprites, this.isCollidable);
			this.chunks.set(chunkKey, {
				tiles: tiles,
				x: chunk.x,
				y: chunk.y,
				width: chunk.width,
				height: chunk.height
			});
		});
	}

	/**
	 * Render all visible chunks within the viewport.
	 *
	 * @param {number} cameraX Camera X position in pixels
	 * @param {number} cameraY Camera Y position in pixels
	 * @param {number} viewWidth Viewport width in pixels
	 * @param {number} viewHeight Viewport height in pixels
	 */
	render(cameraX = 0, cameraY = 0, viewWidth = 800, viewHeight = 600) {
		if (!this.visible) return;

		if (this.isInfinite) {
			this.renderChunks(cameraX, cameraY, viewWidth, viewHeight);
		} else {
			this.renderRegular();
		}
	}

	/**
	 * Render chunks for infinite maps.
	 */
	renderChunks(cameraX, cameraY, viewWidth, viewHeight) {
		// Calculate which chunks are visible
		const startChunkX = Math.floor((cameraX - Tile.SIZE) / (16 * Tile.SIZE)) * 16;
		const endChunkX = Math.ceil((cameraX + viewWidth + Tile.SIZE) / (16 * Tile.SIZE)) * 16;
		const startChunkY = Math.floor((cameraY - Tile.SIZE) / (16 * Tile.SIZE)) * 16;
		const endChunkY = Math.ceil((cameraY + viewHeight + Tile.SIZE) / (16 * Tile.SIZE)) * 16;

		// Render visible chunks
		for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX += 16) {
			for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY += 16) {
				const chunkKey = `${chunkX},${chunkY}`;
				const chunk = this.chunks.get(chunkKey);
				
				if (chunk) {
					this.renderChunk(chunk, cameraX, cameraY, viewWidth, viewHeight);
				}
			}
		}
	}

	/**
	 * Render a single chunk.
	 */
	renderChunk(chunk, cameraX, cameraY, viewWidth = 800, viewHeight = 600) {
		for (let y = 0; y < chunk.height; y++) {
			for (let x = 0; x < chunk.width; x++) {
				const tile = chunk.tiles[x + y * chunk.width];
				if (tile) {
					const worldX = chunk.x + x;
					const worldY = chunk.y + y;
					
					// Only render if within the actual viewport bounds
					const pixelX = worldX * Tile.SIZE;
					const pixelY = worldY * Tile.SIZE;
					
					if (pixelX >= cameraX - Tile.SIZE && 
						pixelX <= cameraX + viewWidth + Tile.SIZE &&
						pixelY >= cameraY - Tile.SIZE && 
						pixelY <= cameraY + viewHeight + Tile.SIZE) {
						tile.render(worldX, worldY);
					}
				}
			}
		}
	}

	/**
	 * Render regular finite maps.
	 */
	renderRegular() {
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const tile = this.getTile(x, y);
				if (tile) {
					tile.render(x, y);
				}
			}
		}
	}

	/**
	 * Get a tile at specific coordinates (for finite maps).
	 *
	 * @param {number} x
	 * @param {number} y
	 * @returns The Tile that lives at (x, y) in the layer.
	 */
	getTile(x, y) {
		if (this.isInfinite) {
			// For infinite maps, we need to find the right chunk
			const chunkX = Math.floor(x / 16) * 16;
			const chunkY = Math.floor(y / 16) * 16;
			const chunkKey = `${chunkX},${chunkY}`;
			const chunk = this.chunks.get(chunkKey);
			
			if (chunk) {
				const localX = x - chunkX;
				const localY = y - chunkY;
				return chunk.tiles[localX + localY * chunk.width];
			}
			return null;
		} else {
			return this.tiles[x + y * this.width];
		}
	}

	/**
	 * Check if a tile is collidable at given coordinates.
	 *
	 * @param {number} x Tile X coordinate
	 * @param {number} y Tile Y coordinate
	 * @returns {boolean} Whether the tile blocks movement
	 */
	isTileCollidable(x, y) {
		const tile = this.getTile(x, y);
		const isCollidable = tile && tile.isCollidable;
		if (isCollidable) {
			//console.log(`🚫 Collision detected in layer "${this.name}" at tile (${x}, ${y})`);
		}
		return isCollidable;
	}

	/**
	 * Generate tiles from Tiled layer data.
	 *
	 * @param {array} layerData The exported layer data from Tiled
	 * @param {array} sprites Array of sprites
	 * @returns {array} An array of Tile objects
	 */
	static generateTiles(layerData, sprites, isCollidable = false) {
		const tiles = [];

		layerData.forEach((tileId) => {
			// Tiled exports tile data starting from 1 and not 0, so we must adjust it
			tileId--;

			// -1 means there should be no tile at this location
			const tile = tileId === -1 ? null : new Tile(tileId, sprites, isCollidable);

			tiles.push(tile);
		});

		return tiles;
	}
}