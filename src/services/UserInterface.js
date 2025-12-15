import { context, CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

export default class UserInterface {
    constructor(playState) {
        this.playState = playState;
    }

    render() {
        // Level indicator (bottom left)
        context.fillStyle = '#FFD700';
        context.font = 'bold 20px Arial';
        context.textAlign = 'left';
        context.fillText(`Level ${this.playState.playerStats.level}`, 15, CANVAS_HEIGHT - 120);
        
        // Enemy counter (bottom left, below level)
        context.fillStyle = '#FFFFFF';
        context.font = '18px Arial';
        context.fillText(`Enemies: ${this.playState.enemies.length}`, 15, CANVAS_HEIGHT - 95);
        
        // Game stats (top right)
        context.fillStyle = '#CCCCCC';
        context.font = '16px Arial';
        context.textAlign = 'right';
        
        const minutes = Math.floor(this.playState.timeSurvived / 60);
        const seconds = Math.floor(this.playState.timeSurvived % 60);
        context.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, CANVAS_WIDTH - 15, 25);
        context.fillText(`Killed: ${this.playState.enemiesKilled}`, CANVAS_WIDTH - 15, 45);
        context.fillText(`Mode: ${this.playState.gameSettings.gameMode.toUpperCase()}`, CANVAS_WIDTH - 15, 65);
        
        context.textAlign = 'left';
        
        // Health bar with hearts (10 hearts total, each heart = 10 HP)
        this.renderHeartHealthBar();
        
        // XP bar (below hearts)
        this.renderXPBar();
        
        // Parry icon (next to hearts)
        this.renderParryIcon();
        
        // Display selected ability in top left
        if (this.playState.selectedAbility) {
            const abilityInfo = this.playState.abilityManager.abilityOptions.find(a => a.key === this.playState.selectedAbility);
            if (abilityInfo) {
                // Ability background in top left
                context.fillStyle = abilityInfo.color;
                context.fillRect(10, 10, 220, 30);
                context.strokeStyle = '#FFFFFF';
                context.lineWidth = 2;
                context.strokeRect(10, 10, 220, 30);
                
                // Ability text
                context.fillStyle = '#FFFFFF';
                context.font = 'bold 18px Arial';
                context.fillText(`Element: ${abilityInfo.name.toUpperCase()}`, 15, 30);
            }
        }
        
        // Controls help
        context.fillStyle = '#CCCCCC';
        context.font = '14px Arial';
        context.textAlign = 'right';
        context.fillText('Mouse Wheel to Zoom', CANVAS_WIDTH - 10, CANVAS_HEIGHT - 20);
        context.textAlign = 'left';
    }

    renderHeartHealthBar() {
        const heartSize = 20;
        const startX = 15;
        const startY = CANVAS_HEIGHT - 70;
        const spacing = 25;
        
        // Each heart represents 10 HP, so calculate hearts based on current health
        const maxHearts = 10;
        const healthPerHeart = 10;
        const fullHearts = Math.floor(this.playState.player.health / healthPerHeart);
        const partialHeart = (this.playState.player.health % healthPerHeart) / healthPerHeart;
        
        for (let i = 0; i < maxHearts; i++) {
            const x = startX + (i * spacing);
            const y = startY;
            
            if (i < fullHearts) {
                // Full heart
                this.drawHeart(x, y, heartSize, '#FF0000');
            } else if (i === fullHearts && partialHeart > 0) {
                // Partial heart (half heart if >= 0.5, empty if < 0.5)
                if (partialHeart >= 0.5) {
                    this.drawHeart(x, y, heartSize, '#FF0000', true); // Half heart
                } else {
                    this.drawHeart(x, y, heartSize, '#444444'); // Empty heart
                }
            } else {
                // Empty heart
                this.drawHeart(x, y, heartSize, '#444444');
            }
        }
    }

    drawHeart(x, y, size, color, isHalf = false) {
        context.save();
        context.fillStyle = color;
        context.strokeStyle = '#000000';
        context.lineWidth = 1;
        
        // Simple heart shape using circles and triangle
        const heartWidth = size;
        const heartHeight = size * 0.8;
        
        context.beginPath();
        // Left circle
        context.arc(x + heartWidth * 0.25, y + heartHeight * 0.3, heartWidth * 0.25, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        
        if (!isHalf) {
            // Right circle (full heart)
            context.beginPath();
            context.arc(x + heartWidth * 0.75, y + heartHeight * 0.3, heartWidth * 0.25, 0, Math.PI * 2);
            context.fill();
            context.stroke();
        }
        
        // Bottom triangle
        context.beginPath();
        context.moveTo(x, y + heartHeight * 0.5);
        if (isHalf) {
            context.lineTo(x + heartWidth * 0.5, y + heartHeight);
        } else {
            context.lineTo(x + heartWidth, y + heartHeight * 0.5);
            context.lineTo(x + heartWidth * 0.5, y + heartHeight);
        }
        context.closePath();
        context.fill();
        context.stroke();
        
        context.restore();
    }

    renderXPBar() {
        const barWidth = 250;
        const barHeight = 15;
        const startX = 15;
        const startY = CANVAS_HEIGHT - 45;
        
        // XP progress
        const xpPercent = this.playState.playerStats.xp / this.playState.playerStats.xpToNext;
        
        // Background
        context.fillStyle = '#333333';
        context.fillRect(startX, startY, barWidth, barHeight);
        
        // Border
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 2;
        context.strokeRect(startX, startY, barWidth, barHeight);
        
        // XP fill
        context.fillStyle = '#00FF00';
        context.fillRect(startX + 2, startY + 2, (barWidth - 4) * xpPercent, barHeight - 4);
        
        // XP text
        context.fillStyle = '#FFFFFF';
        context.font = '12px Arial';
        context.textAlign = 'center';
        context.fillText(`${this.playState.playerStats.xp} / ${this.playState.playerStats.xpToNext} XP`, startX + barWidth / 2, startY + barHeight - 3);
        context.textAlign = 'left';
    }

    renderParryIcon() {
        const x = 280;
        const y = CANVAS_HEIGHT - 60;
        const size = 30;
        
        // Check if parry is on cooldown
        const onCooldown = this.playState.player.parryCooldownTimer > 0;
        
        context.save();
        
        // Background
        context.fillStyle = onCooldown ? '#555555' : '#9D4EDD';
        context.fillRect(x, y, size, size);
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 2;
        context.strokeRect(x, y, size, size);
        
        // Icon (Shield)
        context.fillStyle = '#FFFFFF';
        context.beginPath();
        context.moveTo(x + size * 0.2, y + size * 0.2);
        context.lineTo(x + size * 0.8, y + size * 0.2);
        context.lineTo(x + size * 0.8, y + size * 0.6);
        context.lineTo(x + size * 0.5, y + size * 0.9);
        context.lineTo(x + size * 0.2, y + size * 0.6);
        context.closePath();
        context.fill();
        
        // Cooldown overlay
        if (onCooldown) {
            const cooldownPercent = this.playState.player.parryCooldownTimer / this.playState.player.parryCooldown;
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(x, y + size * (1 - cooldownPercent), size, size * cooldownPercent);
        }
        
        // Key hint
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 12px Arial';
        context.textAlign = 'center';
        context.fillText('E', x + size / 2, y + size + 12);
        
        context.restore();
    }
}
