import SoundPool from "./SoundPool.js";

export default class Sounds {
	constructor() {
		this.sounds = {};
	}

	load(soundDefinitions) {
		soundDefinitions.forEach((soundDefinition) => {
			this.sounds[soundDefinition.name] = new SoundPool(
				soundDefinition.path,
				soundDefinition.size,
				soundDefinition.volume,
				soundDefinition.loop,
			);
		});
	}

	get(name) {
		return this.sounds[name];
	}

	play(name) {
		this.get(name).play();
	}

	pause(name) {
		this.get(name).pause();
	}

	stop(name) {
		this.get(name).stop()
	}
	setVolume(name, volume) {
		this.get(name).setVolume(volume);
	}

	setAllVolumes(volume) {
		Object.keys(this.sounds).forEach(soundName => {
			this.sounds[soundName].setVolume(volume);
		});
	}

	stopAll() {
		Object.keys(this.sounds).forEach(soundName => {
			this.sounds[soundName].stop();
		});
	}
}
