import EnemyFactory from "../services/Factory.js";

export default class EnemySpawner {
    constructor(state) {
        this.state = state;
    }

    spawnEnemies() {
        //console.log('👾 spawnEnemies called. tutorialActive:', this.state.tutorialActive);
        
        // Don't spawn enemies during tutorial except for parry step
        if (this.state.tutorialActive && this.state.tutorialStep < 3) {
            //console.log('🚫 Skipping spawnEnemies: tutorial step < 3');
            return;
        }
        
        // Don't spawn additional enemies if tutorial enemy is still alive
        if (this.state.tutorialActive && this.state.tutorialEnemy && !this.state.tutorialEnemy.isDead) {
            //console.log('🚫 Tutorial enemy still active');
            return;
        }
        
        // Spawn portals when tutorial is complete
        if (!this.state.tutorialActive && !this.state.portalSpawned) {
            // Note: spawnPortals was not in the provided code snippet of PlayState, 
            // but referenced. Assuming it might be a method I missed or need to keep in PlayState for now.
            // If it's missing, I'll comment it out or assume it's handled elsewhere.
            if (this.state.spawnPortals) {
                this.state.spawnPortals();
            }
        }
        
        const enemySpawns = this.state.levelMaker.getEnemySpawnPoints();
        //console.log(`📍 Found ${enemySpawns.length} enemy spawn points`);
        
        for (const spawn of enemySpawns) {
            // Check if this enemy should only spawn after tutorial
            const demonMatch = spawn.name.match(/^Demon(\d+)$/);
            const isPostTutorialEnemy = demonMatch && parseInt(demonMatch[1]) > 1;
            
            if (isPostTutorialEnemy && this.state.tutorialActive) {
                continue; 
            }
            
            // Check if this is a knight spawn - only spawn knights at level 5+
            const knightMatch = spawn.name.match(/^knight(\d+)$/i);
            const isKnight = knightMatch || spawn.enemyType === 'knight';
            
            // Check if this is a wizard spawn - only spawn wizards at level 12+
            const wizardMatch = spawn.name.match(/^evilwizard(\d+)$/i);
            const isWizard = wizardMatch || spawn.enemyType === 'evil_wizard';
            
            if (isKnight && this.state.playerStats.level < 5) {
                continue; 
            }
            
            if (isWizard && this.state.playerStats.level < 12) {
                continue; 
            }
            
            // Check if enemy already exists at this location
            const alreadyExists = this.state.enemies.some(e => 
                Math.abs(e.position.x - spawn.x) < 10 && 
                Math.abs(e.position.y - spawn.y) < 10
            );
            
            if (alreadyExists) {
                continue;
            }

            this.createAndAddEnemy(spawn, isKnight, isWizard, demonMatch);
        }
        //console.log(`✅ Spawned ${this.state.enemies.length} enemies`);
    }

    spawnPostTutorialEnemies() {
        const enemySpawns = this.state.levelMaker.getEnemySpawnPoints();
        
        for (const spawn of enemySpawns) {
            const demonMatch = spawn.name.match(/^Demon(\d+)$/);
            const isPostTutorialEnemy = demonMatch && parseInt(demonMatch[1]) > 1;
            
            const knightMatch = spawn.name.match(/^knight(\d+)$/i);
            const isKnight = knightMatch || spawn.enemyType === 'knight';
            const canSpawnKnight = isKnight && this.state.playerStats.level >= 5;
            
            const wizardMatch = spawn.name.match(/^evilwizard(\d+)$/i);
            const isWizard = wizardMatch || spawn.enemyType === 'evil_wizard';
            const canSpawnWizard = isWizard && this.state.playerStats.level >= 12;
            
            if (isPostTutorialEnemy || canSpawnKnight || canSpawnWizard) {
                const alreadySpawned = this.state.enemies.some(enemy => 
                    Math.abs(enemy.position.x - spawn.x) < 10 && 
                    Math.abs(enemy.position.y - spawn.y) < 10
                );
                
                if (!alreadySpawned) {
                    //console.log(`👹 Spawning post-tutorial enemy: ${spawn.name} at (${spawn.x}, ${spawn.y})`);
                    this.createAndAddEnemy(spawn, isKnight, isWizard, demonMatch);
                }
            }
        }
    }

    createAndAddEnemy(spawn, isKnight, isWizard, demonMatch) {
        try {
            let enemy;
            if (isKnight) {
                enemy = EnemyFactory.createEnemy('knight', spawn.x, spawn.y, this.state.levelMaker);
            } else if (isWizard) {
                enemy = EnemyFactory.createEnemy('wizard', spawn.x, spawn.y, this.state.levelMaker);
            } else {
                const demonNumber = demonMatch ? parseInt(demonMatch[1]) : null;
                const ignoreCollisions = (demonNumber === 2 || demonNumber === 4 || demonNumber === 5);
                
                enemy = EnemyFactory.createEnemy(spawn.enemyType, spawn.x, spawn.y, this.state.levelMaker, {
                    ignoreCollisions: ignoreCollisions
                });
                
                if (this.state.tutorialActive && spawn.name === 'Demon1') {
                    //console.log('🔗 Linked tutorial enemy (Demon1)');
                    this.state.tutorialEnemy = enemy;
                    enemy.isTutorialEnemy = true;
                }
                
                if (ignoreCollisions) {
                    //console.log(`${spawn.name} will ignore collisions (flying demon)`);
                }
            }
            
            if (enemy) {
                enemy.startPatrol();
                this.state.enemies.push(enemy);
            }
        } catch (err) {
            console.error(`Failed to spawn enemy ${spawn.name}:`, err);
        }
    }
}
