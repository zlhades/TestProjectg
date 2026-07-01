// js/audio.js
// Synthesized sound effects using the Web Audio API to avoid external asset dependencies

class SoundFXManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.lobbyMusicNode = null;
        this.lobbyMusicGain = null;
        this.isMusicPlaying = false;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMute(mute) {
        this.muted = mute;
        if (this.ctx) {
            if (mute) {
                if (this.lobbyMusicGain) this.lobbyMusicGain.gain.setValueAtTime(0, this.ctx.currentTime);
            } else {
                if (this.lobbyMusicGain) this.lobbyMusicGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            }
        }
    }

    // Programmatic footstep sound (low thud)
    playFootstep() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Programmatic gunshots based on weapon type
    playShoot(weaponType) {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5s duration max
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate white noise for explosion/crack
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Create bandpass filter for weapon texture
        const filter = this.ctx.createBiquadFilter();
        const noiseGain = this.ctx.createGain();
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        // Sub-oscillator for bass punch
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);

        if (weaponType === 'Sniper') {
            // Sniper: Heavy explosion, deep bass, long decay
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(400, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
            filter.Q.value = 3.0;

            noiseGain.gain.setValueAtTime(0.8, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

            subOsc.type = 'sawtooth';
            subOsc.frequency.setValueAtTime(120, now);
            subOsc.frequency.linearRampToValueAtTime(40, now + 0.25);
            subGain.gain.setValueAtTime(0.5, now);
            subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

            subOsc.start(now);
            subOsc.stop(now + 0.25);
            noise.start(now);
            noise.stop(now + 0.45);

        } else if (weaponType === 'Shotgun') {
            // Shotgun: Huge dispersion, multi-layered noise explosion
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(300, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.3);
            filter.Q.value = 1.5;

            noiseGain.gain.setValueAtTime(0.9, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

            subOsc.type = 'triangle';
            subOsc.frequency.setValueAtTime(90, now);
            subOsc.frequency.linearRampToValueAtTime(30, now + 0.2);
            subGain.gain.setValueAtTime(0.6, now);
            subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            subOsc.start(now);
            subOsc.stop(now + 0.2);
            noise.start(now);
            noise.stop(now + 0.35);

        } else if (weaponType === 'Pistol') {
            // Pistol: Light crack, short duration
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
            filter.Q.value = 4.0;

            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            subOsc.type = 'triangle';
            subOsc.frequency.setValueAtTime(150, now);
            subOsc.frequency.linearRampToValueAtTime(70, now + 0.08);
            subGain.gain.setValueAtTime(0.2, now);
            subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            subOsc.start(now);
            subOsc.stop(now + 0.08);
            noise.start(now);
            noise.stop(now + 0.15);

        } else {
            // Assault Rifle (Default): Punchy, quick decay
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(150, now + 0.18);
            filter.Q.value = 3.0;

            noiseGain.gain.setValueAtTime(0.6, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            subOsc.type = 'sawtooth';
            subOsc.frequency.setValueAtTime(130, now);
            subOsc.frequency.linearRampToValueAtTime(50, now + 0.12);
            subGain.gain.setValueAtTime(0.3, now);
            subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            subOsc.start(now);
            subOsc.stop(now + 0.12);
            noise.start(now);
            noise.stop(now + 0.2);
        }
    }

    // Weapon reload sound (mechanical clicks)
    playReload() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const triggerClick = (time, pitch) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(pitch, time);
            osc.frequency.exponentialRampToValueAtTime(100, time + 0.08);
            gain.gain.setValueAtTime(0.15, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
            osc.start(time);
            osc.stop(time + 0.08);
        };

        // Click 1: Magazine release
        triggerClick(now, 600);
        // Click 2: Magazine insert (0.3s later)
        triggerClick(now + 0.3, 400);
        // Click 3: Bolt rack (0.6s later)
        triggerClick(now + 0.6, 800);
        triggerClick(now + 0.68, 500);
    }

    // Katana slice sound
    playMeleeSwing() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.18);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

        osc.start(now);
        osc.stop(now + 0.18);
    }

    // Hitmarker ping sound (satisfying metal chime)
    playHitmarker() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Roblox "Oof" damage grunt recreation
    playOof() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        // Oof is a fast upward pitch sweep
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    // Crate ticket sound (case spinning)
    playCrateTick() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(100, now + 0.02);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.start(now);
        osc.stop(now + 0.03);
    }

    // Crate unlock sound (magical retro jingle)
    playCrateUnlock() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0.15, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.3);
        });
    }

    // Round Won jingle (upbeat retro trumpets)
    playVictory() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const melody = [
            { f: 523.25, d: 0.15 }, // C5
            { f: 587.33, d: 0.15 }, // D5
            { f: 659.25, d: 0.15 }, // E5
            { f: 783.99, d: 0.3 },  // G5
            { f: 659.25, d: 0.15 }, // E5
            { f: 783.99, d: 0.5 }   // G5
        ];

        let elapsed = 0;
        melody.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(note.f, now + elapsed);

            gain.gain.setValueAtTime(0.12, now + elapsed);
            gain.gain.exponentialRampToValueAtTime(0.001, now + elapsed + note.d);

            osc.start(now + elapsed);
            osc.stop(now + elapsed + note.d);

            elapsed += note.d * 0.8;
        });
    }

    // Round Lost jingle (descending sad trombone vibe)
    playDefeat() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const melody = [
            { f: 392.00, d: 0.25 }, // G4
            { f: 369.99, d: 0.25 }, // F#4
            { f: 349.23, d: 0.25 }, // F4
            { f: 311.13, d: 0.6 }   // Eb4 (downward slide)
        ];

        let elapsed = 0;
        melody.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, now + elapsed);
            if (note.f === 311.13) {
                osc.frequency.exponentialRampToValueAtTime(220, now + elapsed + note.d);
            }

            gain.gain.setValueAtTime(0.15, now + elapsed);
            gain.gain.exponentialRampToValueAtTime(0.001, now + elapsed + note.d);

            osc.start(now + elapsed);
            osc.stop(now + elapsed + note.d);

            elapsed += note.d * 0.9;
        });
    }

    // Start ambient synth loop for Lobby
    startLobbyMusic() {
        this.init();
        if (!this.ctx || this.isMusicPlaying) return;
        this.isMusicPlaying = true;
        this.resume();

        const now = this.ctx.currentTime;
        
        // Music Gain Node to control volume
        this.lobbyMusicGain = this.ctx.createGain();
        this.lobbyMusicGain.gain.setValueAtTime(this.muted ? 0 : 0.04, now);
        this.lobbyMusicGain.connect(this.ctx.destination);

        // We use a custom synthesis function that plays chords and beats periodically
        let step = 0;
        const tempo = 0.4; // seconds per eighth note

        const chords = [
            [130.81, 164.81, 196.00, 246.94], // Cmaj7
            [146.83, 174.61, 220.00, 261.63], // Dm7
            [164.81, 196.00, 246.94, 293.66], // Em7
            [174.61, 220.00, 261.63, 329.63]  // Fmaj7
        ];

        const playMusicStep = () => {
            if (!this.isMusicPlaying || this.muted) return;
            const stepTime = this.ctx.currentTime;

            // Chord change every 8 steps
            const chordIdx = Math.floor(step / 8) % chords.length;
            const chord = chords[chordIdx];

            // Bass note on step 0 and 4
            if (step % 4 === 0) {
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                bassOsc.connect(bassGain);
                bassGain.connect(this.lobbyMusicGain);
                
                bassOsc.type = 'triangle';
                bassOsc.frequency.setValueAtTime(chord[0] / 2, stepTime); // Octave down
                
                bassGain.gain.setValueAtTime(0.2, stepTime);
                bassGain.gain.exponentialRampToValueAtTime(0.001, stepTime + tempo * 2);
                
                bassOsc.start(stepTime);
                bassOsc.stop(stepTime + tempo * 2);
            }

            // High arp notes on step 0, 2, 4, 6
            if (step % 2 === 0) {
                const noteIdx = (step / 2) % chord.length;
                const arpOsc = this.ctx.createOscillator();
                const arpGain = this.ctx.createGain();
                arpOsc.connect(arpGain);
                arpGain.connect(this.lobbyMusicGain);

                arpOsc.type = 'sine';
                arpOsc.frequency.setValueAtTime(chord[noteIdx] * 2, stepTime); // Octave up

                arpGain.gain.setValueAtTime(0.1, stepTime);
                arpGain.gain.exponentialRampToValueAtTime(0.001, stepTime + tempo * 1.5);

                arpOsc.start(stepTime);
                arpOsc.stop(stepTime + tempo * 1.5);
            }

            // Soft drum tick on odd steps
            if (step % 2 !== 0) {
                const drumOsc = this.ctx.createOscillator();
                const drumGain = this.ctx.createGain();
                drumOsc.connect(drumGain);
                drumGain.connect(this.lobbyMusicGain);

                drumOsc.type = 'triangle';
                drumOsc.frequency.setValueAtTime(50, stepTime);
                drumGain.gain.setValueAtTime(0.05, stepTime);
                drumGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.05);

                drumOsc.start(stepTime);
                drumOsc.stop(stepTime + 0.05);
            }

            step = (step + 1) % 32;
        };

        // Schedule step every 400ms
        this.musicInterval = setInterval(playMusicStep, tempo * 1000);
    }

    stopLobbyMusic() {
        this.isMusicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
        if (this.lobbyMusicGain) {
            try {
                this.lobbyMusicGain.disconnect();
            } catch(e) {}
            this.lobbyMusicGain = null;
        }
    }
}

// Global single instance
window.soundFX = new SoundFXManager();
