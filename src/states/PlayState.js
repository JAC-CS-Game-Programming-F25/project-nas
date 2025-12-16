import State from "../../lib/State.js";
import GameStateName from "../enums/GameStateName.js";
import LevelMaker from "../services/LevelMaker.js";
import Player from "../entities/Player.js";
import Chest from "../entities/Chest.js";
import { context, canvas, CANVAS_WIDTH, CANVAS_HEIGHT, input, images, stateMachine, sounds } from "../globals.js";
import GameMode from "../enums/GameMode.js";
import TutorialService from "../services/TutorialService.js";
import UserInterface from "../services/UserInterface.js";
import GameSettings from "../services/GameSettings.js";
import PauseMenu from "../services/PauseMenu.js";
import Camera from "../services/Camera.js";
import EnemySpawner from "../services/EnemySpawner.js";
import CombatSystem from "../services/CombatSystem.js";
import Persistence from "../services/Persistence.js";
import AbilityManager from "../services/AbilityManager.js";

export default class PlayState extends State {
	constructor() {
		super();
		
		// Initialize Services
		this.gameSettings = new GameSettings();
		this.pauseMenu = new PauseMenu(this);
		this.cameraService = new Camera(this);
		this.enemySpawner = new EnemySpawner(this);
		this.combatSystem = new CombatSystem(this);
		this.persistence = new Persistence(this);
		this.abilityManager = new AbilityManager(this);

		// Set up global reference for entities to access game state
		window.gameState = this;
		
		// Expose sounds system for entities
		this.sounds = sounds;

		this.reset();
	}

	reset() {
		this.levelMaker = null;
		this.player = null;
		this.enemies = [];
		this.chests = [];
		this.chestSpawned = false;
		
		// Chest interaction message
		this.showChestMessage = false;
		this.chestMessageTimer = 0;
		this.showChestSpawnMessage = false;
		this.chestSpawnMessageTimer = 0;
		
		// Reinforcements popup
		this.showReinforcementsPopup = false;
		this.reinforcementsLevel = 0; // Tracks which level triggered the popup
		
		// Reset services
		this.cameraService.reset();
		this.abilityManager.reset();
		
		this.selectedChest = null;
		this.selectedAbility = null;
		this.nearChest = null;
		this.isLoading = true;
		this.isPaused = false;
		
		// Game stats tracking for leaderboard
		this.gameStartTime = 0;
		this.timeSurvived = 0;
		this.enemiesKilled = 0;
		
		this.deathHandled = false;
		
		// Initialize Services
		this.tutorialService = new TutorialService(this);
		this.userInterface = new UserInterface(this);
		
		// Player stats
		this.playerStats = {
			level: 1,
			xp: 0,
			xpToNext: 50,
			damage: 15, // Reduced from 25 to 15 for better balance
			canAttack: true,
			attackCooldown: 1.0, // seconds
			lastAttackTime: 0
		};
	}

	get tutorialActive() { return this.tutorialService.active; }
	set tutorialActive(value) { this.tutorialService.active = value; }

	get tutorialStep() { return this.tutorialService.step; }
	set tutorialStep(value) { this.tutorialService.step = value; }

	get tutorialEnemy() { return this.tutorialService.enemy; }
	set tutorialEnemy(value) { this.tutorialService.enemy = value; }

	get tutorialCompleted() { return this.tutorialService.completed; }
	set tutorialCompleted(value) { this.tutorialService.completed = value; }

	get freezeFrame() { return this.tutorialService.freezeFrame; }
	set freezeFrame(value) { this.tutorialService.freezeFrame = value; }



	async enter(params = {}) {
		this.reset();
		try {
			//console.log("Loading level...");
			
			// Apply game mode from main menu if provided
			if (params.gameMode) {
				this.gameSettings.gameMode = params.gameMode;
			}
			
			// Load the map
			this.levelMaker = await LevelMaker.create('./assets/images/tilemaps/Finishedproducts/level1.json');
			//console.log("LevelMaker created:", this.levelMaker);
			//console.log("Number of layers:", this.levelMaker.layers.length);
			
			// Create player at spawn point
			const spawnPoint = this.levelMaker.getPlayerSpawnPoint();
			//console.log("Player spawn point:", spawnPoint);
			this.player = new Player(spawnPoint.x, spawnPoint.y);
			
			// Load saved game if requested
			if (params.loadGame) {
				this.persistence.loadGame();
			}

			// Apply initial game mode settings
			this.pauseMenu.updateLabels();
			this.applyGameMode();
			
			// Start background music
			this.startBackgroundMusic();
			
			// Start game timer
			this.gameStartTime = Date.now();
			this.timeSurvived = 0;
			this.enemiesKilled = 0;
			
			// Spawn enemies
			this.enemySpawner.spawnEnemies();
			
			// Fallback: If no enemies spawned and not in tutorial, try spawning post-tutorial enemies
			if (this.enemies.length === 0 && !this.tutorialActive) {
				console.warn("⚠️ No enemies spawned! Attempting to force spawn post-tutorial enemies...");
				this.enemySpawner.spawnPostTutorialEnemies();
			}
			
			// Initialize camera
			this.cameraService.update();
			
			this.isLoading = false;
			//console.log("Level loaded successfully!");
			
			// Set up zoom controls after everything is loaded
			setTimeout(() => {
				this.cameraService.setupZoomControls();
			}, 100);
			
		} catch (error) {
			console.error("Failed to load level:", error);
			this.isLoading = false;
		}
	}



	update(dt) {
		if (this.isLoading || !this.player || !this.levelMaker) return;
		
		// Handle reinforcements popup input
		if (this.showReinforcementsPopup) {
			if (input.isKeyPressed('Enter') || input.isKeyPressed('Space')) {
				this.showReinforcementsPopup = false;
				this.isPaused = false;
				
				// Resume music
				if (this.gameSettings.musicEnabled && this.sounds.get('backgroundmusic')) {
					this.sounds.play('backgroundmusic');
				}
				
				// Spawn reinforcements
				//console.log('Reinforcements arriving!');
				this.enemySpawner.spawnPostTutorialEnemies();
			}
			return; // Stop update
		}
		
		// Update time survived (only when not paused)
		if (!this.isPaused && this.gameStartTime > 0) {
			this.timeSurvived = (Date.now() - this.gameStartTime) / 1000; // Convert to seconds
		}
		
		// Handle pause input
		if (input.isKeyPressed('P')) {
			this.togglePause();
		}
		
		// Don't update game if paused, but handle pause menu input
		if (this.isPaused) {
			this.handlePauseMenuInput();
			return;
		}
		
		// Handle tutorial progression
		if (this.tutorialActive) {
			// Check for skip tutorial input
			if (input.isKeyPressed('T')) {
				this.skipTutorial();
				return;
			}
			
			this.updateTutorial(dt);
			if (this.freezeFrame) {
				// During freeze frame, only update player and camera, skip enemies
				const prevX = this.player.position.x;
				const prevY = this.player.position.y;
				const prevDirection = this.player.direction;
				this.player.update(dt, this.levelMaker);
				
				// During parry tutorial freeze, keep player completely locked (position and facing)
				if (this.tutorialStep === 3 && !this.tutorialCompleted.parry) {
					this.player.position.x = prevX;
					this.player.position.y = prevY;
					this.player.direction = prevDirection;
				}
				
				this.cameraService.update(dt);
				return;
			}
		}

		// Check if player is dead and save stats
		if (this.player.isDead && !this.deathHandled) {
			this.deathHandled = true;
			//console.log('Player died! Saving stats and returning to main menu...');
			
			// Stop all sounds immediately upon death
			if (this.sounds) {
				this.sounds.stopAll();
			}
			
			this.persistence.saveLeaderboardEntry();
			
			setTimeout(() => {
				stateMachine.change(GameStateName.GameOver, {
					level: this.playerStats.level,
					xp: this.playerStats.xp
				});
			}, 3000); // 3 seconds to show death screen
			return; // Stop updating while waiting for transition
		}

		// Update parry feedback timer
		this.combatSystem.update(dt);

		// Check if player attacked and handle damage to enemies (only once per attack)
		// Don't allow attacks during parry tutorial until parry is completed
		const canAttack = !(this.tutorialActive && this.tutorialStep === 3 && !this.tutorialCompleted.parry);
		
		if (canAttack && this.player.isAttacking && this.player.attackTimer > 0.2 && this.player.attackTimer < 0.3 && !this.player.hasDealtDamage) {
			this.combatSystem.performAttack();
			this.player.hasDealtDamage = true; // Prevent multiple hits per attack
		}
		
		// Reset damage flag when attack ends
		if (!this.player.isAttacking && this.player.hasDealtDamage) {
			this.player.hasDealtDamage = false;
		}

		// Store player's previous position and direction
		const prevPlayerX = this.player.position.x;
		const prevPlayerY = this.player.position.y;
		const prevPlayerDirection = this.player.direction;
		
		// Update player (always, whether in tutorial or not)
		this.player.update(dt, this.levelMaker);
		
		// During parry tutorial, lock player completely in place until they parry
		if (this.tutorialActive && this.tutorialStep === 3 && !this.tutorialCompleted.parry) {
			this.player.position.x = prevPlayerX;
			this.player.position.y = prevPlayerY;
			this.player.direction = prevPlayerDirection;
		}
		
		// Check chest collisions after player update and revert if needed
		for (const chest of this.chests) {
			if (chest.isVisible && chest.checkCollision(this.player)) {
				// Collision detected - revert player position
					// //console.log('Player-chest collision! Reverting movement.');
				this.player.position.x = prevPlayerX;
				this.player.position.y = prevPlayerY;
				break; // Exit loop after first collision
			}
		}
		
		// Update enemies and remove dead ones
		for (let i = this.enemies.length - 1; i >= 0; i--) {
			const enemy = this.enemies[i];
			enemy.update(dt, this.player); // Pass player reference for AI
			
			// Remove dead enemies after death animation completes
			if (enemy.isDead && enemy.currentAnimation === 'death') {
				const maxFrames = enemy.frameCount?.death || 4;
				// Wait until the last frame has been displayed for a bit
				if (enemy.currentFrame >= maxFrames - 1) {
					//console.log('Removing dead enemy after death animation');
					this.enemies.splice(i, 1);
				}
			}
		}
		
		// Update chests and check for player interaction
		this.nearChest = null;
		let interactedChest = null;
		
		for (const chest of this.chests) {
			chest.update(dt);
			// Check if player is near any chest
			if (chest.isPlayerNearby(this.player) && chest.canInteract && chest.isVisible) {
				this.nearChest = chest;
				// Check for F key press to interact
				if (input.isKeyPressed('F') && !interactedChest) {
					//console.log(`F key pressed for chest interaction on ${chest.chestName}!`);
					interactedChest = chest;
					
					// Hide other chests immediately
					for (const otherChest of this.chests) {
						if (otherChest !== chest) {
							//console.log(`Hiding chest: ${otherChest.chestName}`);
							otherChest.hide();
						}
					}
					
					// Set callback for when THIS specific chest opens
					chest.setOnOpenComplete(() => {
						// Show ability selection popup
						this.abilityManager.showAbilitySelection = true;
						this.selectedChest = chest;
						//console.log(`Chest ${chest.chestName} opened! Showing ability selection.`);
						//console.log(`showAbilitySelection set to: ${this.abilityManager.showAbilitySelection}`);
					});
					
					if (chest.open()) {
						// Give rewards for opening chest
						this.gainXP(50);
						//console.log(`Opening ${chest.chestName}! Animation starting on this specific chest...`);
					}
					break; // Exit loop after interaction
				}
			}
		}
		
		// Spawn chests when tutorial is complete (only once)
		if (!this.tutorialActive && !this.chestSpawned && this.levelMaker) {
			this.spawnChests();
		}
		
		// Update chest message timer
		if (this.showChestMessage) {
			this.chestMessageTimer -= dt;
			if (this.chestMessageTimer <= 0) {
				this.showChestMessage = false;
			}
		}

		// Update chest spawn message timer
		if (this.showChestSpawnMessage) {
			this.chestSpawnMessageTimer -= dt;
			if (this.chestSpawnMessageTimer <= 0) {
				this.showChestSpawnMessage = false;
			}
		}
		
		// Handle ability selection input
		this.abilityManager.handleInput();
		
		// Update camera to follow player
		this.cameraService.update(dt);

		// Check for victory (all enemies defeated)
		if (!this.isLoading && !this.tutorialActive && this.chestSpawned && this.enemies.length === 0) {
			//console.log('Victory! All enemies defeated.');
			this.persistence.saveLeaderboardEntry();
			stateMachine.change(GameStateName.Victory, {
				level: this.playerStats.level,
				xp: this.playerStats.xp,
				time: this.timeSurvived,
				kills: this.enemiesKilled
			});
		}
	}

	render() {
		// Clear screen with a background color
		context.fillStyle = '#1a1a1a';
		context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		if (this.isLoading) {
			// Show loading screen
			context.fillStyle = '#FFFFFF';
			context.font = '24px Arial';
			context.textAlign = 'center';
			context.fillText('Loading Level...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
			return;
		}

		if (!this.levelMaker || !this.player) return;

		// Apply camera transform
		this.cameraService.applyTransform(context);
		
		// Calculate viewport size to cover ALL visible area at any zoom level
		const { width: viewWidth, height: viewHeight } = this.cameraService.getViewportDimensions();
		
		// Render background layers (behind player)
		this.levelMaker.renderBackground(this.cameraService.x, this.cameraService.y, viewWidth, viewHeight);
		
		// Render the player
		this.player.render();
		
		// Render enemies
		for (const enemy of this.enemies) {
			enemy.render();
		}
		
		// Render chests
		for (const chest of this.chests) {
			chest.render();
		}
		
		// Render foreground layers (in front of player)
		this.levelMaker.renderForeground(this.cameraService.x, this.cameraService.y, viewWidth, viewHeight);
		
		// Restore context
		this.cameraService.restoreTransform(context);
		
		// Render UI elements (not affected by camera)
		this.renderUI();
		
		// Show death screen if player is dead
		if (this.player.isDead) {
			context.fillStyle = 'rgba(0, 0, 0, 0.7)';
			context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			
			context.fillStyle = '#FF0000';
			context.font = 'bold 48px Arial';
			context.textAlign = 'center';
			context.fillText('YOU DIED!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
			
			context.fillStyle = '#FFFFFF';
			context.font = '24px Arial';
			context.fillText('Restarting in 2 seconds...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
			
			// Reset text alignment for other UI elements
			context.textAlign = 'left';
		}
		
		// Render chest interaction prompt
		if (this.nearChest && this.nearChest.canInteract && this.nearChest.isVisible && !this.tutorialActive && !this.isPaused) {
			context.fillStyle = 'rgba(0, 0, 0, 0.7)';
			context.fillRect(CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT - 100, 300, 60);
			
			context.fillStyle = '#FFD700';
			context.font = 'bold 24px Arial';
			context.textAlign = 'center';
			context.fillText('Press F to Open Chest', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
			context.textAlign = 'left';
		}
		
		// Render chest completion message
		if (this.showChestMessage && !this.abilityManager.showAbilitySelection) {
			context.fillStyle = 'rgba(0, 0, 0, 0.8)';
			context.fillRect(CANVAS_WIDTH / 2 - 250, CANVAS_HEIGHT / 2 - 80, 500, 160);
			
			if (this.selectedAbility) {
				const abilityInfo = this.abilityManager.abilityOptions.find(a => a.key === this.selectedAbility);
				
				context.fillStyle = abilityInfo.color;
				context.font = 'bold 32px Arial';
				context.textAlign = 'center';
				context.fillText(`${abilityInfo.name.toUpperCase()} ELEMENT CHOSEN!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
				
				context.fillStyle = '#FFFFFF';
				context.font = '20px Arial';
				context.fillText(`Your attacks now have ${abilityInfo.name.toLowerCase()} power!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
				context.fillText('Check the top-left for your element status.', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
			} else {
				context.fillStyle = '#FFD700';
				context.font = 'bold 28px Arial';
				context.textAlign = 'center';
				context.fillText('Chest Opened!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
				
				context.fillStyle = '#FFFFFF';
				context.font = '18px Arial';
				context.fillText('You found treasure! Other chests vanished...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
			}
			context.textAlign = 'left';
		}

		// Render chest spawn message
		if (this.showChestSpawnMessage && !this.showChestMessage && !this.abilityManager.showAbilitySelection) {
			context.fillStyle = 'rgba(0, 0, 0, 0.8)';
			context.fillRect(CANVAS_WIDTH / 2 - 300, CANVAS_HEIGHT / 2 - 60, 600, 120);
			
			context.fillStyle = '#FFD700';
			context.font = 'bold 32px Arial';
			context.textAlign = 'center';
			context.fillText('ANCIENT RELICS DISCOVERED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
			
			context.fillStyle = '#FFFFFF';
			context.font = '24px Arial';
			context.fillText('Choose an artifact to channel its elemental power...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
			
			context.textAlign = 'left';
		}
		
		// Render ability selection popup
		this.abilityManager.render(context);
		
		// Show tutorial prompts
		if (this.tutorialActive) {
			this.renderTutorial();
		}
		
		// Show parry success feedback
		this.combatSystem.render(context, CANVAS_WIDTH);
		
		// Show reinforcements popup
		if (this.showReinforcementsPopup) {
			this.renderReinforcementsPopup();
		}
		// Show pause screen if game is paused (and not showing reinforcements)
		else if (this.isPaused) {
			this.renderPauseMenu();
		}
	}

	renderReinforcementsPopup() {
		context.save();
		
		// Darken background
		context.fillStyle = 'rgba(0, 0, 0, 0.7)';
		context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		// Popup box
		const boxWidth = 600;
		const boxHeight = 200;
		const x = (CANVAS_WIDTH - boxWidth) / 2;
		const y = (CANVAS_HEIGHT - boxHeight) / 2;
		
		context.fillStyle = '#2c3e50';
		context.strokeStyle = '#c0392b';
		context.lineWidth = 4;
		context.fillRect(x, y, boxWidth, boxHeight);
		context.strokeRect(x, y, boxWidth, boxHeight);
		
		// Title
		context.fillStyle = '#e74c3c';
		context.font = 'bold 40px Arial';
		context.textAlign = 'center';
		context.fillText('⚠️ WARNING ⚠️', CANVAS_WIDTH / 2, y + 60);
		
		// Message
		context.fillStyle = '#ecf0f1';
		context.font = '30px Arial';
		context.fillText('REINFORCEMENTS COMING...', CANVAS_WIDTH / 2, y + 110);
		
		// Instruction
		context.fillStyle = '#bdc3c7';
		context.font = '20px Arial';
		context.fillText('Press ENTER to continue', CANVAS_WIDTH / 2, y + 160);
		
		context.restore();
	}

	gainXP(amount) {
		this.playerStats.xp += amount;
		//console.log(`Gained ${amount} XP! Total: ${this.playerStats.xp}/${this.playerStats.xpToNext}`);
		
		// Check for level up
		while (this.playerStats.xp >= this.playerStats.xpToNext) {
			this.playerStats.xp -= this.playerStats.xpToNext;
			const oldLevel = this.playerStats.level;
			this.playerStats.level++;
			
			// Damage and healing scaling based on game mode
			let damageIncrease, healAmount, xpMultiplier;
			switch (this.gameSettings.gameMode) {
				case 'easy':
					damageIncrease = 6; // More damage per level
					healAmount = 25; // More healing per level
					xpMultiplier = 1.15; // 15% more XP needed (easier progression)
					break;
				case 'normal':
					damageIncrease = 5; // Normal damage per level
					healAmount = 20; // Normal healing per level
					xpMultiplier = 1.2; // 20% more XP needed
					break;
				case 'hard':
					damageIncrease = 3; // Less damage per level
					healAmount = 12; // Less healing per level
					xpMultiplier = 1.3; // 30% more XP needed (harder progression)
					break;
			}
			
			this.playerStats.damage += damageIncrease;
			this.playerStats.xpToNext = Math.floor(this.playerStats.xpToNext * xpMultiplier);
			
			// Auto-heal on level up
			this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
			
			//console.log(`LEVEL UP! Now level ${this.playerStats.level}! Damage: ${this.playerStats.damage} (+${damageIncrease}), Healed ${healAmount} HP! (${this.gameSettings.gameMode.toUpperCase()} mode)`);
			
			// Trigger reinforcements popup at level 5 and 12
			if ((oldLevel < 5 && this.playerStats.level >= 5) || (oldLevel < 12 && this.playerStats.level >= 12)) {
				//console.log(`🎉 Level ${this.playerStats.level} reached! Triggering reinforcements popup!`);
				this.showReinforcementsPopup = true;
				this.reinforcementsLevel = this.playerStats.level;
				this.isPaused = true;
				
				// Stop sounds
				if (this.sounds) {
					this.sounds.stopAll();
				}
			}
		}
	}

	/**
	 * Render UI elements like health, etc.
	 */
	renderUI() {
		this.userInterface.render();
	}

	exit() {
		// Clean up resources if needed
		this.levelMaker = null;
		this.player = null;
		
		// Remove event listeners
		this.cameraService.cleanup();
		sounds.stop('backgroundmusic');
	}

	/**
	 * Toggle pause state
	 */
	togglePause() {
		this.isPaused = !this.isPaused;
		
		if (this.isPaused) {
			this.pauseMenuOption = 0; // Reset to resume option
			
			// Stop all sounds when paused
			if (this.sounds) {
				this.sounds.stopAll();
			}
			
			// Reset movement states so sounds restart on resume
			if (this.player) {
				this.player.wasMoving = false;
				if (this.player.runningSound) {
					this.player.runningSound = null;
				}
			}
			
			if (this.enemies) {
				this.enemies.forEach(enemy => {
					enemy.wasMoving = false;
					if (enemy.runningSound) {
						enemy.runningSound = null;
					}
				});
			}
		} else {
			// Resume background music if enabled
			if (this.gameSettings.musicEnabled && this.sounds.get('backgroundmusic')) {
				this.sounds.play('backgroundmusic');
			}
		}
		
		//console.log(this.isPaused ? 'Game paused' : 'Game resumed');
	}
	
	/**
	 * Handle input during pause menu
	 */
	handlePauseMenuInput() {
		this.pauseMenu.handleInput();
	}
	
	/**
	 * Apply game mode settings to player stats
	 */
	applyGameMode() {
		switch (this.gameSettings.gameMode) {
			case GameMode.Easy:
				this.player.maxHealth = 200;
				this.player.health = Math.min(this.player.health, 200);
				this.playerStats.damage = 35;
				this.player.damageMultiplier = 1.0;
				break;
			case GameMode.Normal:
				this.player.maxHealth = 100;
				this.player.health = Math.min(this.player.health, 100);
				this.playerStats.damage = 15;
				this.player.damageMultiplier = 1.0;
				break;
			case GameMode.Hard:
				this.player.maxHealth = 100;
				this.player.health = Math.min(this.player.health, 100);
				this.playerStats.damage = 15;
				this.player.damageMultiplier = 1.4; // 40% more damage taken
				break;
		}
		// Game mode configured
	}
	
	/**
	 * Start background music
	 */
	startBackgroundMusic() {
		if (this.gameSettings.musicEnabled && sounds.get('backgroundmusic')) {
			try {
				const totalVolume = this.gameSettings.musicVolume * this.gameSettings.masterVolume;
				sounds.setVolume('backgroundmusic', totalVolume);
				sounds.play('backgroundmusic');
			} catch (e) {
				//console.log('Background music play failed:', e);
			}
		}
	}
	
	/**
	 * Update volume for background music
	 */
	updateMusicVolume() {
		if (sounds.get('backgroundmusic')) {
			const totalVolume = this.gameSettings.musicEnabled 
				? this.gameSettings.musicVolume * this.gameSettings.masterVolume 
				: 0;
			sounds.setVolume('backgroundmusic', totalVolume);
		}
	}

	/**
	 * Play sound effect
	 */
	playSFX(soundName, volume = 1.0) {
		if (this.gameSettings.soundEnabled) {
			const sound = sounds.get(soundName);
			if (sound) {
				// //console.log(`🔊 PlayState: Playing ${soundName}`);
				try {
					const totalVolume = volume * this.gameSettings.sfxVolume * this.gameSettings.masterVolume;
					sounds.setVolume(soundName, totalVolume);
					sounds.play(soundName);
				} catch (e) {
					console.error(`❌ SFX ${soundName} play failed:`, e);
				}
			} else {
				console.warn(`⚠️ SFX ${soundName} not found in sound pool`);
			}
		} else {
			// //console.log(`🔇 PlayState: Sound disabled, skipping ${soundName}`);
		}
	}
	

	

	
	/**
	 * Render the pause menu / settings screen
	 */
	renderPauseMenu() {
		this.pauseMenu.render();
	}
	


	updateTutorial(dt) {
		this.tutorialService.update(dt);
	}

	spawnChests() {
		if (this.chestSpawned) {
			//console.log('Chests already spawned');
			return;
		}
		
		const chestSpawnPoints = this.levelMaker.getChestSpawnPoints();
		//console.log('Chest spawn points found:', chestSpawnPoints.length, chestSpawnPoints);
		
		if (chestSpawnPoints.length === 0) {
			console.warn('No chest spawn points found! Check Tiled map for objects with entityType: Chest');
			return;
		}
		
		for (const spawnPoint of chestSpawnPoints) {
			//console.log('Creating chest at:', spawnPoint.x, spawnPoint.y, 'Name:', spawnPoint.name);
			const chest = new Chest(spawnPoint.x, spawnPoint.y, spawnPoint.name);
			this.chests.push(chest);
			//console.log('Chest created and added to array. Total chests:', this.chests.length);
		}
		
		this.chestSpawned = true;
		this.showChestSpawnMessage = true;
		this.chestSpawnMessageTimer = 5;
		//console.log('Chest spawning complete!');
	}
	
	skipTutorial() {
		this.tutorialService.skip();
	}

	renderTutorial() {
		this.tutorialService.render();
	}
}
