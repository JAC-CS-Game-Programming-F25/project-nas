import State from "../../lib/State.js";
import { context, CANVAS_WIDTH, CANVAS_HEIGHT, input, stateMachine, sounds, images } from "../globals.js";
import GameStateName from "../enums/GameStateName.js";

export default class MainMenuState extends State {
	constructor() {
		super();
		this.selectedOption = 0;
		this.menuOptions = [
			'START',
			'SETTINGS', 
			'LEADERBOARD'
		];
		
		// Check for saved game
		if (localStorage.getItem('savedGame')) {
			this.menuOptions.unshift('RESUME');
		}

		this.showSettings = false;
		this.showLeaderboard = false;
		
		// Settings menu (copied from PlayState)
		this.gameSettings = this.loadGameSettings();
		
		this.pauseMenuOption = 0;
		this.pauseMenuOptions = [
			'Resume Game',
			'Music: ON',
			'Music Volume: 50%',
			'Sound: ON',
			'SFX Volume: 50%', 
			'Mode: NORMAL',
			'Main Menu'
		];
		
		this.leaderboardData = this.loadLeaderboard();
	}
	
	enter() {
		//console.log("Entered Main Menu");
		
		// Re-check for saved game
		this.menuOptions = [
			'START',
			'SETTINGS', 
			'LEADERBOARD'
		];
		if (localStorage.getItem('savedGame')) {
			this.menuOptions.unshift('RESUME');
		}
		
		this.updateSettingsLabels();
	}
	
	/**
	 * Play sound effect
	 */
	playSFX(soundName, volume = 1.0) {
		if (this.gameSettings.soundEnabled && sounds.get(soundName)) {
			try {
				const totalVolume = volume * this.gameSettings.sfxVolume * this.gameSettings.masterVolume;
				sounds.setVolume(soundName, totalVolume);
				sounds.play(soundName);
			} catch (e) {
				//console.log(`SFX ${soundName} play failed:`, e);
			}
		}
	}
	
	update(dt) {
		if (this.showSettings) {
			this.handleSettingsInput();
		} else if (this.showLeaderboard) {
			this.handleLeaderboardInput();
		} else {
			this.handleMainMenuInput();
		}
	}
	
	handleMainMenuInput() {
		// Navigation
		if (input.isKeyPressed('W') || input.isKeyPressed('ArrowUp')) {
			this.selectedOption = (this.selectedOption - 1 + this.menuOptions.length) % this.menuOptions.length;
			this.playSFX('menuswitching', 0.5);
		}
		if (input.isKeyPressed('S') || input.isKeyPressed('ArrowDown')) {
			this.selectedOption = (this.selectedOption + 1) % this.menuOptions.length;
			this.playSFX('menuswitching', 0.5);
		}
		
		// Selection
		if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
			this.playSFX('menuselect', 0.7);
			this.handleMainMenuSelection();
		}
	}
	
	handleMainMenuSelection() {
		const selectedText = this.menuOptions[this.selectedOption];
		
		switch (selectedText) {
			case 'RESUME':
				stateMachine.change(GameStateName.Play, { loadGame: true });
				break;
			case 'START':
				// Transition to PlayState with the selected game mode
				stateMachine.change(GameStateName.Play, { gameMode: this.gameSettings.gameMode });
				break;
			case 'SETTINGS':
				this.showSettings = true;
				this.pauseMenuOption = 0;
				break;
			case 'LEADERBOARD':
				this.showLeaderboard = true;
				break;
		}
	}
	
	handleSettingsInput() {
		// Back to main menu
		if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace')) {
			this.showSettings = false;
			return;
		}
		
		// Navigation
		if (input.isKeyPressed('W') || input.isKeyPressed('ArrowUp')) {
			this.pauseMenuOption = (this.pauseMenuOption - 1 + this.pauseMenuOptions.length - 1) % (this.pauseMenuOptions.length - 1); // Skip "Resume Game"
			this.playSFX('menuswitching', 0.5);
		}
		if (input.isKeyPressed('S') || input.isKeyPressed('ArrowDown')) {
			this.pauseMenuOption = (this.pauseMenuOption + 1) % (this.pauseMenuOptions.length - 1); // Skip "Resume Game"
			this.playSFX('menuswitching', 0.5);
		}
		
		// Volume adjustments with A/D keys
		if (input.isKeyPressed('A') || input.isKeyPressed('ArrowLeft')) {
			this.adjustVolume(-0.1);
			this.playSFX('menuswitching', 0.3);
		}
		if (input.isKeyPressed('D') || input.isKeyPressed('ArrowRight')) {
			this.adjustVolume(0.1);
			this.playSFX('menuswitching', 0.3);
		}
		
		// Selection
		if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
			this.playSFX('menuselect', 0.7);
			this.handleSettingsSelection();
		}
	}
	
	handleSettingsSelection() {
		switch (this.pauseMenuOption + 1) { // +1 because we skip "Resume Game"
			case 1: // Music toggle
				this.gameSettings.musicEnabled = !this.gameSettings.musicEnabled;
				this.updateSettingsLabels();
				this.saveGameSettings();
				break;
			case 2: // Music Volume (handled by A/D keys)
				break;
			case 3: // Sound toggle
				this.gameSettings.soundEnabled = !this.gameSettings.soundEnabled;
				this.updateSettingsLabels();
				this.saveGameSettings();
				break;
			case 4: // SFX Volume (handled by A/D keys)
				break;
			case 5: // Difficulty cycle
				this.cycleDifficulty();
				this.saveGameSettings();
				break;
			case 6: // Back to main menu
				this.showSettings = false;
				break;
		}
	}
	
	handleLeaderboardInput() {
		// Back to main menu
		if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace') || input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
			this.showLeaderboard = false;
		}
	}
	
	updateSettingsLabels() {
		this.pauseMenuOptions[1] = `Music: ${this.gameSettings.musicEnabled ? 'ON' : 'OFF'}`;
		this.pauseMenuOptions[2] = `Music Volume: ${Math.round(this.gameSettings.musicVolume * 100)}%`;
		this.pauseMenuOptions[3] = `Sound: ${this.gameSettings.soundEnabled ? 'ON' : 'OFF'}`;
		this.pauseMenuOptions[4] = `SFX Volume: ${Math.round(this.gameSettings.sfxVolume * 100)}%`;
		this.pauseMenuOptions[5] = `Mode: ${this.gameSettings.gameMode.toUpperCase()}`;
		this.pauseMenuOptions[6] = 'Back';
	}

	adjustVolume(delta) {
		const currentOption = this.pauseMenuOption + 1; // +1 because we skip "Resume Game"
		
		if (currentOption === 2) { // Music Volume
			this.gameSettings.musicVolume = Math.max(0, Math.min(1, this.gameSettings.musicVolume + delta));
			this.updateMusicVolume();
		} else if (currentOption === 4) { // SFX Volume  
			this.gameSettings.sfxVolume = Math.max(0, Math.min(1, this.gameSettings.sfxVolume + delta));
		}
		
		this.updateSettingsLabels();
		this.saveGameSettings();
	}

	updateMusicVolume() {
		if (sounds.get('backgroundmusic')) {
			const totalVolume = this.gameSettings.musicEnabled 
				? this.gameSettings.musicVolume * this.gameSettings.masterVolume 
				: 0;
			sounds.setVolume('backgroundmusic', totalVolume);
		}
	}

	loadGameSettings() {
		try {
			const saved = localStorage.getItem('gameSettings');
			if (saved) {
				return JSON.parse(saved);
			}
		} catch (e) {
			console.warn('Failed to load game settings:', e);
		}
		
		// Default settings if nothing saved or loading failed
		return {
			musicEnabled: true,
			soundEnabled: true,
			gameMode: 'normal',
			masterVolume: 0.5,
			musicVolume: 0, // Muted by default
			sfxVolume: 0.8
		};
	}

	saveGameSettings() {
		try {
			localStorage.setItem('gameSettings', JSON.stringify(this.gameSettings));
		} catch (e) {
			console.warn('Failed to save game settings:', e);
		}
	}
	
	cycleDifficulty() {
		const modes = ['easy', 'normal', 'hard'];
		const currentIndex = modes.indexOf(this.gameSettings.gameMode);
		const nextIndex = (currentIndex + 1) % modes.length;
		this.gameSettings.gameMode = modes[nextIndex];
		this.updateSettingsLabels();
	}
	
	loadLeaderboard() {
		try {
			const saved = localStorage.getItem('gameLeaderboard');
			return saved ? JSON.parse(saved) : [];
		} catch (e) {
			console.error('Error loading leaderboard:', e);
			return [];
		}
	}
	
	render() {
		// Background
		images.render('mainmenuimage', 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		if (this.showSettings) {
			this.renderSettings();
		} else if (this.showLeaderboard) {
			this.renderLeaderboard();
		} else {
			this.renderMainMenu();
		}
	}
	
	renderMainMenu() {
		// Game title
		context.fillStyle = '#FFD700';
		context.font = 'bold 72px Arial';
		context.textAlign = 'center';
		// context.fillText('HEUCO MUNDO', CANVAS_WIDTH / 2, 150);
		
		// Subtitle
		context.fillStyle = '#CCCCCC';
		context.font = '24px Arial';
		
		// Menu options
		const menuStartY = 300;
		const menuSpacing = 80;
		
		for (let i = 0; i < this.menuOptions.length; i++) {
			const y = menuStartY + (i * menuSpacing);
			const isSelected = i === this.selectedOption;
			
			// Button Background
			// "buttons button around it should be grey unless hovered"
			if (isSelected) {
				context.fillStyle = 'rgba(255, 215, 0, 0.5)'; // Gold highlight when hovered
			} else {
				context.fillStyle = 'rgba(128, 128, 128, 0.5)'; // Gray default
			}
			context.fillRect(CANVAS_WIDTH / 2 - 150, y - 35, 300, 50);
			
			// Option text
			context.font = isSelected ? 'bold 36px Arial' : '32px Arial';
			context.textAlign = 'center';

			// "outline of the text itself be gray"
			context.strokeStyle = 'gray';
			context.lineWidth = 1;
			context.strokeText(this.menuOptions[i], CANVAS_WIDTH / 2, y);

			// "button text be white"
			context.fillStyle = '#FFFFFF';
			context.fillText(this.menuOptions[i], CANVAS_WIDTH / 2, y);
		}
		
		// Instructions
		context.fillStyle = '#888888';
		context.font = '18px Arial';
		context.textAlign = 'center';
		context.fillText('Use W/S or Arrow Keys to navigate', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
		context.fillText('Press ENTER or SPACE to select', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 35);
	}
	
	renderSettings() {
		// Semi-transparent overlay
		context.fillStyle = 'rgba(0, 0, 0, 0.8)';
		context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		// Settings panel background
		const panelWidth = 600;
		const panelHeight = 400;
		const panelX = (CANVAS_WIDTH - panelWidth) / 2;
		const panelY = (CANVAS_HEIGHT - panelHeight) / 2;
		
		context.fillStyle = 'rgba(30, 30, 60, 0.95)';
		context.strokeStyle = '#FFD700';
		context.lineWidth = 3;
		context.fillRect(panelX, panelY, panelWidth, panelHeight);
		context.strokeRect(panelX, panelY, panelWidth, panelHeight);
		
		// Title
		context.fillStyle = '#FFD700';
		context.font = 'bold 36px Arial';
		context.textAlign = 'center';
		context.fillText('SETTINGS', CANVAS_WIDTH / 2, panelY + 60);
		
		// Menu options (skip first option which is "Resume Game")
		const optionStartY = panelY + 120;
		const optionSpacing = 50;
		
		for (let i = 1; i < this.pauseMenuOptions.length; i++) {
			const displayIndex = i - 1;
			const y = optionStartY + (displayIndex * optionSpacing);
			const isSelected = displayIndex === this.pauseMenuOption;
			
			// Highlight selected option
			if (isSelected) {
				context.fillStyle = 'rgba(255, 215, 0, 0.3)';
				context.fillRect(panelX + 50, y - 20, panelWidth - 100, 35);
			}
			
			// Option text
			context.fillStyle = isSelected ? '#FFD700' : '#FFFFFF';
			context.font = isSelected ? 'bold 24px Arial' : '20px Arial';
			context.textAlign = 'center';
			context.fillText(this.pauseMenuOptions[i], CANVAS_WIDTH / 2, y);
		}
		
		// Instructions
		context.fillStyle = '#CCCCCC';
		context.font = '16px Arial';
		context.textAlign = 'center';
		// context.fillText('ESC or Backspace to go back', CANVAS_WIDTH / 2, panelY + panelHeight - 20);
	}
	
	renderLeaderboard() {
		// Semi-transparent overlay
		context.fillStyle = 'rgba(0, 0, 0, 0.8)';
		context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		// Leaderboard panel background
		const panelWidth = 700;
		const panelHeight = 500;
		const panelX = (CANVAS_WIDTH - panelWidth) / 2;
		const panelY = (CANVAS_HEIGHT - panelHeight) / 2;
		
		context.fillStyle = 'rgba(30, 30, 60, 0.95)';
		context.strokeStyle = '#FFD700';
		context.lineWidth = 3;
		context.fillRect(panelX, panelY, panelWidth, panelHeight);
		context.strokeRect(panelX, panelY, panelWidth, panelHeight);
		
		// Title
		context.fillStyle = '#FFD700';
		context.font = 'bold 36px Arial';
		context.textAlign = 'center';
		context.fillText('LEADERBOARD', CANVAS_WIDTH / 2, panelY + 60);
		
		// Headers
		context.fillStyle = '#FFFFFF';
		context.font = 'bold 20px Arial';
		context.textAlign = 'left';
		context.fillText('TIME SURVIVED', panelX + 50, panelY + 120);
		context.textAlign = 'center';
		context.fillText('ENEMIES KILLED', CANVAS_WIDTH / 2, panelY + 120);
		context.textAlign = 'right';
		context.fillText('DIFFICULTY', panelX + panelWidth - 50, panelY + 120);
		
		// Leaderboard entries
		if (this.leaderboardData.length === 0) {
			context.fillStyle = '#888888';
			context.font = '24px Arial';
			context.textAlign = 'center';
			context.fillText('No records yet!', CANVAS_WIDTH / 2, panelY + 250);
			context.fillText('Play the game to set your first record.', CANVAS_WIDTH / 2, panelY + 280);
		} else {
			const entryStartY = panelY + 160;
			const entrySpacing = 35;
			
			// Sort by time survived (descending)
			const sortedData = [...this.leaderboardData].sort((a, b) => b.timeSeconds - a.timeSeconds);
			
			for (let i = 0; i < Math.min(sortedData.length, 8); i++) {
				const entry = sortedData[i];
				const y = entryStartY + (i * entrySpacing);
				
				// Rank
				context.fillStyle = i < 3 ? '#FFD700' : '#CCCCCC';
				context.font = '18px Arial';
				context.textAlign = 'left';
				context.fillText(`${i + 1}.`, panelX + 20, y);
				
				// Time
				const minutes = Math.floor(entry.timeSeconds / 60);
				const seconds = Math.floor(entry.timeSeconds % 60);
				context.fillStyle = '#FFFFFF';
				context.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, panelX + 80, y);
				
				// Enemies killed
				context.textAlign = 'center';
				context.fillText(`${entry.enemiesKilled}`, CANVAS_WIDTH / 2, y);
				
				// Difficulty
				context.textAlign = 'right';
				const difficultyColor = entry.difficulty === 'easy' ? '#00FF00' : 
									  entry.difficulty === 'normal' ? '#FFFF00' : '#FF0000';
				context.fillStyle = difficultyColor;
				context.fillText(entry.difficulty.toUpperCase(), panelX + panelWidth - 50, y);
			}
		}
		
		// Instructions
		context.fillStyle = '#CCCCCC';
		context.font = '16px Arial';
		context.textAlign = 'center';
		context.fillText('Press any key to go back', CANVAS_WIDTH / 2, panelY + panelHeight - 20);
	}
	
	exit() {
		// Clean up
	}
}