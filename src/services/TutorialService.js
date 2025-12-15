import EnemyFactory from "./Factory.js";
import { context, CANVAS_WIDTH, CANVAS_HEIGHT, input } from "../globals.js";

export default class TutorialService {
    constructor(playState) {
        this.playState = playState;
        this.active = true;
        this.step = 0;
        this.completed = {
            movement: false,
            attack: false,
            dash: false,
            parry: false,
            killEnemy: false
        };
        this.inputs = {
            w: false, a: false, s: false, d: false,
            attacked: false,
            dashed: false,
            parried: false
        };
        this.enemy = null;
        this.freezeFrame = false;
        this.freezeTimer = 0;
    }

    update(dt) {
        if (!this.active) return;

        // Track movement inputs
        if (input.isKeyHeld('W')) this.inputs.w = true;
        if (input.isKeyHeld('A')) this.inputs.a = true;
        if (input.isKeyHeld('S')) this.inputs.s = true;
        if (input.isKeyHeld('D')) this.inputs.d = true;
        
        // Track attack
        if (this.playState.player.isAttacking && !this.inputs.attacked) {
            this.inputs.attacked = true;
        }
        
        // Track dash
        if (this.playState.player.isDashing && !this.inputs.dashed) {
            this.inputs.dashed = true;
        }
        
        // Tutorial step progression
        switch (this.step) {
            case 0: // Movement tutorial
                if (this.inputs.w && this.inputs.a && this.inputs.s && this.inputs.d) {
                    this.completed.movement = true;
                    this.step++;
                }
                break;
                
            case 1: // Attack tutorial
                if (this.inputs.attacked) {
                    this.completed.attack = true;
                    this.step++;
                    //console.log('Attack tutorial completed!');
                }
                break;
                
            case 2: // Dash tutorial
                if (this.inputs.dashed) {
                    this.completed.dash = true;
                    this.step++;
                    this.spawnTutorialEnemy();
                    //console.log('Dash tutorial completed! Spawning enemy for parry tutorial.');
                }
                break;
                
            case 3: // Parry tutorial
                if (this.enemy && this.enemy.state === 'attack' && this.enemy.attackTimer > 0.25 && this.enemy.attackTimer < 0.35) {
                    if (!this.freezeFrame) {
                        this.freezeFrame = true;
                        this.freezeTimer = 0;
                        //console.log('FREEZE FRAME - Press E to parry!');
                    }
                    
                    // Check for parry input during freeze
                    if (input.isKeyPressed('E')) {
                        this.freezeFrame = false;
                        this.completed.parry = true;
                        this.step++; // Move to kill enemy step
                        //console.log('Parry tutorial completed! Now kill the enemy!');
                        // Trigger the actual parry
                        this.playState.player.startParry();
                        this.enemy.getStunned();
                    }
                }
                break;
                
            case 4: // Kill enemy tutorial
                if (this.enemy && this.enemy.isDead) {
                    this.completed.killEnemy = true;
                    this.active = false;
                    //console.log('Kill enemy tutorial completed! Tutorial finished!');
                    // Give special loot/XP bonus
                    this.playState.gainXP(100); // Bonus XP for tutorial completion
                    // Spawn post-tutorial enemies
                    this.playState.enemySpawner.spawnPostTutorialEnemies();
                }
                break;
        }
    }

    spawnTutorialEnemy() {
        // Spawn a single enemy near the player for parry tutorial
        const playerX = this.playState.player.position.x;
        const playerY = this.playState.player.position.y;
        
        this.enemy = EnemyFactory.createEnemy('flying_demon', playerX + 100, playerY, this.playState.levelMaker);
        this.enemy.state = 'chase'; // Make it immediately chase the player
        this.playState.enemies.push(this.enemy);
    }

    skip() {
        // Complete all tutorial steps
        this.completed.movement = true;
        this.completed.attack = true;
        this.completed.dash = true;
        this.completed.parry = true;
        this.completed.killEnemy = true;
        
        // End tutorial
        this.active = false;
        this.freezeFrame = false;
        
        // Remove tutorial enemy if it exists
        if (this.enemy) {
            const index = this.playState.enemies.indexOf(this.enemy);
            if (index > -1) {
                this.playState.enemies.splice(index, 1);
            }
            this.enemy = null;
        }
        
        // For testing purposes - set player to level 13 to enable wizards
        this.playState.playerStats.level = 13;
        this.playState.playerStats.damage = 15 + (4 * 13); // Base 15 + 5 per level from level 1-13
        //console.log(`🧪 Testing mode: Player boosted to level 13 for wizard testing!`);
        
        // Spawn post-tutorial enemies
        this.playState.enemySpawner.spawnPostTutorialEnemies();
        
        // Give tutorial completion bonus
        this.playState.gainXP(100);
        
        //console.log('Tutorial skipped! All steps completed.');
    }

    render() {
        if (!this.active) return;

        // Tutorial background
        context.fillStyle = 'rgba(0, 0, 0, 0.3)';
        context.fillRect(0, 0, CANVAS_WIDTH, 150);
        
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        
        switch (this.step) {
            case 0:
                context.fillText('TUTORIAL: Movement', CANVAS_WIDTH / 2, 30);
                context.font = '18px Arial';
                context.fillStyle = this.inputs.w ? '#00FF00' : '#FFFFFF';
                context.fillText('Press W to move up', CANVAS_WIDTH / 2, 60);
                context.fillStyle = this.inputs.a ? '#00FF00' : '#FFFFFF';
                context.fillText('Press A to move left', CANVAS_WIDTH / 2, 80);
                context.fillStyle = this.inputs.s ? '#00FF00' : '#FFFFFF';
                context.fillText('Press S to move down', CANVAS_WIDTH / 2, 100);
                context.fillStyle = this.inputs.d ? '#00FF00' : '#FFFFFF';
                context.fillText('Press D to move right', CANVAS_WIDTH / 2, 120);
                break;
                
            case 1:
                context.fillText('TUTORIAL: Attack', CANVAS_WIDTH / 2, 30);
                context.font = '18px Arial';
                context.fillStyle = this.inputs.attacked ? '#00FF00' : '#FFFFFF';
                context.fillText('Left Click to attack', CANVAS_WIDTH / 2, 70);
                break;
                
            case 2:
                context.fillText('TUTORIAL: Dash', CANVAS_WIDTH / 2, 30);
                context.font = '18px Arial';
                context.fillStyle = this.inputs.dashed ? '#00FF00' : '#FFFFFF';
                context.fillText('Hold W and Press SHIFT to dash', CANVAS_WIDTH / 2, 70);
                break;
                
            case 3:
                if (this.freezeFrame) {
                    // Freeze frame parry prompt with purple text
                    context.fillStyle = '#8A2BE2';
                    context.font = 'bold 48px Arial';
                    context.textAlign = 'center';
                    context.fillText('PRESS E TO PARRY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                    
                    context.fillStyle = '#9370DB';
                    context.font = '24px Arial';
                    context.fillText('Perfect timing!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
                } else {
                    context.fillText('TUTORIAL: Parry', CANVAS_WIDTH / 2, 30);
                    context.font = '18px Arial';
                    context.fillStyle = '#FFD700';
                    context.fillText('Get close to the enemy and wait for it to attack', CANVAS_WIDTH / 2, 60);
                    context.fillText('When the screen turns red, press E to parry!', CANVAS_WIDTH / 2, 80);
                }
                break;
                
            case 4:
                context.fillText('TUTORIAL: Kill Enemy', CANVAS_WIDTH / 2, 30);
                context.font = '18px Arial';
                context.fillStyle = '#FFD700';
                context.fillText('Now kill the stunned enemy for special loot!', CANVAS_WIDTH / 2, 60);
                context.fillText('Attack it while it\'s stunned to defeat it easily', CANVAS_WIDTH / 2, 80);
                break;
        }
        
        // Skip tutorial button
        context.fillStyle = '#FFD700';
        context.font = 'bold 16px Arial';
        context.textAlign = 'right';
        context.fillText('Press T to Skip Tutorial', CANVAS_WIDTH - 20, 30);
        context.textAlign = 'left';
    }
}
