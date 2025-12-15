import Enemy from "../entities/Enemy.js";
import Knight from "../entities/Knight.js";
import EvilWizard from "../entities/EvilWizard.js";

export default class EnemyFactory {
	/**
	 * Creates an enemy instance based on the provided type and configuration.
	 * 
	 * @param {string} type - The type of enemy to create (e.g., 'knight', 'wizard', 'slime')
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {object} levelMaker - Reference to LevelMaker for collision
	 * @param {object} config - Additional configuration (optional)
	 * @returns {Enemy} The created enemy instance
	 */
	static createEnemy(type, x, y, levelMaker, config = {}) {
		let enemy;

		switch (type.toLowerCase()) {
			case 'knight':
				enemy = new Knight(x, y, levelMaker);
				break;
			case 'wizard':
			case 'evilwizard':
				enemy = new EvilWizard(x, y, levelMaker);
				break;
			default:
				// Default to basic Enemy class, passing the type string
				enemy = new Enemy(x, y, type, levelMaker);
				
			
				if (config.ignoreCollisions) {
					enemy.ignoreCollisions = true;
				}
				break;
		}

		return enemy;
	}
}
