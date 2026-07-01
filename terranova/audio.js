class SoundController {
  constructor() {
    this.audioCtx = null;
    this.initialized = false;
    this.muted = true;
    
    // Node references
    this.masterGain = null;
    this.windGain = null;
    this.waveGain = null;
    this.forestGain = null;
    
    // Active sources
    this.windSource = null;
    this.waveSource = null;
    this.forestSource = null;
    
    // Filter modulation timers
    this.intervals = [];
  }

  // Initialize Audio Context on user click
  init() {
    if (this.initialized) return;
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.4;
      this.masterGain.connect(this.audioCtx.destination);
      
      // Setup sound categories
      this.setupWindSynth();
      this.setupWaveSynth();
      this.setupForestSynth();
      this.startAmbientMusic();
      
      this.initialized = true;
      console.log('Audio Context initialized successfully.');
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  setMute(mute) {
    this.muted = mute;
    if (!this.initialized) {
      this.init();
    }
    
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    if (this.masterGain) {
      const targetVal = mute ? 0 : 0.4;
      this.masterGain.gain.setTargetAtTime(targetVal, this.audioCtx.currentTime, 0.2);
    }
  }

  // Create a White Noise buffer
  createNoiseBuffer() {
    const bufferSize = 2 * this.audioCtx.sampleRate;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // Wind synthesizer (lowpass filtered white noise with modulated frequency)
  setupWindSynth() {
    const noiseBuffer = this.createNoiseBuffer();
    this.windSource = this.audioCtx.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.0;
    
    this.windGain = this.audioCtx.createGain();
    this.windGain.gain.value = 0;

    this.windSource.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    this.windSource.start(0);

    // Modulate wind cutoff frequency and gain to simulate gusts
    const modulateWind = () => {
      if (this.muted || !this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const speed = 2 + Math.random() * 4; // gust duration in seconds
      const cutoff = 250 + Math.random() * 450; // frequency range
      const volume = 0.1 + Math.random() * 0.4;

      filter.frequency.exponentialRampToValueAtTime(cutoff, now + speed);
      this.windGain.gain.linearRampToValueAtTime(volume, now + speed);
    };

    modulateWind();
    const interval = setInterval(modulateWind, 4000);
    this.intervals.push(interval);
  }

  // Wave synthesizer (lower-pitched bandpass filtered noise with LFO volume modulation)
  setupWaveSynth() {
    const noiseBuffer = this.createNoiseBuffer();
    this.waveSource = this.audioCtx.createBufferSource();
    this.waveSource.buffer = noiseBuffer;
    this.waveSource.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 200;
    filter.Q.value = 1.0;

    this.waveGain = this.audioCtx.createGain();
    this.waveGain.gain.value = 0;

    this.waveSource.connect(filter);
    filter.connect(this.waveGain);
    this.waveGain.connect(this.masterGain);
    this.waveSource.start(0);

    // Oscillating LFO for waves crashing (cycle of ~6 seconds)
    const modulateWaves = () => {
      if (this.muted || !this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      // Fade in (crash)
      this.waveGain.gain.linearRampToValueAtTime(0.6, now + 2.5);
      filter.frequency.exponentialRampToValueAtTime(320, now + 2.5);
      
      // Fade out (recede)
      this.waveGain.gain.linearRampToValueAtTime(0.08, now + 6.0);
      filter.frequency.exponentialRampToValueAtTime(140, now + 6.0);
    };

    modulateWaves();
    const interval = setInterval(modulateWaves, 6000);
    this.intervals.push(interval);
  }

  // Forest environment (cricket hums and random bird chirps)
  setupForestSynth() {
    this.forestGain = this.audioCtx.createGain();
    this.forestGain.gain.value = 0;
    this.forestGain.connect(this.masterGain);

    // 1. Synthesize bird chirping occasionally
    const triggerBirdChirp = () => {
      if (this.muted || this.forestGain.gain.value < 0.05 || !this.audioCtx) {
        // Only chirp if player is in forest zone
        setTimeout(triggerBirdChirp, 4000 + Math.random() * 8000);
        return;
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);

      // Pitch sweep chirping effect
      osc.frequency.exponentialRampToValueAtTime(1600 + Math.random() * 600, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.3);
      
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.forestGain);
      
      osc.start(now);
      osc.stop(now + 0.4);

      setTimeout(triggerBirdChirp, 3000 + Math.random() * 7000);
    };

    // Start bird chirps loop
    setTimeout(triggerBirdChirp, 5000);
  }

  // Background music - gentle ambient pentatonic synthesizer
  startAmbientMusic() {
    const playNote = (freq, time, duration) => {
      if (this.muted || !this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      // Soft triangle + sine wave combination
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 1.5, time); // Fifth overtone

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);

      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.05, time + 0.5); // Slow attack
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration); // Slow decay

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration + 0.1);
      
      osc2.start(time);
      osc2.stop(time + duration + 0.1);
    };

    // Beautiful minor pentatonic scale notes (G3, Bb3, C4, D4, F4, G4, Bb4, C5)
    const scale = [196.00, 233.08, 261.63, 293.66, 349.23, 392.00, 466.16, 523.25];

    const playMelodyPhrase = () => {
      if (this.muted || !this.audioCtx) {
        setTimeout(playMelodyPhrase, 10000);
        return;
      }

      const now = this.audioCtx.currentTime;
      // Generate a small phrase of 3-5 notes
      const noteCount = 3 + Math.floor(Math.random() * 3);
      let timeOffset = 0;

      for (let i = 0; i < noteCount; i++) {
        const noteIndex = Math.floor(Math.random() * scale.length);
        const freq = scale[noteIndex];
        const duration = 3.0 + Math.random() * 2.0;
        
        playNote(freq, now + timeOffset, duration);
        timeOffset += 1.5 + Math.random() * 2.0; // overlap notes
      }

      // Schedule next phrase in 20-30 seconds
      setTimeout(playMelodyPhrase, 22000 + Math.random() * 15000);
    };

    // Start music loop
    setTimeout(playMelodyPhrase, 8000);
  }

  // Crossfade volumes dynamically based on the current biome
  updateBiomeSounds(biomeId) {
    if (!this.initialized || !this.audioCtx) return;
    
    let windVal = 0.05;
    let waveVal = 0.0;
    let forestVal = 0.0;

    switch (biomeId) {
      case 'deep_ocean':
        waveVal = 0.9;
        windVal = 0.3;
        break;
      case 'shallow_ocean':
        waveVal = 0.7;
        windVal = 0.15;
        break;
      case 'beach':
        waveVal = 0.6;
        windVal = 0.1;
        break;
      case 'river':
      case 'lake':
        waveVal = 0.3;
        forestVal = 0.2;
        break;
      case 'snowy_peak':
      case 'rocky_mountain':
        windVal = 0.8; // Mountain howling
        break;
      case 'desert':
      case 'plateau':
        windVal = 0.5; // Desert winds
        break;
      case 'dense_forest':
        forestVal = 0.8;
        windVal = 0.1;
        break;
      case 'forest':
      case 'tundra_forest':
        forestVal = 0.6;
        windVal = 0.15;
        break;
      case 'tundra_plain':
      case 'rolling_hills':
        windVal = 0.25;
        break;
      case 'plains':
      case 'savannah':
        windVal = 0.15;
        forestVal = 0.1;
        break;
    }

    // Apply target gains with smooth ramps
    const now = this.audioCtx.currentTime;
    if (this.windGain) this.windGain.gain.setTargetAtTime(windVal, now, 1.5);
    if (this.waveGain) this.waveGain.gain.setTargetAtTime(waveVal, now, 1.5);
    if (this.forestGain) this.forestGain.gain.setTargetAtTime(forestVal, now, 1.5);
  }

  // Cleanup on destroy
  destroy() {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
