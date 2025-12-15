export default class SoundPool {
	/**
	 * Manages an array of sounds so that we can play the same sound
	 * multiple times in our game without having to wait for one sound
	 * to be finished playing before playing the same sound again.
	 *
	 * @param {String} source
	 * @param {Number} size
	 * @see https://blog.sklambert.com/html5-canvas-game-html5-audio-and-finishing-touches/
	 */
	constructor(source, size = 1, volume = 0.5, loop = false) {
		this.source = source;
		this.size = size;
		this.volume = (typeof volume === 'number' && isFinite(volume)) ? Math.max(0, Math.min(1, volume)) : 0.5;
		this.loop = loop;
		this.pool = [];
		this.currentSound = 0;

		this.initializePool();
	}

	initializePool() {
		for (let i = 0; i < this.size; i++) {
			const audio = new Audio(this.source);

			// Ensure volume is valid before setting
			const safeVolume = (typeof this.volume === 'number' && isFinite(this.volume)) 
				? Math.max(0, Math.min(1, this.volume)) 
				: 0.5;
			audio.volume = safeVolume;
			
			audio.loop = this.loop;

			this.pool.push(audio);
		}
	}

	/**
	 * Checks if the currentSound is ready to play, plays the sound,
	 * then increments the currentSound counter.
	 */
	play() {
		const sound = this.pool[this.currentSound];
		
		// If the sound is ready to play (not currently playing)
		if (sound.currentTime === 0 || sound.ended || sound.paused) {
			// Reset playback position if it ended
			if (sound.ended) {
				sound.currentTime = 0;
			}
			
			const playPromise = sound.play();
			
			// Handle browser autoplay policies and errors
			if (playPromise !== undefined) {
				playPromise.catch(error => {
					console.warn(`SoundPool play error for ${this.source}:`, error);
				});
			}
		} else {
			// If we're here, it means we're trying to play a sound slot that is currently busy.
			// This implies the pool size might be too small for the frequency of this sound.
			if (this.source.includes('wizardattack')) {
				console.warn(`SoundPool slot ${this.currentSound} for ${this.source} is busy (paused: ${sound.paused}, ended: ${sound.ended}, time: ${sound.currentTime})`);
			}
		}

		this.currentSound = (this.currentSound + 1) % this.size;
	}

	pause() {
		this.pool[this.currentSound].pause();
	}

	isPaused() {
		return this.pool[this.currentSound].paused;
	}

	stop() {
		this.pause();
		this.pool[this.currentSound].currentTime = 0;
	}

	setVolume(volume) {
		// Validate the volume value
		const safeVolume = (typeof volume === 'number' && isFinite(volume)) 
			? Math.max(0, Math.min(1, volume)) 
			: 0.5;
		
		this.volume = safeVolume;
		
		// Update volume for all audio elements in the pool
		for (let i = 0; i < this.pool.length; i++) {
			this.pool[i].volume = safeVolume;
		}
	}
}
