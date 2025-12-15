export default class Tile {
	static SIZE = 16; // Your map uses 16x16 tiles

	/**
	 * Represents one tile in a Layer and on the screen.
	 *
	 * @param {number} id The tile ID from Tiled (0-based after adjustment)
	 * @param {array} sprites Array of sprites from the tileset
	 * @param {boolean} isCollidable Whether this tile blocks movement
	 */
	constructor(id, sprites, isCollidable = false) {
		this.sprites = sprites;
		this.id = id;
		this.isCollidable = isCollidable;
	}

	/**
	 * Renders this tile at the given world coordinates.
	 *
	 * @param {number} x World X coordinate in tiles
	 * @param {number} y World Y coordinate in tiles
	 */
	render(x, y) {
		// Handle Tiled transformation flags - strip the high bits to get actual tile ID
		const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
		const FLIPPED_VERTICALLY_FLAG   = 0x40000000;
		const FLIPPED_DIAGONALLY_FLAG   = 0x20000000;
		
		const actualTileId = this.id & ~(FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG);
		
		// Debug cave bottom tiles specifically
		const isCaveMainTile = (actualTileId >= 1 && actualTileId <= 9792);
		const isCaveDecorTile = (actualTileId >= 9793 && actualTileId <= 11352);
		const isCaveTile = isCaveMainTile || isCaveDecorTile;
		
		if (this.sprites && this.sprites[actualTileId]) {
			// Log cave tile rendering issues
			if (isCaveTile && (!Tile.caveLogged || !Tile.caveLogged.has(actualTileId))) {
				// Cave tile rendered successfully
				if (!Tile.caveLogged) Tile.caveLogged = new Set();
				Tile.caveLogged.add(actualTileId);
			}
			
			// TODO: Apply transformations based on flags
			this.sprites[actualTileId].render(x * Tile.SIZE, y * Tile.SIZE);
		} else {
			// Check if this is a cave tile failing to render
			if (isCaveTile && (!Tile.caveFailed || !Tile.caveFailed.has(actualTileId))) {
				//console.log(`🚨 Cave tile FAILED: ID ${actualTileId} (original: ${this.id}) at (${x}, ${y}) - No sprite found!`);
				if (!Tile.caveFailed) Tile.caveFailed = new Set();
				Tile.caveFailed.add(actualTileId);
			}
			// Fallback rendering - draw different patterns based on tile ID ranges
			const canvas = document.querySelector('canvas');
			const context = canvas.getContext('2d');
			
			// Only log once per tile ID to avoid spam, but log cave tiles specifically
			if (!Tile.loggedIds) Tile.loggedIds = new Set();
			const isCaveTile = (actualTileId >= 1300 && actualTileId <= 2500);
			if (!Tile.loggedIds.has(actualTileId) && (Tile.loggedIds.size < 15 || isCaveTile)) {
				//console.log(`🕳️ Missing sprite for tile ID ${actualTileId} (original: ${this.id}, sprites array has ${this.sprites ? this.sprites.length : 0} entries) ${isCaveTile ? '[CAVE TILE]' : ''}`);
				Tile.loggedIds.add(actualTileId);
			}
			
			// Map tile ID ranges to different visual representations based on actual ranges
			if (actualTileId >= 1 && actualTileId <= 9792) {
				// cavemainlev.tsx (firstgid: 1) - cave/ground tiles - dark green  
				context.fillStyle = '#2E7D32';
			} else if (actualTileId >= 9793 && actualTileId <= 11352) {
				// cavesdecorative.tsx (firstgid: 9793) - decorative cave elements - brown
				context.fillStyle = '#8D6E63';
			} else if (actualTileId >= 11353 && actualTileId <= 15448) {
				// houses.tsx (firstgid: 11353) - house tiles - gray/stone
				context.fillStyle = '#546E7A';
			} else if (actualTileId >= 15449 && actualTileId <= 15456) {
				// Individual house pieces and decorations - lighter colors
				context.fillStyle = '#1976D2';
			} else if (this.id >= 3000 && this.id <= 4000) {
				// Unknown tileset 2 - purple 
				context.fillStyle = '#7B1FA2';
			} else if (this.id >= 4000 && this.id <= 4472) {
				// Unknown tileset 3 - orange
				context.fillStyle = '#F57C00';
			} else if (this.id >= 4473) {
				// Character tiles - transparent/invisible
				return; // Don't render character tiles
			} else {
				// Unknown - red for visibility
				context.fillStyle = '#D32F2F';
			}
			
			context.fillRect(x * Tile.SIZE, y * Tile.SIZE, Tile.SIZE, Tile.SIZE);
			
			// Add some texture pattern for grass tiles
			if (this.id >= 1 && this.id <= 120) {
				context.fillStyle = '#4CAF50';
				context.fillRect(x * Tile.SIZE + 2, y * Tile.SIZE + 2, 2, 2);
				context.fillRect(x * Tile.SIZE + 8, y * Tile.SIZE + 6, 2, 2);
				context.fillRect(x * Tile.SIZE + 12, y * Tile.SIZE + 10, 2, 2);
			}
		}
	}

	/**
	 * Gets the world pixel position of this tile.
	 *
	 * @param {number} x Tile X coordinate
	 * @param {number} y Tile Y coordinate
	 * @returns {object} Object with x, y pixel coordinates
	 */
	getWorldPosition(x, y) {
		return {
			x: x * Tile.SIZE,
			y: y * Tile.SIZE
		};
	}
}