export default class CombatSystem {
    constructor(state) {
        this.state = state;
        this.parryFeedback = {
            active: false,
            timer: 0,
            duration: 2.0,
            text: 'PARRY SUCCESSFUL!'
        };
    }

    update(dt) {
        if (this.parryFeedback.active) {
            this.parryFeedback.timer += dt;
            if (this.parryFeedback.timer >= this.parryFeedback.duration) {
                this.parryFeedback.active = false;
                this.parryFeedback.timer = 0;
            }
        }
    }

    performAttack() {
        if (!this.state.player) return;

        const attackRange = 64;
        const playerX = this.state.player.position.x;
        const playerY = this.state.player.position.y;
        
        const isParryAttack = this.state.player.isParrying && this.state.player.isInParryWindow();
        
        for (const enemy of this.state.enemies) {
            if (enemy.isDead) continue;
            
            const distance = Math.sqrt(
                (enemy.position.x - playerX) ** 2 + 
                (enemy.position.y - playerY) ** 2
            );
            
            if (distance <= attackRange) {
                let damage = this.state.playerStats.damage;
                let isCrit = false;
                
                if (enemy.isStunned) {
                    damage *= 2;
                    isCrit = true;
                    //console.log(`💥 CRITICAL HIT! Enemy is stunned - 2x damage!`);
                }
                
                if (isParryAttack) {
                    damage *= 1.5;
                    //console.log(`🎯 Parry attack! Extra damage!`);
                    
                    this.parryFeedback.active = true;
                    this.parryFeedback.timer = 0; // Reset timer
                }
                
                this.state.playSFX('swordattackhit', 0.6);
                
                const enemyDied = enemy.takeDamage(damage, this.state.selectedAbility, isParryAttack);
                if (enemyDied) {
                    this.state.gainXP(enemy.xpDrop);
                    this.state.enemiesKilled++;
                }
                
                const elementText = this.state.selectedAbility ? ` (${this.state.selectedAbility.toUpperCase()})` : '';
                const parryText = isParryAttack ? ' [PARRY]' : '';
                const critText = isCrit ? ' [CRIT]' : '';
                //console.log(`Hit enemy! Damage: ${damage} Distance: ${distance.toFixed(1)}${elementText}${parryText}${critText}`);
            }
        }
    }

    showParrySuccess() {
        this.parryFeedback.active = true;
        this.parryFeedback.timer = 0;
        this.state.playSFX('parry', 0.8);
        //console.log('Showing parry success feedback!');
    }

    render(context, CANVAS_WIDTH) {
        if (this.parryFeedback.active) {
            const fadeProgress = this.parryFeedback.timer / this.parryFeedback.duration;
            const alpha = Math.max(0, 1 - fadeProgress);
            
            context.fillStyle = `rgba(157, 78, 221, ${alpha})`;
            context.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            context.font = 'bold 32px Arial';
            context.lineWidth = 2;
            context.textAlign = 'center';
            
            const textX = CANVAS_WIDTH / 2;
            const textY = 100;
            
            context.strokeText(this.parryFeedback.text, textX, textY);
            context.fillText(this.parryFeedback.text, textX, textY);
            
            context.textAlign = 'left';
        }
    }
}
