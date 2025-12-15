import Element from "../enums/Element.js";
import { images, input, CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

export default class AbilityManager {
    constructor(state) {
        this.state = state;
        this.abilityOptions = [
            { name: 'Fire', color: '#FF4444', key: Element.Fire, description: '(Enemies get burn damage for a period of time)' },
            { name: 'Ice', color: '#4444FF', key: Element.Ice, description: '(Slows enemies)' },
            { name: 'Water', color: '#44AAFF', key: Element.Water, description: '(+100% crit chance)' }
        ];
        this.showAbilitySelection = false;
    }

    reset() {
        this.showAbilitySelection = false;
    }

    handleInput() {
        if (this.showAbilitySelection) {
            if (input.isKeyPressed('1')) {
                this.selectAbility(Element.Fire);
            } else if (input.isKeyPressed('2')) {
                this.selectAbility(Element.Ice);
            } else if (input.isKeyPressed('3')) {
                this.selectAbility(Element.Water);
            }
        }
    }

    selectAbility(abilityKey) {
        this.state.selectedAbility = abilityKey;
        this.showAbilitySelection = false;
        
        // Update player attack sprites based on selected ability
        this.updatePlayerAbilitySprites(abilityKey);
        
        // Show completion message
        this.state.showChestMessage = true;
        this.state.chestMessageTimer = 5; // Show longer for ability selection
    }

    updatePlayerAbilitySprites(abilityKey) {
        try {
            //console.log(`🎨 Loading sprites for ability: ${abilityKey}`);
            
            const abilitySprites = {
                attack1_down: images.get(`player_attack1_down_${abilityKey}`),
                attack1_left: images.get(`player_attack1_left_${abilityKey}`),
                attack1_right: images.get(`player_attack1_right_${abilityKey}`),
                attack1_up: images.get(`player_attack1_up_${abilityKey}`)
            };
            
            for (const [key, sprite] of Object.entries(abilitySprites)) {
                if (!sprite) {
                    console.error(`❌ Failed to load ${key} sprite for ${abilityKey} ability`);
                    return;
                }
            }
            
            this.state.player.updateAbilitySprites(abilitySprites);
            //console.log(`🎉 Updated player sprites for ${abilityKey} ability`);
        } catch (error) {
            console.error(`💥 Error updating ability sprites:`, error);
        }
    }

    render(context) {
        if (this.showAbilitySelection) {
            // Background overlay
            context.fillStyle = 'rgba(0, 0, 0, 0.95)';
            context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            
            // Main popup - center screen
            context.fillStyle = 'rgba(30, 30, 60, 0.98)';
            context.strokeStyle = '#FFD700';
            context.lineWidth = 4;
            context.fillRect(CANVAS_WIDTH / 2 - 350, CANVAS_HEIGHT / 2 - 250, 700, 500);
            context.strokeRect(CANVAS_WIDTH / 2 - 350, CANVAS_HEIGHT / 2 - 250, 700, 500);
            
            // Title
            context.fillStyle = '#FFD700';
            context.font = 'bold 42px Arial';
            context.textAlign = 'center';
            context.fillText('Choose Your Element!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 150);
            
            // Ability options
            for (let i = 0; i < this.abilityOptions.length; i++) {
                const ability = this.abilityOptions[i];
                const y = CANVAS_HEIGHT / 2 - 60 + (i * 80);
                
                // Option background with border
                context.fillStyle = ability.color;
                context.fillRect(CANVAS_WIDTH / 2 - 300, y - 30, 600, 60);
                context.strokeStyle = '#FFFFFF';
                context.lineWidth = 2;
                context.strokeRect(CANVAS_WIDTH / 2 - 300, y - 30, 600, 60);
                
                // Option text
                context.fillStyle = '#FFFFFF';
                context.font = 'bold 24px Arial';
                context.fillText(`${i + 1}. ${ability.name.toUpperCase()} ELEMENT`, CANVAS_WIDTH / 2, y - 2);
                
                // Description text
                context.font = 'italic 16px Arial';
                context.fillText(ability.description, CANVAS_WIDTH / 2, y + 20);
            }
            
            // Instructions
            context.fillStyle = '#FFFFFF';
            context.font = 'bold 20px Arial';
            context.fillText('Press 1, 2, or 3 to select your element', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 200);
            context.textAlign = 'left';
        }
    }
}
