"use strict";

// --- Audio API (Efek Suara Naga Realistis) ---
let audioCtx;
let noiseBuffer; // Buffer khusus untuk suara desis/api/angin/gemeretak
let isBgmPlaying = false;
let bgmTimeout;
let droneOsc;
let droneGain;
let lfo;
let bgmStepDuration = 600;
let bgmFilterIntensity = 150;
let bgmPitchMultiplier = 1;
let beatStep = 0;

const startBGM = () => {
  if (!audioCtx || isBgmPlaying) return;
  isBgmPlaying = true;
  const now = audioCtx.currentTime;
  bgmStepDuration = 600; // Tempo lebih lambat di awal (sangat misterius)
  bgmFilterIntensity = 150;
  bgmPitchMultiplier = 1;
  beatStep = 0;

  // 1. Abyss Drone (Aura Gua/Luar Angkasa yang Kelam)
  droneOsc = audioCtx.createOscillator();
  droneOsc.type = "sawtooth";
  droneOsc.frequency.setValueAtTime(36.71, now); // Nada D1 (sangat rendah)

  droneGain = audioCtx.createGain();
  droneGain.gain.setValueAtTime(0, now);
  droneGain.gain.linearRampToValueAtTime(0.15, now + 4); // Fade-in sangat perlahan

  const droneFilter = audioCtx.createBiquadFilter();
  droneFilter.type = "lowpass";
  droneFilter.frequency.setValueAtTime(150, now);

  // LFO untuk membuat suara dronenya berayun/bernapas pelan
  lfo = audioCtx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(0.1, now); // Napas lambat (0.1 Hz)
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(100, now);
  lfo.connect(lfoGain).connect(droneFilter.frequency);

  droneOsc
    .connect(droneFilter)
    .connect(droneGain)
    .connect(audioCtx.destination);
  droneOsc.start();
  lfo.start();

  // Skala D Eksotis / Dark Fantasy: D4, Eb4, F#4, G4, Bb4
  const notes = [293.66, 311.13, 369.99, 392.0, 466.16];

  const playAtmo = () => {
    if (!isBgmPlaying) return;
    const t = audioCtx.currentTime;

    // --- Heartbeat Drum (Genderang Jantung Gelap) ---
    if (beatStep % 2 === 0) {
      const kick = audioCtx.createOscillator();
      kick.type = "sine";
      kick.frequency.setValueAtTime(60, t);
      kick.frequency.exponentialRampToValueAtTime(10, t + 0.6);
      const kickGain = audioCtx.createGain();
      kickGain.gain.setValueAtTime(0.8, t);
      kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      kick.connect(kickGain).connect(audioCtx.destination);
      kick.start(t);
      kick.stop(t + 0.6);
    }

    // --- Lonceng Kristal Kuno (Eerie Bells) ---
    // Kadang berbunyi, kadang tidak, memberikan kesan sepi dan luas
    if (beatStep % 3 === 0 || Math.random() < 0.3) {
      const noteFreq =
        notes[Math.floor(Math.random() * notes.length)] * bgmPitchMultiplier;
      const bell = audioCtx.createOscillator();
      bell.type = "sine";
      bell.frequency.setValueAtTime(noteFreq, t);

      const bellGain = audioCtx.createGain();
      bellGain.gain.setValueAtTime(0, t);
      bellGain.gain.linearRampToValueAtTime(0.1, t + 0.05); // Attack lembut
      bellGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5); // Gema sangat panjang

      bell.connect(bellGain).connect(audioCtx.destination);
      bell.start(t);
      bell.stop(t + 2.5);
    }

    // --- Hembusan Angin Gelap (Wind Sweep) ---
    if (beatStep % 8 === 0 && noiseBuffer) {
      const wind = audioCtx.createBufferSource();
      wind.buffer = noiseBuffer;
      const windFilter = audioCtx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.setValueAtTime(300, t);
      windFilter.frequency.exponentialRampToValueAtTime(
        bgmFilterIntensity + 300,
        t + 1,
      );

      const windGain = audioCtx.createGain();
      windGain.gain.setValueAtTime(0, t);
      windGain.gain.linearRampToValueAtTime(0.08, t + 0.5);
      windGain.gain.linearRampToValueAtTime(0.001, t + 2);

      wind.connect(windFilter).connect(windGain).connect(audioCtx.destination);
      wind.start(t);
      wind.stop(t + 2);
    }

    beatStep++;
    bgmTimeout = setTimeout(playAtmo, bgmStepDuration);
  };
  playAtmo();
};

const updateBGM = (currentScore) => {
  if (!isBgmPlaying || !audioCtx) return;

  const maxScoreForMusic = 60; // Disesuaikan: musik mencapai puncak di skor 60
  const progress = Math.min(currentScore / maxScoreForMusic, 1);

  // 1. Tempo Semakin Cepat dan Mencekam (600ms -> 200ms per ketukan)
  bgmStepDuration = 600 - 400 * progress;

  // 2. Angin / Desisan Semakin Terang dan Kasar
  bgmFilterIntensity = 150 + 1500 * progress;

  // 3. Napas Drone (LFO) semakin panik
  if (lfo)
    lfo.frequency.setTargetAtTime(
      0.1 + 2.9 * progress,
      audioCtx.currentTime,
      0.5,
    );

  // 4. Modulasi Kunci/Nada (Key Change) — naik di skor 30 (masuk Fase Merah)
  if (currentScore >= 30) {
    bgmPitchMultiplier = 1.189; // Naik sekitar 3 semitone (Minor 3rd) untuk nuansa klimaks gelap
  } else {
    bgmPitchMultiplier = 1;
  }
};

// =====================================================================
// Suara Evolusi Naga — Setiap Fase Punya Karakter Berbeda
// =====================================================================
const playEvolutionSound = (phase) => {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.5, t);
  masterGain.connect(audioCtx.destination);

  if (phase === 2) {
    // ⚡ FASE BIRU — Electric Surge: buzz naik + ping kristal
    const notes = [220, 277.18, 369.99, 493.88]; // Am chord naik
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g   = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq * 0.5, t + i * 0.07);
      osc.frequency.linearRampToValueAtTime(freq * 2, t + i * 0.07 + 0.3);
      g.gain.setValueAtTime(0, t + i * 0.07);
      g.gain.linearRampToValueAtTime(0.25, t + i * 0.07 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.5);
      osc.connect(g).connect(masterGain);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.6);
    });
    // Ping akhir
    const ping = audioCtx.createOscillator();
    const pingG = audioCtx.createGain();
    ping.type = "sine";
    ping.frequency.setValueAtTime(1200, t + 0.4);
    pingG.gain.setValueAtTime(0.4, t + 0.4);
    pingG.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    ping.connect(pingG).connect(masterGain);
    ping.start(t + 0.4); ping.stop(t + 1.1);

  } else if (phase === 3) {
    // 👻 FASE UNGU — Mystic Sweep: arpeggio ethereal naik
    const freqs = [185, 220, 277.18, 369.99, 493.88, 740]; // D minor pentatonic
    freqs.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g   = audioCtx.createGain();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, t + i * 0.1);
      g.gain.setValueAtTime(0, t + i * 0.1);
      g.gain.linearRampToValueAtTime(0.3, t + i * 0.1 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.5);
      osc.connect(g).connect(masterGain);
      osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.6);
    });
    // Choir-like shimmer
    const choir = audioCtx.createOscillator();
    const choirG = audioCtx.createGain();
    choir.type = "sine";
    choir.frequency.setValueAtTime(600, t + 0.3);
    choir.frequency.linearRampToValueAtTime(800, t + 0.8);
    choirG.gain.setValueAtTime(0, t + 0.3);
    choirG.gain.linearRampToValueAtTime(0.2, t + 0.5);
    choirG.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    choir.connect(choirG).connect(masterGain);
    choir.start(t + 0.3); choir.stop(t + 1.3);

  } else if (phase === 4) {
    // 🔥 FASE MERAH — Dragon Roar: heavy drum + brass power chord
    // Bass thud (drum)
    const kick = audioCtx.createOscillator();
    const kickG = audioCtx.createGain();
    kick.type = "sine";
    kick.frequency.setValueAtTime(200, t);
    kick.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    kickG.gain.setValueAtTime(1.0, t);
    kickG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    kick.connect(kickG).connect(masterGain);
    kick.start(t); kick.stop(t + 0.5);

    // Power chord (brass hits — 3 oscillator detuned)
    const brassFreqs = [110, 138.59, 164.81]; // A2, C#3, E3 (A major)
    const brassOffsets = [0, 0.08, 0.16];
    brassFreqs.forEach((freq, i) => {
      [freq, freq * 2, freq * 4].forEach((f, octave) => {
        const osc = audioCtx.createOscillator();
        const g   = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(f, t + brassOffsets[i]);
        g.gain.setValueAtTime(0, t + brassOffsets[i]);
        g.gain.linearRampToValueAtTime(0.12 - octave * 0.03, t + brassOffsets[i] + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + brassOffsets[i] + 0.9);
        osc.connect(g).connect(masterGain);
        osc.start(t + brassOffsets[i]); osc.stop(t + 1.2);
      });
    });
    // Final roar sweep
    const roar = audioCtx.createOscillator();
    const roarG = audioCtx.createGain();
    roar.type = "sawtooth";
    roar.frequency.setValueAtTime(80, t + 0.3);
    roar.frequency.linearRampToValueAtTime(40, t + 1.0);
    roarG.gain.setValueAtTime(0.3, t + 0.3);
    roarG.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    roar.connect(roarG).connect(masterGain);
    roar.start(t + 0.3); roar.stop(t + 1.3);
  }
};

const stopBGM = () => {
  if (!isBgmPlaying) return;
  isBgmPlaying = false;
  clearTimeout(bgmTimeout); // Hentikan loop atmo
  if (droneGain) {
    const now = audioCtx.currentTime;
    droneGain.gain.linearRampToValueAtTime(0, now + 1); // Fade-out pad ambient
    setTimeout(() => {
      if (droneOsc) droneOsc.stop();
      if (lfo) lfo.stop();
    }, 1000);
  }
};

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Membuat sample white noise berdurasi 2 detik
    noiseBuffer = audioCtx.createBuffer(
      1,
      audioCtx.sampleRate * 2,
      audioCtx.sampleRate,
    );
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
};

// Muat file suara kustom (pastikan file +5.mp3 berada di folder yang sama dengan index.html)
const customGoldSfx = new Audio("+5.mp3"); // Ubah ekstensi .mp3 menjadi .wav jika format file Anda WAV
const customGameOverSfx = new Audio("game over.mp3"); // File suara untuk game over

const playSound = (type) => {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);

  if (type === "eat") {
    // Suara "Serapan Energi Gelap" / Bisikan Misterius (Ghostly Whisper)
    const osc = audioCtx.createOscillator();
    osc.type = "sine"; // Sine wave murni untuk kesan magis dan "hollow" (kopong)
    osc.frequency.setValueAtTime(300, now); // Mulai dari nada menengah
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1); // Melengkung naik (eerie lift)
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4); // Jatuh ke dalam jurang (dark drop)

    gainNode.gain.setValueAtTime(0, now); // Fade-in agar tidak ada hentakan kasar
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.4);
    osc.connect(gainNode);

    // Noise berfrekuensi menengah-rendah untuk hembusan angin kelam
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.4); // Suara angin yang memudar ke bawah
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    noise.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + 0.4);
  } else if (type === "freeze") {
    // Suara bongkahan es raksasa membeku dan pecah
    const osc = audioCtx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.5);

    // Tambahkan noise frekuensi tinggi untuk serpihan kristal
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 2000;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    noise.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + 0.4);
  } else if (type === "gold") {
    // Memutar file audio kustom untuk Makanan Emas (+5)
    // cloneNode() digunakan agar suara bisa diputar bertumpuk jika Anda memakan 2 mangsa sekaligus dengan cepat
    const sfx = customGoldSfx.cloneNode();
    sfx.play().catch((err) => console.log("Gagal memutar audio +5:", err));
  } else if (type === "gameover") {
    const sfx = customGameOverSfx.cloneNode();
    sfx
      .play()
      .catch((err) => console.log("Gagal memutar audio game over:", err));
  } else if (type === "shoot") {
    // Raungan naga purba yang murka + semburan api
    const osc = audioCtx.createOscillator();
    osc.type = "sawtooth"; // Pita suara naga (bass)
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.8);

    const osc2 = audioCtx.createOscillator();
    osc2.type = "square"; // Distorsi tambahan
    osc2.frequency.setValueAtTime(60, now);
    osc2.frequency.exponentialRampToValueAtTime(5, now + 0.8);

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer; // Api (desisan noise)
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(50, now + 0.8);

    gainNode.gain.setValueAtTime(0.8, now); // Sangat keras dan mendominasi
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.connect(gainNode);
    osc2.connect(gainNode);
    noise.connect(noiseFilter).connect(gainNode);

    osc.start(now);
    osc.stop(now + 0.8);
    osc2.start(now);
    osc2.stop(now + 0.8);
    noise.start(now);
    noise.stop(now + 0.8);
  } else if (type === "explosion") {
    // Ledakan bergemuruh yang mengguncang bumi
    const osc = audioCtx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.exponentialRampToValueAtTime(1, now + 1.2);

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(20, now + 1.2);

    gainNode.gain.setValueAtTime(1.0, now); // Maksimal volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    osc.connect(gainNode);
    noise.connect(noiseFilter).connect(gainNode);

    osc.start(now);
    osc.stop(now + 1.2);
    noise.start(now);
    noise.stop(now + 1.2);
  }
};
