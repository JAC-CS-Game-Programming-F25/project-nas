import { context, CANVAS_WIDTH, CANVAS_HEIGHT, input, stateMachine, sounds } from "../globals.js";
import PauseMenuOption from "../enums/PauseMenuOption.js";
import GameMode from "../enums/GameMode.js";

export default class PauseMenu {
    constructor(playState) {
        this.playState = playState;
        this.option = 0;
        this.options = [
            'Resume Game',
            'Music: ON',
            'Music Volume: 70%',
            'Sound: ON',
            'SFX Volume: 80%',
            'Mode: NORMAL',
            'Main Menu'
        ];
        this.updateLabels();
    }

    updateLabels() {
        const settings = this.playState.gameSettings;
        this.options[1] = `Music: ${settings.musicEnabled ? 'ON' : 'OFF'}`;
        this.options[2] = `Music Volume: ${Math.round(settings.musicVolume * 100)}%`;
        this.options[3] = `Sound: ${settings.soundEnabled ? 'ON' : 'OFF'}`;
        this.options[4] = `SFX Volume: ${Math.round(settings.sfxVolume * 100)}%`;
        this.options[5] = `Mode: ${settings.gameMode.toUpperCase()}`;
    }

    handleInput() {
        // Navigation
        if (input.isKeyPressed('W') || input.isKeyPressed('ArrowUp')) {
            this.option = (this.option - 1 + this.options.length) % this.options.length;
            this.playState.playSFX('menuswitching', 0.5);
        }
        if (input.isKeyPressed('S') || input.isKeyPressed('ArrowDown')) {
            this.option = (this.option + 1) % this.options.length;
            this.playState.playSFX('menuswitching', 0.5);
        }
        
        // Volume adjustments with A/D keys
        if (input.isKeyPressed('A') || input.isKeyPressed('ArrowLeft')) {
            this.adjustVolume(-0.1);
            this.playState.playSFX('menuswitching', 0.3);
        }
        if (input.isKeyPressed('D') || input.isKeyPressed('ArrowRight')) {
            this.adjustVolume(0.1);
            this.playState.playSFX('menuswitching', 0.3);
        }
        
        // Selection
        if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
            this.playState.playSFX('menuselect', 0.7);
            this.handleSelection();
        }
    }

    handleSelection() {
        const settings = this.playState.gameSettings;
        
        switch (this.option) {
            case PauseMenuOption.Resume: // Resume
                this.playState.togglePause();
                break;
            case PauseMenuOption.MusicToggle: // Music toggle
                settings.musicEnabled = !settings.musicEnabled;
                this.updateLabels();
                settings.save();
                this.playState.updateMusicVolume();
                break;
            case PauseMenuOption.MusicVolume: // Music Volume (handled by A/D keys)
                break;
            case PauseMenuOption.SoundToggle: // Sound toggle
                settings.soundEnabled = !settings.soundEnabled;
                this.updateLabels();
                settings.save();
                break;
            case PauseMenuOption.SFXVolume: // SFX Volume (handled by A/D keys)
                break;
            case PauseMenuOption.Difficulty: // Difficulty cycle
                this.cycleDifficulty();
                break;
            case PauseMenuOption.MainMenu: // Main menu
                if (this.playState.persistence) {
                    this.playState.persistence.saveLeaderboardEntry();
                    this.playState.persistence.saveGame(); // Save progress before quitting
                }
                stateMachine.change('mainMenu');
                break;
        }
    }

    adjustVolume(delta) {
        const settings = this.playState.gameSettings;
        
        if (this.option === 2) { // Music Volume
            settings.musicVolume = Math.max(0, Math.min(1, settings.musicVolume + delta));
            this.playState.updateMusicVolume();
        } else if (this.option === 4) { // SFX Volume  
            settings.sfxVolume = Math.max(0, Math.min(1, settings.sfxVolume + delta));
        }
        
        this.updateLabels();
        settings.save();
    }

    cycleDifficulty() {
        const modes = [GameMode.Easy, GameMode.Normal, GameMode.Hard];
        const settings = this.playState.gameSettings;
        const currentIndex = modes.indexOf(settings.gameMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        settings.gameMode = modes[nextIndex];
        this.updateLabels();
        this.playState.applyGameMode();
    }

    render() {
        // Dark overlay
        context.save(); // Save context state before rendering
        context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to draw UI in screen coordinates

        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Menu box
        const boxWidth = 400;
        const boxHeight = 400;
        const boxX = CANVAS_WIDTH / 2 - boxWidth / 2;
        const boxY = CANVAS_HEIGHT / 2 - boxHeight / 2;
        
        context.fillStyle = 'rgba(20, 20, 40, 0.9)';
        context.fillRect(boxX, boxY, boxWidth, boxHeight);
        context.strokeStyle = '#FFD700';
        context.lineWidth = 4;
        context.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Title
        context.fillStyle = '#FFD700';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';
        context.fillText('PAUSED', CANVAS_WIDTH / 2, boxY + 60);
        
        // Options
        context.font = '24px Arial';
        const startY = boxY + 120;
        const spacing = 40;
        
        for (let i = 0; i < this.options.length; i++) {
            const y = startY + (i * spacing);
            
            if (i === this.option) {
                context.fillStyle = '#FFD700';
                context.fillText(`> ${this.options[i]} <`, CANVAS_WIDTH / 2, y);
            } else {
                context.fillStyle = '#FFFFFF';
                context.fillText(this.options[i], CANVAS_WIDTH / 2, y);
            }
        }
        
        // Instructions
        context.fillStyle = '#AAAAAA';
        context.font = '16px Arial';
        context.fillText('Use W/S to navigate, A/D to adjust values', CANVAS_WIDTH / 2, boxY + boxHeight - 20);
        
        context.textAlign = 'left';
        context.restore(); // Restore context state
    }
}
