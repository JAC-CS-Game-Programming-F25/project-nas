/**
 * Game Name
 *
 * Authors
 *
 * Brief description
 *
 * Asset sources
 */

import GameStateName from './enums/GameStateName.js';
import Game from '../lib/Game.js';
import {
	canvas,
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	context,
	fonts,
	images,
	timer,
	sounds,
	stateMachine,
} from './globals.js';
import PlayState from './states/PlayState.js';
import GameOverState from './states/GameOverState.js';
import VictoryState from './states/VictoryState.js';
import MainMenuState from './states/MainMenuState.js';

// Set the dimensions of the play area.
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
canvas.setAttribute('tabindex', '1'); // Allows the canvas to receive user input.

// Now that the canvas element has been prepared, we can add it to the DOM.
document.body.appendChild(canvas);

// Fetch the asset definitions from config.json.
const {
	images: imageDefinitions,
	fonts: fontDefinitions,
	sounds: soundDefinitions,
} = await fetch('./src/config.json').then((response) => response.json());

// Load all the assets from their definitions.
images.load(imageDefinitions);
fonts.load(fontDefinitions);
sounds.load(soundDefinitions);

//console.log("Assets loaded, image definitions:", imageDefinitions);

// Wait a bit for images to load before starting the game
await new Promise(resolve => setTimeout(resolve, 100));

// Add all the states to the state machine.
stateMachine.add(GameStateName.GameOver, new GameOverState());
stateMachine.add(GameStateName.Victory, new VictoryState());
stateMachine.add(GameStateName.Play, new PlayState());
stateMachine.add('mainMenu', new MainMenuState());

// Start with main menu
stateMachine.change('mainMenu');

const game = new Game(
	stateMachine,
	context,
	timer,
	canvas.width,
	canvas.height
);

game.start();

// Focus the canvas so that the player doesn't have to click on it.
canvas.focus();
