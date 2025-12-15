import GameStateName from "../enums/GameStateName.js";

export default class Persistence {
    constructor(state) {
        this.state = state;
    }

    saveGame() {
        try {
            const saveData = {
                playerStats: this.state.playerStats,
                tutorialCompleted: this.state.tutorialCompleted,
                tutorialActive: this.state.tutorialActive,
                tutorialStep: this.state.tutorialStep,
                selectedAbility: this.state.selectedAbility,
                timeSurvived: this.state.timeSurvived,
                enemiesKilled: this.state.enemiesKilled,
                chestSpawned: this.state.chestSpawned,
            };
            
            localStorage.setItem('savedGame', JSON.stringify(saveData));
            //console.log('Game saved successfully!');
        } catch (e) {
            console.error('Error saving game:', e);
        }
    }

    loadGame() {
        try {
            const savedJSON = localStorage.getItem('savedGame');
            if (savedJSON) {
                const saveData = JSON.parse(savedJSON);
                
                this.state.playerStats = saveData.playerStats;
                this.state.tutorialCompleted = saveData.tutorialCompleted;
                this.state.tutorialActive = saveData.tutorialActive;
                if (saveData.tutorialStep !== undefined) {
                    this.state.tutorialStep = saveData.tutorialStep;
                }
                this.state.selectedAbility = saveData.selectedAbility;
                this.state.timeSurvived = saveData.timeSurvived || 0;
                this.state.enemiesKilled = saveData.enemiesKilled || 0;
                this.state.chestSpawned = saveData.chestSpawned || false;
                
                if (this.state.selectedAbility) {
                    this.state.updatePlayerAbilitySprites(this.state.selectedAbility);
                }
                
                if (!this.state.tutorialActive) {
                    if (this.state.tutorialEnemy) {
                        const index = this.state.enemies.indexOf(this.state.tutorialEnemy);
                        if (index > -1) {
                            this.state.enemies.splice(index, 1);
                        }
                        this.state.tutorialEnemy = null;
                    }
                    
                    if (!this.state.chestSpawned && this.state.levelMaker) {
                        this.state.spawnChests();
                    }
                }
                
                if (this.state.playerStats.level > 1 && this.state.tutorialActive) {
                    //console.log('🔧 Fixing old save: Player level > 1 but tutorial active. Disabling tutorial.');
                    this.state.tutorialActive = false;
                    this.state.tutorialCompleted = {
                        movement: true,
                        attack: true,
                        dash: true,
                        parry: true,
                        killEnemy: true
                    };
                }
                
                //console.log('Game loaded successfully!');
            }
        } catch (e) {
            console.error('Error loading game:', e);
        }
    }

    saveLeaderboardEntry() {
        try {
            const existing = localStorage.getItem('gameLeaderboard');
            const leaderboard = existing ? JSON.parse(existing) : [];
            
            const entry = {
                timeSeconds: this.state.timeSurvived,
                enemiesKilled: this.state.enemiesKilled,
                difficulty: this.state.gameSettings.gameMode,
                date: new Date().toISOString(),
                level: this.state.playerStats.level
            };
            
            leaderboard.push(entry);
            
            leaderboard.sort((a, b) => b.timeSeconds - a.timeSeconds);
            const trimmed = leaderboard.slice(0, 50);
            
            localStorage.setItem('gameLeaderboard', JSON.stringify(trimmed));
            
            //console.log(`Saved leaderboard entry: ${Math.floor(this.state.timeSurvived)}s survived, ${this.state.enemiesKilled} enemies killed, ${this.state.gameSettings.gameMode} mode`);
        } catch (e) {
            console.error('Error saving leaderboard entry:', e);
        }
    }
}
