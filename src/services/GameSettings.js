import GameMode from "../enums/GameMode.js";

export default class GameSettings {
    constructor() {
        this.settings = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('gameSettings');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load game settings:', e);
        }
        
        // Default settings
        return {
            musicEnabled: true,
            soundEnabled: true,
            gameMode: GameMode.Normal,
            masterVolume: 0.5,
            musicVolume: 0.7,
            sfxVolume: 0.8
        };
    }

    save() {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save game settings:', e);
        }
    }

    get musicEnabled() { return this.settings.musicEnabled; }
    set musicEnabled(value) { this.settings.musicEnabled = value; }

    get soundEnabled() { return this.settings.soundEnabled; }
    set soundEnabled(value) { this.settings.soundEnabled = value; }

    get gameMode() { return this.settings.gameMode; }
    set gameMode(value) { this.settings.gameMode = value; }

    get masterVolume() { return this.settings.masterVolume; }
    set masterVolume(value) { this.settings.masterVolume = value; }

    get musicVolume() { return this.settings.musicVolume; }
    set musicVolume(value) { this.settings.musicVolume = value; }

    get sfxVolume() { return this.settings.sfxVolume; }
    set sfxVolume(value) { this.settings.sfxVolume = value; }
}
