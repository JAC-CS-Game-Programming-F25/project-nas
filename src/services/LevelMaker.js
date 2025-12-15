import Layer from "../objects/Layer.js";
import Sprite from "../../lib/Sprite.js";
import { images } from "../globals.js";

export default class LevelMaker {
	/**
	 * Handles loading and parsing Tiled JSON map files.
	 * Creates layers and manages player spawn points.
	 */
	constructor() {
		this.mapData = null;
		this.layers = [];
		this.playerSpawnPoint = { x: 0, y: 0 };
		this.collisionLayers = []; // Support multiple collision layers
		this.collisionObjects = []; // Support object-based collision
		this.sprites = new Map(); // Store sprites for each tileset
		this.enemySpawnPoints = []; // Store enemy spawn locations
		this.chestSpawnPoints = []; // Store chest spawn locations
	}

	/**
	 * Load a map from a JSON file.
	 *
	 * @param {string} mapPath Path to the Tiled JSON file
	 * @returns {Promise} Promise that resolves when map is loaded
	 */
	async loadMap(mapPath) {
		try {
			//console.log("🗺️ Starting to load map from:", mapPath);
			const response = await fetch(mapPath);
			this.mapData = await response.json();
			
			//console.log("📋 Map loaded successfully! Layers found:", this.mapData.layers?.length || 0);
			//console.log("📋 Layer names:", this.mapData.layers?.map(l => l.name) || []);
			
			await this.processTilesets();
			//console.log("🎯 About to process layers...");
			this.processLayers();
			//console.log("🎯 Layers processed, looking for player spawn...");
			this.findPlayerSpawnPoint();
			//console.log("✅ Map loading complete!");
			
			return this;
		} catch (error) {
			console.error("Failed to load map:", error);
			throw error;
		}
	}

	/**
	 * Process tilesets and create sprite arrays for each.
	 */
	async processTilesets() {
		// Create a combined sprite array for all tilesets based on their firstgid values
		const allSprites = [];
		
		// Processing tilesets		
		// Check what tile ID ranges we need to cover		
		// Process each tileset from the map data
		if (this.mapData.tilesets) {
			// Processing tilesets
			for (let i = 0; i < this.mapData.tilesets.length; i++) {
				const tileset = this.mapData.tilesets[i];
				
				try {
					// Parse the .tsx file to get the correct image source
					const tilesetData = await this.parseTilesetFile(tileset.source);
					if (!tilesetData) {
						console.error(`❌ FAILED to parse tileset: ${tileset.source}`);
						continue;
					}
					//console.log(`✅ Parsed tileset: ${tilesetData.name}, image: ${tilesetData.imageSource}`);
					
					// Skip portal images - they're not tilesets
					if (tilesetData.name === 'Isometric_Portal' || 
						tilesetData.name === 'Dimensional_Portal' ||
						tilesetData.name === 'portalBIGGER' || 
						tilesetData.imageSource === 'Isometric_Portal.png' ||
						tilesetData.imageSource === 'Dimensional_Portal.png' ||
						tilesetData.imageSource && tilesetData.imageSource.includes('Portal')) {
						//console.log(`⏭️ Skipping portal image: ${tilesetData.name} (not a tileset)`);
						continue;
					}
					
					// Find the corresponding image in our loaded assets
					const image = this.findImageForTileset(tilesetData);
					if (!image) {
						// Silently skip missing tilesets to reduce console noise
						continue;
					}
					
					//console.log(`Found image for ${tilesetData.name}:`, image);
					//console.log(`Tileset dimensions: ${tilesetData.tilewidth}x${tilesetData.tileheight}`);
					//console.log(`Image dimensions: ${image.width}x${image.height}`);
					
					const sprites = Sprite.generateSpritesFromSpriteSheet(
						image,
						tilesetData.tilewidth || 16,
						tilesetData.tileheight || 16
					);
					
					//console.log(`Generated ${sprites.length} sprites from ${tilesetData.name}`);
					
					// Ensure allSprites array is large enough for this tileset
					const maxIndex = tileset.firstgid - 1 + sprites.length;
					if (maxIndex > allSprites.length) {
						// Expand the array to accommodate higher tile IDs
						allSprites.length = maxIndex;
						//console.log(`Expanded allSprites array to ${allSprites.length} to fit tileset with firstgid ${tileset.firstgid}`);
					}
					
					// Insert sprites at the correct index based on firstgid
					for (let i = 0; i < sprites.length; i++) {
						allSprites[tileset.firstgid - 1 + i] = sprites[i];
					}
					
					//console.log(`Added ${sprites.length} ${tilesetData.name} sprites starting at index ${tileset.firstgid - 1}`);
				} catch (error) {
					console.error(`Error processing tileset ${tileset.source}:`, error);
				}
			}
		}
		
		// Store the combined sprite array
		this.sprites.set('combined', allSprites);
		//console.log(`Total sprites loaded: ${allSprites.filter(s => s).length} out of ${allSprites.length} slots`);
		
		// Debug: Check cave sprite availability for common tile IDs
		//console.log(`🕳️ Cave ranges: MainLev (1-9792), Decorative (9793-11352)`);
		//console.log(`🔍 Checking cave sprite availability:`);
		//console.log(`  - Sprite at index 2055 (tile ID 2056): ${allSprites[2055] ? 'EXISTS' : 'MISSING'}`);
		//console.log(`  - Sprite at index 2156 (tile ID 2157): ${allSprites[2156] ? 'EXISTS' : 'MISSING'}`);
		//console.log(`  - Sprite at index 1330 (tile ID 1331): ${allSprites[1330] ? 'EXISTS' : 'MISSING'}`);
		//console.log(`  - Sprite at index 9156 (tile ID 9157): ${allSprites[9156] ? 'EXISTS' : 'MISSING'}`);
		
		// Find the highest tile ID being used in the map
		let maxTileId = 0;
		for (const layer of this.mapData.layers) {
			if (layer.type === 'tilelayer' && layer.chunks) {
				for (const chunk of layer.chunks) {
					for (const tileId of chunk.data) {
						if (tileId > 0) {
							const actualTileId = tileId & ~(0x80000000 | 0x40000000 | 0x20000000);
							maxTileId = Math.max(maxTileId, actualTileId);
						}
					}
				}
			}
		}
		//console.log(`🎯 Maximum tile ID used in map: ${maxTileId}`);
	}

	/**
	 * Parse a .tsx tileset file to extract image source and metadata.
	 * @param {string} tsxPath Path to the .tsx file relative to the JSON file
	 * @returns {object|null} Tileset data or null if parsing fails
	 */
	async parseTilesetFile(tsxPath) {
		try {
			// Convert relative path to absolute path from the map file location
			const mapDir = './assets/images/tilemaps/Finishedproducts/';
			const fullPath = mapDir + tsxPath;
			
			//console.log(`Attempting to load tsx file: ${fullPath}`);
			
			const response = await fetch(fullPath);
			if (!response.ok) {
				console.error(`Failed to load .tsx file: ${response.status} ${response.statusText}`);
				return null;
			}
			
			const xmlText = await response.text();
			//console.log(`Loaded tsx content: ${xmlText.substring(0, 200)}...`);
			
			// Parse XML using DOMParser
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
			
			// Check for parsing errors
			const parserError = xmlDoc.querySelector('parsererror');
			if (parserError) {
				console.error('XML parsing error:', parserError.textContent);
				return null;
			}
			
			// Extract tileset metadata
			const tilesetElement = xmlDoc.querySelector('tileset');
			if (!tilesetElement) {
				console.error('No tileset element found in .tsx file');
				return null;
			}
			
			const imageElement = xmlDoc.querySelector('image');
			if (!imageElement) {
				console.error('No image element found in .tsx file');
				return null;
			}
			
			const tilesetData = {
				name: tilesetElement.getAttribute('name'),
				tilewidth: parseInt(tilesetElement.getAttribute('tilewidth')) || 16,
				tileheight: parseInt(tilesetElement.getAttribute('tileheight')) || 16,
				tilecount: parseInt(tilesetElement.getAttribute('tilecount')) || 0,
				columns: parseInt(tilesetElement.getAttribute('columns')) || 0,
				imageSource: imageElement.getAttribute('source'),
				imageWidth: parseInt(imageElement.getAttribute('width')) || 0,
				imageHeight: parseInt(imageElement.getAttribute('height')) || 0
			};
			
			//console.log('Parsed tileset data:', tilesetData);
			return tilesetData;
			
		} catch (error) {
			console.error('Error parsing .tsx file:', error);
			return null;
		}
	}

	/**
	 * Find the corresponding loaded image for a tileset.
	 * @param {object} tilesetData Parsed tileset data
	 * @returns {object|null} Image object or null if not found
	 */
	findImageForTileset(tilesetData) {
		// Extract filename from the image source path
		const imagePath = tilesetData.imageSource;
		const filename = imagePath.split('/').pop(); // Get just the filename
		
		// Map filename to our loaded asset keys
		const imageMapping = {
			// Legacy mappings
			'Tileset.png': 'tileset',
			'Decorations.png': 'decorations', 
			'houses.png': 'houses',
			// New GAMEPROJFINAL mappings
			'MainLev2.png': 'MainLev2',
			'cavedecoration.png': 'cavedecoration',
			'SingleRedHouseTop.png': 'SingleRedHouseTop',
			'SingleRedHouseBottom.png': 'SingleRedHouseBottom', 
			'SinglePurpleHouseTop.png': 'SinglePurpleHouseTop',
			'SinglePurpleHouseBottom.png': 'SinglePurpleHouseBottom',
			'Singlegreenhousetop.png': 'Singlegreenhousetop',
			'SinglegreenhouseBottom.png': 'SinglegreenhouseBottom',
			'cavedecoration - Copy.png': 'cavedecoration-Copy',
			// Map all character images to the idle sprite
			'100005106_limit_atk.png': 'player_single',
			'100005106_magic_atk.png': 'player_single',
			'100005106_magic_standby.png': 'player_single',
			'100005106_move.png': 'player_single',
			'100005106_standby.png': 'player_single',
			'100005106_win.png': 'player_single',
			'100005106_win_before.png': 'player_single',
			'unit_icon_100005106.png': 'player_single',
			'unit_ills_100005106.png': 'player_single',
			'100005106_atk.png': 'player_single',
			'100005106_dead.png': 'player_single',
			'100005106_dying.png': 'player_single',
			'100005106_idle.png': 'player_single',
			'100005106_jump.png': 'player_single',
			'idle_left.png': 'player_idle_left',
			// Enemy sprite mappings
			'IDLE.png': 'enemy_idle',
			'Idle.png': 'wizard_idle',  // Fix for Idle.png mapping
			'FLYING.png': 'enemy_flying',
			'ATTACK.png': 'enemy_attack',
			'HURT.png': 'enemy_hurt',
			'DEATH.png': 'enemy_death',
			// Knight sprite mappings
			'knight_idle': 'knight_idle',
			'knight_walk': 'knight_walk', 
			'knight_run': 'knight_run',
			'knight_attack1': 'knight_attack1',
			'knight_attack2': 'knight_attack2',
			'knight_attack3': 'knight_attack3',
			'knight_defend': 'knight_defend',
			'knight_hurt': 'knight_hurt',
			'knight_death': 'knight_death',
			'knight_jump': 'knight_jump',
			// Monster tileset mapping (fallback to idle for now)
			'MONSTERSBIGTEMP.png': 'enemy_idle',
			// Chest sprite mapping
			'15_Ready_to_use_Treasure_Chests_Spritesheet.png': 'chest',
			// Wizard sprite mappings  
			'wizard_attack': 'wizard_attack',
			'wizard_death': 'wizard_death',
			'wizard_idle': 'wizard_idle',
			'wizard_move': 'wizard_move',
			'wizard_takehit': 'wizard_takehit',
			// Add evilwizard mapping
			'evilwizard': 'wizard_idle'
		};
		
		const imageKey = imageMapping[filename];
		
		if (imageKey) {
			const image = images.get(imageKey);
			return image;
		}

		// Silently return null for unmapped files to reduce console noise
		return null;
	}

	/**
	 * Process all layers from the map data.
	 */
	processLayers() {
		this.layers = [];
		
		//console.log("Processing layers:", this.mapData.layers.map(l => `${l.name} (${l.type})`));
		
		this.mapData.layers.forEach(layerData => {
			//console.log(`Processing layer: "${layerData.name}" of type: ${layerData.type}`);
			
			if (layerData.type === 'tilelayer') {
				// Use the combined sprite array that maps tile IDs correctly
				const sprites = this.sprites.get('combined') || [];
				
				// Check if this layer should be collidable
				const layerName = layerData.name.toLowerCase();
				//console.log(`Checking if "${layerData.name}" (lowercase: "${layerName}") is a collision layer`);
				
				const isCollidableLayer = layerName.includes('collision') || 
					layerName.includes('solid') ||
					layerName.includes('obstacles') ||
					layerName.includes('collide') ||
					layerName.includes('walls') ||
					layerName === 'obstacles' ||
					layerName === 'walls' ||
					layerName === 'walls2' ||
					layerName === 'wall' ||
					layerName === 'block' ||
					layerName === 'ocean' ||
					layerName === 'water' ||
					layerName === 'water collide';
				
				const layer = new Layer(layerData, sprites, isCollidableLayer);
				this.layers.push(layer);
				
				if (isCollidableLayer) {
					this.collisionLayers.push(layer);
					//console.log(`✓ Collision layer found: ${layerData.name} - tiles marked as collidable`);
				} else {
					//console.log(`Layer "${layerData.name}" - not a collision layer`);
				}
				
				//console.log(`Created layer: ${layerData.name} with ${sprites.length} available sprites`);
			} else if (layerData.type === 'objectgroup') {
				//console.log(`Found object group: ${layerData.name}`);
				
				// Check if this object group is for collision
				const layerName = layerData.name.toLowerCase();
				if (layerName.includes('collision') || 
					layerName.includes('wall') ||
					layerName.includes('house') ||
					layerName === 'housesinfront' ||
					layerName === 'housesinfrontlayer') {
					
					//console.log(`✓ Collision object group found: ${layerData.name}`);
					
					// Process collision objects
					if (layerData.objects) {
						for (const obj of layerData.objects) {
							let collisionObj;
							
							if (obj.polygon) {
								// Handle polygon collision
								const absolutePoints = obj.polygon.map(point => ({
									x: obj.x + point.x,
									y: obj.y + point.y
								}));
								
								collisionObj = {
									x: obj.x,
									y: obj.y,
									type: 'polygon',
									points: absolutePoints,
									name: obj.name || 'collision'
								};
								//console.log(`🔺 Added polygon collision "${collisionObj.name}" at (${collisionObj.x}, ${collisionObj.y}) with ${absolutePoints.length} points`);
							} else {
								// Handle rectangular collision
								collisionObj = {
									x: obj.x,
									y: obj.y - obj.height, // Convert from bottom-left to top-left
									width: obj.width,
									height: obj.height,
									type: 'rectangle',
									name: obj.name || 'collision'
								};
								//console.log(`🏠 Added rectangle collision "${collisionObj.name}" at (${collisionObj.x}, ${collisionObj.y}) size ${collisionObj.width}x${collisionObj.height}`);
							}
							
							this.collisionObjects.push(collisionObj);
						}
						//console.log(`Added ${layerData.objects.length} collision objects from ${layerData.name}`);
					}
				} else {
					// Check for enemy spawns and other objects
					if (layerData.objects) {
						//console.log(`📦 Objects in ${layerData.name}:`, layerData.objects.map(obj => obj.name || 'unnamed'));
						if (layerData.name === 'TutorialDone') {
							//console.log('🎆 FOUND TutorialDone layer! Processing objects...');
						}
						for (const obj of layerData.objects) {
							//console.log(`🔍 Processing object: name="${obj.name}", type="${obj.type}", class="${obj.class}"`);
							if (obj.properties) {
								//console.log(`   Properties:`, obj.properties.map(p => `${p.name}=${p.value}`).join(', '));
							}
							
							// Check for enemy spawns
			if (obj.type === 'Enemy' || (obj.properties && (obj.properties.some(p => p.name === 'monsterType') || obj.properties.some(p => p.name === 'entityType')))) {
				// Check for both monsterType and entityType properties
				let enemyType = 'flying_demon';
				if (obj.properties) {
					const monsterTypeProp = obj.properties.find(p => p.name === 'monsterType');
					const entityTypeProp = obj.properties.find(p => p.name === 'entityType');
					enemyType = monsterTypeProp?.value || entityTypeProp?.value || 'flying_demon';
				}
								const enemySpawn = {
									x: obj.x,
									y: obj.y,
									enemyType: enemyType,
									name: obj.name || 'Enemy'
								};
								
								this.enemySpawnPoints.push(enemySpawn);
								//console.log(`👹 Found enemy spawn: ${enemyType} at (${obj.x}, ${obj.y})`);
							}
							
							// Check for chest spawns - check multiple ways
							const isChestByType = obj.type === 'Chest';
							const isChestByClass = obj.class === 'Chest';
							const isChestByProperty = obj.properties && obj.properties.some(p => p.name === 'entityType' && p.value === 'Chest');
							const isChestByName = obj.name && obj.name.includes('Chest');
							
							if (isChestByType || isChestByClass || isChestByProperty || isChestByName) {
								//console.log(`💰 Found chest candidate: "${obj.name}" - type:${obj.type}, class:${obj.class}`);
								
								const chestSpawn = {
									x: obj.x,
									y: obj.y,
									name: obj.name || 'TutorialChest1'
								};
								
								this.chestSpawnPoints.push(chestSpawn);
								//console.log(`💰 Added chest spawn: ${obj.name} at (${obj.x}, ${obj.y})`);
							}
							
							// Check for collision objects (blocks that entities can't pass through)
							this.checkForCollisionObject(obj);
						}
					}
				}
			}
		});
		
		//console.log(`Total collision layers found: ${this.collisionLayers.length}`);
		//console.log(`Total collision objects found: ${this.collisionObjects.length}`);
		//console.log(`Total enemy spawn points found: ${this.enemySpawnPoints.length}`);
		//console.log(`Total chest spawn points found: ${this.chestSpawnPoints.length}`);
	}

	/**
	 * Find the PlayerStart object in the map data.
	 */
	findPlayerSpawnPoint() {
		for (const layer of this.mapData.layers) {
			if (layer.type === 'objectgroup' && layer.objects) {
				for (const obj of layer.objects) {
					if (obj.name === 'PlayerStart') {
						// Convert Tiled coordinates to our coordinate system
						this.playerSpawnPoint = {
							x: obj.x,
							y: obj.y - obj.height // Tiled uses bottom-left, we use top-left
						};
						
						//console.log(`Player spawn point found at: ${this.playerSpawnPoint.x}, ${this.playerSpawnPoint.y}`);
						return;
					}
				}
			}
		}
		
		console.warn("PlayerStart object not found, using default position (0, 0)");
		this.playerSpawnPoint = { x: 0, y: 0 };
	}

	/**
	 * Get the player spawn point in pixel coordinates.
	 *
	 * @returns {object} Object with x, y coordinates in pixels
	 */
	getPlayerSpawnPoint() {
		return this.playerSpawnPoint;
	}

	/**
	 * Render all layers with camera offset.
	 *
	 * @param {number} cameraX Camera X offset in pixels
	 * @param {number} cameraY Camera Y offset in pixels
	 * @param {number} viewWidth Viewport width
	 * @param {number} viewHeight Viewport height
	 */
	render(cameraX = 0, cameraY = 0, viewWidth = 800, viewHeight = 600) {
		// Render layers in order (background to foreground)
		this.layers.forEach(layer => {
			// Don't render collision layers
			if (this.collisionLayers.includes(layer)) {
				return;
			}
			
			layer.render(cameraX, cameraY, viewWidth, viewHeight);
		});
	}

	/**
	 * Render only background layers (layers that should appear behind the player)
	 */
	renderBackground(cameraX = 0, cameraY = 0, viewWidth = 800, viewHeight = 600) {
		this.layers.forEach(layer => {
			// Skip invisible collision layers (but allow Block, Wall, and Ocean layers to render)
			if (this.collisionLayers.includes(layer) && 
			    layer.name !== 'Block' && 
			    layer.name !== 'Wall' && 
			    layer.name !== 'Ocean' && 
			    layer.name !== 'ocean') {
				return;
			}
			
			// Define foreground layers (layers that should render in front of player)
			const isForegroundLayer = layer.name === 'HousesNew' || 
									  layer.name === 'Houses' || 
									  layer.name === 'CaveTop';
			
			if (!isForegroundLayer) {
				layer.render(cameraX, cameraY, viewWidth, viewHeight);
			}
		});
	}

	/**
	 * Render only foreground layers (layers that should appear in front of the player)
	 */
	renderForeground(cameraX = 0, cameraY = 0, viewWidth = 800, viewHeight = 600) {
		this.layers.forEach(layer => {
			// Skip invisible collision layers (but allow Block, Wall, and Ocean layers to render)
			if (this.collisionLayers.includes(layer) && 
			    layer.name !== 'Block' && 
			    layer.name !== 'Wall' && 
			    layer.name !== 'Ocean' && 
			    layer.name !== 'ocean') {
				return;
			}
			
			// Define foreground layers (layers that should render in front of player)
			const isForegroundLayer = layer.name === 'HousesNew' || 
									  layer.name === 'Houses' || 
									  layer.name === 'CaveTop';
			
			if (isForegroundLayer) {
				layer.render(cameraX, cameraY, viewWidth, viewHeight);
			}
		});
	}

	/**
	 * Check if a position in world coordinates is collidable.
	 *
	 * @param {number} x World X coordinate in pixels
	 * @param {number} y World Y coordinate in pixels
	 * @returns {boolean} Whether the position is blocked
	 */
	isPositionCollidable(x, y) {
		// Check tile-based collision layers
		if (this.collisionLayers && this.collisionLayers.length > 0) {
			// Convert world coordinates to tile coordinates
			const tileX = Math.floor(x / 16);
			const tileY = Math.floor(y / 16);
			
			// Check all collision layers
			for (const layer of this.collisionLayers) {
				const isBlocked = layer.isTileCollidable(tileX, tileY);
				if (isBlocked) {
					return true;
				}
			}
		}
		
		// Check object-based collision
		if (this.collisionObjects && this.collisionObjects.length > 0) {
			for (const obj of this.collisionObjects) {
				if (obj.type === 'polygon') {
					// Point-in-polygon collision check
					if (this.isPointInPolygon(x, y, obj.points)) {
						return true;
					}
				} else {
					// Rectangle collision check
					if (x >= obj.x && x <= obj.x + obj.width &&
						y >= obj.y && y <= obj.y + obj.height) {
						return true;
					}
				}
			}
		}
		
		return false;
	}

	/**
	 * Check if an object should be treated as a collision object
	 * Add class names and object names here that should block entity movement
	 */
	checkForCollisionObject(obj) {
		// Define which classes and names should be collidable
		const collidableClasses = [
			'Wall', 'Barrier', 'Block', 'Obstacle', 'Collision'
		];
		
		const collidableNames = [
			// Add specific object names here
			// Examples: 'Rock', 'Tree', 'Pillar'
		];
		
		// Check if this object should be collidable
		const isCollidableByClass = obj.class && collidableClasses.includes(obj.class);
		const isCollidableByName = obj.name && collidableNames.includes(obj.name);
		const isCollidableByType = obj.type === 'Collision' || obj.type === 'Wall';
		
		if (isCollidableByClass || isCollidableByName || isCollidableByType) {
			// Create collision object
			let collisionObj;
			
			if (obj.polygon && obj.polygon.length > 0) {
				// Handle polygon collision
				const absolutePoints = obj.polygon.map(point => ({
					x: obj.x + point.x,
					y: obj.y + point.y
				}));
				
				collisionObj = {
					type: 'polygon',
					x: obj.x,
					y: obj.y,
					points: absolutePoints,
					name: obj.name || 'collision'
				};
				
				//console.log(`🔺 Added collision polygon "${obj.name || obj.class}" at (${obj.x}, ${obj.y}) with ${absolutePoints.length} points`);
			} else {
				// Handle rectangle collision
				collisionObj = {
					type: 'rectangle',
					x: obj.x,
					y: obj.y,
					width: obj.width || 32,
					height: obj.height || 32,
					name: obj.name || obj.class || 'collision'
				};
				
				//console.log(`🟦 Added collision rectangle "${obj.name || obj.class}" at (${obj.x}, ${obj.y}) size ${obj.width || 32}x${obj.height || 32}`);
			}
			
			this.collisionObjects.push(collisionObj);
		}
	}

	/**
	 * Check if a point is inside a polygon using ray casting algorithm.
	 *
	 * @param {number} x Point X coordinate
	 * @param {number} y Point Y coordinate  
	 * @param {array} points Array of polygon vertices with {x, y} properties
	 * @returns {boolean} Whether point is inside polygon
	 */
	isPointInPolygon(x, y, points) {
		if (points.length < 3) return false;
		
		let inside = false;
		let j = points.length - 1;
		
		for (let i = 0; i < points.length; j = i++) {
			const xi = points[i].x;
			const yi = points[i].y;
			const xj = points[j].x;
			const yj = points[j].y;
			
			if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
				inside = !inside;
			}
		}
		
		return inside;
	}

	/**
	 * Get all objects of a specific type from object layers.
	 *
	 * @param {string} objectName Name of objects to find
	 * @returns {array} Array of matching objects
	 */
	getObjectsByName(objectName) {
		const objects = [];
		
		for (const layer of this.mapData.layers) {
			if (layer.type === 'objectgroup' && layer.objects) {
				for (const obj of layer.objects) {
					if (obj.name === objectName) {
						objects.push({
							x: obj.x,
							y: obj.y - obj.height, // Convert to top-left
							width: obj.width,
							height: obj.height,
							properties: obj.properties || {}
						});
					}
				}
			}
		}
		
		return objects;
	}

	/**
	 * Static method to create and load a map.
	 *
	 * @param {string} mapPath Path to map JSON file
	 * @returns {Promise<LevelMaker>} Loaded LevelMaker instance
	 */
	/**
	 * Get all enemy spawn points from the map.
	 *
	 * @returns {array} Array of enemy spawn data
	 */
	getEnemySpawnPoints() {
		return this.enemySpawnPoints;
	}
	
	/**
	 * Get chest spawn points from the map
	 */
	getChestSpawnPoints() {
		return this.chestSpawnPoints;
	}
	


	static async create(mapPath) {
		const levelMaker = new LevelMaker();
		await levelMaker.loadMap(mapPath);
		return levelMaker;
	}
}