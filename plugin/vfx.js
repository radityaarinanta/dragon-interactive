"use strict";

// --- Latar Belakang Bintang (Parallax 3-Layer Starfield) ---
const starCanvas = document.getElementById("starfield");
const starCtx = starCanvas.getContext("2d");

// Konfigurasi 3 layer: [jauh, tengah, dekat]
// Semakin dekat → lebih besar, lebih cepat, lebih terang
const STAR_LAYER_CONFIGS = [
  { count: 60, rMin: 0.15, rMax: 0.6,  sMin: 0.06, sMax: 0.20, oMin: 0.10, oMax: 0.28 }, // Layer 0: Jauh
  { count: 35, rMin: 0.55, rMax: 1.25, sMin: 0.30, sMax: 0.75, oMin: 0.30, oMax: 0.58 }, // Layer 1: Tengah
  { count: 12, rMin: 1.20, rMax: 2.60, sMin: 1.20, sMax: 2.80, oMin: 0.60, oMax: 0.92 }, // Layer 2: Dekat
];
const CONSTELLATION_MAX_DIST  = 140; // Jarak maksimal untuk menghubungkan dua bintang
const CONSTELLATION_MAX_LINES = 25;  // Batas garis konstelasi per frame (performa)
const maxMeteors = 30;

let starLayers = [[], [], []]; // Array 3 layer bintang
let meteors    = [];

// --- Efek Partikel Api (Fire Breath) ---
const fxCanvas = document.getElementById("fx-canvas");
const fxCtx = fxCanvas.getContext("2d");
let fireParticles = [];
let fireballs = [];
let fireballTimer = 0;
let floatingTexts = []; // Array untuk teks skor yang melayang
let trailParticles = []; // Array untuk jejak ekor naga
const MAX_FIRE_PARTICLES  = 200; // Batas atas array partikel api
const MAX_TRAIL_PARTICLES = 120; // Batas atas array jejak ekor

const initStars = () => {
  if (starCanvas) { starCanvas.width = width; starCanvas.height = height; }
  if (fxCanvas)   { fxCanvas.width = width;   fxCanvas.height = height; }

  // Reset semua layer
  starLayers = [[], [], []];
  meteors = [];

  // Isi setiap layer sesuai konfigurasi
  for (let li = 0; li < 3; li++) {
    const cfg = STAR_LAYER_CONFIGS[li];
    for (let i = 0; i < cfg.count; i++) {
      starLayers[li].push({
        x:       Math.random() * width,
        y:       Math.random() * height,
        speed:   cfg.sMin + Math.random() * (cfg.sMax - cfg.sMin),
        radius:  cfg.rMin + Math.random() * (cfg.rMax - cfg.rMin),
        opacity: cfg.oMin + Math.random() * (cfg.oMax - cfg.oMin),
      });
    }
  }

  // Inisialisasi meteor
  for (let i = 0; i < maxMeteors; i++) {
    meteors.push({
      x:       Math.random() * width,
      y:       Math.random() * height,
      speed:   Math.random() * 15 + 10,
      length:  Math.random() * 80 + 30,
      opacity: Math.random() * 0.8 + 0.2,
    });
  }
};

const drawStars = () => {
  starCtx.clearRect(0, 0, width, height);

  // Progress: bintang memudar, meteor muncul (threshold skor 30 = fase merah)
  const progress = Math.min(score / 30, 1);

  // =====================================================================
  // FASE 1: PARALLAX STARFIELD (3 Layer)
  // Setiap layer memudar berbeda kecepatan saat meteor mulai mengambil alih
  // =====================================================================
  const layerFade = [
    1 - progress * 0.95, // Layer jauh: hampir hilang saat fase merah
    1 - progress * 0.65, // Layer tengah: memudar sebagian
    1 - progress * 0.30, // Layer dekat: tetap terlihat cukup lama
  ];

  for (let li = 0; li < 3; li++) {
    const fade = layerFade[li];
    if (fade <= 0) continue;
    const layer = starLayers[li];

    for (let i = 0; i < layer.length; i++) {
      const s = layer[i];
      const alpha = s.opacity * fade;
      if (alpha < 0.01) continue;

      starCtx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      starCtx.beginPath();
      starCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      starCtx.fill();

      // Gerakan parallax — layer lebih dekat bergerak lebih cepat
      s.y += s.speed;
      s.x -= s.speed * 0.18; // Sedikit gerak ke kiri untuk kesan perjalanan

      // Wrap-around saat keluar layar
      if (s.y > height) { s.y = 0;     s.x = Math.random() * width; }
      if (s.x < 0)      { s.x = width; s.y = Math.random() * height; }
    }
  }

  // =====================================================================
  // FASE 2: GARIS KONSTELASI (Menghubungkan bintang layer tengah)
  // Menggunakan single beginPath/stroke untuk efisiensi maksimal
  // Konstelasi memudar seiring score naik (digantikan meteor)
  // =====================================================================
  const constellationAlpha = (1 - progress * 0.85) * 0.18;
  if (constellationAlpha > 0.008) {
    const midLayer = starLayers[1];
    const maxDistSq = CONSTELLATION_MAX_DIST * CONSTELLATION_MAX_DIST;

    starCtx.save();
    starCtx.strokeStyle = `rgba(160, 200, 255, ${constellationAlpha.toFixed(3)})`;
    starCtx.lineWidth = 0.55;
    starCtx.beginPath(); // ← Satu beginPath untuk SEMUA garis (sangat efisien)

    let linesDrawn = 0;
    for (let i = 0; i < midLayer.length && linesDrawn < CONSTELLATION_MAX_LINES; i++) {
      for (let j = i + 1; j < midLayer.length && linesDrawn < CONSTELLATION_MAX_LINES; j++) {
        const dx = midLayer[i].x - midLayer[j].x;
        const dy = midLayer[i].y - midLayer[j].y;
        if (dx * dx + dy * dy < maxDistSq) {
          starCtx.moveTo(midLayer[i].x, midLayer[i].y);
          starCtx.lineTo(midLayer[j].x, midLayer[j].y);
          linesDrawn++;
        }
      }
    }
    starCtx.stroke(); // ← Satu stroke() untuk semua garis sekaligus
    starCtx.restore();
  }

  // =====================================================================
  // FASE 3: METEOR (muncul bertahap sesuai skor, menggantikan bintang)
  // =====================================================================
  const visibleMeteors = Math.floor(maxMeteors * progress);
  for (let i = 0; i < visibleMeteors; i++) {
    const m = meteors[i];

    const grad = starCtx.createLinearGradient(
      m.x, m.y,
      m.x + m.length * 0.2,
      m.y - m.length,
    );
    grad.addColorStop(0, `rgba(255, 200, 200, ${m.opacity})`);
    grad.addColorStop(1, `rgba(255, 50, 50, 0)`);

    starCtx.strokeStyle = grad;
    starCtx.lineWidth = 2;
    starCtx.beginPath();
    starCtx.moveTo(m.x, m.y);
    starCtx.lineTo(m.x + m.length * 0.2, m.y - m.length);
    starCtx.stroke();

    m.y += m.speed;
    m.x -= m.speed * 0.2;

    if (m.y > height + m.length || m.x < -m.length) {
      m.y = -m.length;
      m.x = Math.random() * (width + height * 0.5);
    }
  }
};

const emitFire = (x, y, angle, scale) => {
  if (fireParticles.length >= MAX_FIRE_PARTICLES) return; // Cap: jangan spawn jika sudah penuh
  const snoutX = x - Math.cos(angle) * (35 * scale);
  const snoutY = y - Math.sin(angle) * (35 * scale);
  const forwardAngle = angle + Math.PI;

  // Kurangi partikel dari 4 → 2 per call; tetap terlihat karena dipanggil 40% frame
  for (let k = 0; k < 2; k++) {
    fireParticles.push({
      x: snoutX,
      y: snoutY,
      vx: Math.cos(forwardAngle + (Math.random() - 0.5) * 0.6) * (Math.random() * 8 + 4),
      vy: Math.sin(forwardAngle + (Math.random() - 0.5) * 0.6) * (Math.random() * 8 + 4),
      life: 1,
      decay: Math.random() * 0.04 + 0.025, // Lebih cepat memudar → hidup lebih singkat
      size: Math.random() * 16 + 8,
    });
  }
};

const triggerScreenShake = () => {
  const container = document.querySelector(".container-full");
  container.classList.remove("shake");
  void container.offsetWidth;
  container.classList.add("shake");
  setTimeout(() => container.classList.remove("shake"), 300);
};

// =====================================================================
// Fungsi Render Jurus & Perisai
// =====================================================================
const drawJurus = () => {
  const now = Date.now();

  // --- 1. Proyektil Tengkorak Musuh ---
  if (typeof skullBullets !== "undefined" && skullBullets.length > 0) {
    for (let i = 0; i < skullBullets.length; i++) {
      const b = skullBullets[i];
      fxCtx.save();
      // Lingkaran api luar
      fxCtx.shadowColor = "rgba(255, 40, 0, 0.95)";
      fxCtx.shadowBlur = 18;
      fxCtx.fillStyle = "rgba(255, 70, 0, 0.9)";
      fxCtx.beginPath();
      fxCtx.arc(b.x, b.y, 9, 0, Math.PI * 2);
      fxCtx.fill();
      // Inti putih panas
      fxCtx.shadowBlur = 6;
      fxCtx.fillStyle = "rgba(255, 230, 180, 1)";
      fxCtx.beginPath();
      fxCtx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      fxCtx.fill();
      // Ekor partikel kecil
      fxCtx.fillStyle = `rgba(255, 100, 0, 0.4)`;
      fxCtx.beginPath();
      fxCtx.arc(b.x - b.vx * 1.5, b.y - b.vy * 1.5, 5, 0, Math.PI * 2);
      fxCtx.fill();
      fxCtx.restore();
    }
  }

  // --- 2. Perisai Naga (Shield) ---
  if (typeof shieldActive !== "undefined" && shieldActive && elems[1]) {
    const sx = elems[1].x, sy = elems[1].y;
    const pulse = Math.sin(now * 0.012) * 0.25 + 0.75;
    const lifeRatio = shieldTimer / 120; // 1.0 → 0.0
    fxCtx.save();
    // Lingkaran luar berkilau
    fxCtx.beginPath();
    fxCtx.arc(sx, sy, 70, 0, Math.PI * 2);
    fxCtx.strokeStyle = `rgba(80, 200, 255, ${pulse * 0.65 * lifeRatio})`;
    fxCtx.lineWidth = 4;
    fxCtx.shadowColor = "rgba(80, 200, 255, 0.9)";
    fxCtx.shadowBlur = 22;
    fxCtx.stroke();
    // Lingkaran dalam
    fxCtx.beginPath();
    fxCtx.arc(sx, sy, 58, 0, Math.PI * 2);
    fxCtx.strokeStyle = `rgba(200, 240, 255, ${pulse * 0.3 * lifeRatio})`;
    fxCtx.lineWidth = 1.5;
    fxCtx.shadowBlur = 8;
    fxCtx.stroke();
    // Fill transparan
    fxCtx.beginPath();
    fxCtx.arc(sx, sy, 70, 0, Math.PI * 2);
    fxCtx.fillStyle = `rgba(60, 180, 255, ${0.06 * pulse * lifeRatio})`;
    fxCtx.fill();
    fxCtx.restore();
  }

  // --- 3. Pre-Dash Warning (Ring merah berkedip di musuh) ---
  if (typeof enemyPreDash !== "undefined" && enemyPreDash && enemyX > 0) {
    const warn = Math.abs(Math.sin(now * 0.04)); // Cepat berkedip
    const radius = (48 + warn * 18) * (typeof enemyScale !== "undefined" ? enemyScale : 1);
    fxCtx.save();
    fxCtx.beginPath();
    fxCtx.arc(enemyX, enemyY, radius, 0, Math.PI * 2);
    fxCtx.strokeStyle = `rgba(255, 80, 0, ${warn * 0.85})`;
    fxCtx.lineWidth = 5;
    fxCtx.shadowColor = "rgba(255, 50, 0, 0.9)";
    fxCtx.shadowBlur = 20;
    fxCtx.stroke();
    // Teks peringatan kecil
    fxCtx.fillStyle = `rgba(255, 200, 0, ${warn})`;
    fxCtx.font = "bold 13px 'Segoe UI'";
    fxCtx.textAlign = "center";
    fxCtx.fillText("DASH!", enemyX, enemyY - radius - 8);
    fxCtx.restore();
  }

  // --- 4. Teleport Warning (Flicker/berkedip cepat) ---
  if (typeof enemyTeleporting !== "undefined" && enemyTeleporting && enemyX > 0) {
    const flicker = Math.abs(Math.sin(now * 0.08));
    fxCtx.save();
    fxCtx.beginPath();
    fxCtx.arc(enemyX, enemyY,
      (60 + flicker * 25) * (typeof enemyScale !== "undefined" ? enemyScale : 1),
      0, Math.PI * 2);
    fxCtx.strokeStyle = `rgba(200, 80, 255, ${flicker * 0.9})`;
    fxCtx.lineWidth = 4;
    fxCtx.shadowColor = "rgba(180, 60, 255, 0.95)";
    fxCtx.shadowBlur = 25;
    fxCtx.stroke();
    fxCtx.fillStyle = `rgba(220, 160, 255, ${flicker * 0.8})`;
    fxCtx.font = "bold 13px 'Segoe UI'";
    fxCtx.textAlign = "center";
    fxCtx.fillText("TELEPORT!", enemyX,
      enemyY - (60 + flicker * 25) * (typeof enemyScale !== "undefined" ? enemyScale : 1) - 8);
    fxCtx.restore();
  }
}; // akhir drawJurus

const drawFire = () => {
  fxCtx.clearRect(0, 0, width, height);
  fxCtx.globalCompositeOperation = "lighter"; // Membuat efek nyala api (additive blending)

  // --- Logika dan Render Bola Api (Fireball) ---
  for (let i = fireballs.length - 1; i >= 0; i--) {
    let fb = fireballs[i];
    fb.x += fb.vx;
    fb.y += fb.vy;

    // Gambar Inti Fireball (Bercahaya putih)
    fxCtx.beginPath();
    fxCtx.arc(fb.x, fb.y, 12, 0, Math.PI * 2);
    fxCtx.fillStyle = "white";
    fxCtx.fill();

    // Tinggalkan jejak partikel di belakang bola api (dengan cap)
    if (fireParticles.length < MAX_FIRE_PARTICLES) {
      for (let k = 0; k < 2; k++) { // Dikurangi 3 → 2
        fireParticles.push({
          x: fb.x + (Math.random() - 0.5) * 10,
          y: fb.y + (Math.random() - 0.5) * 10,
          vx: -fb.vx * 0.2 + (Math.random() - 0.5) * 3,
          vy: -fb.vy * 0.2 + (Math.random() - 0.5) * 3,
          life: 1,
          decay: 0.06, // Lebih cepat memudar
          size: Math.random() * 12 + 8,
        });
      }
    }

    // Cek tabrakan bola api dengan musuh (ranjau merah)
    let dx = fb.x - enemyX;
    let dy = fb.y - enemyY;
    if (Math.sqrt(dx * dx + dy * dy) < 40) {
      playSound("explosion"); // Suara ledakan bola api
      enemyFrozen = true;
      freezeTimer = 120; // Stun/lumpuhkan musuh selama 2 detik
      enemyElem.style.filter =
        "sepia(100%) hue-rotate(320deg) saturate(500%) brightness(1.5)"; // Efek hangus terbakar

      triggerScreenShake(); // Getarkan layar saat ledakan terjadi
      // Ledakan memukul mundur musuh (Knockback)
      enemyX += fb.vx * 3;
      enemyY += fb.vy * 3;
      // Pastikan musuh tidak terlempar keluar dari batas layar
      if (enemyX < 20) enemyX = 20;
      if (enemyX > width - 20) enemyX = width - 20;
      if (enemyY < 20) enemyY = 20;
      if (enemyY > height - 20) enemyY = height - 20;

      // Efek ledakan partikel besar (dikurangi 30 → 15, dengan cap)
      const burstCount = Math.min(15, MAX_FIRE_PARTICLES - fireParticles.length);
      for (let j = 0; j < burstCount; j++) {
        fireParticles.push({
          x: fb.x,
          y: fb.y,
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.5) * 18,
          life: 1,
          decay: 0.04,
          size: Math.random() * 20 + 8,
        });
      }

      fireballs.splice(i, 1);
      continue;
    }

    // Hapus bola api jika keluar dari layar
    if (fb.x < 0 || fb.x > width || fb.y < 0 || fb.y > height) {
      fireballs.splice(i, 1);
    }
  }

  // --- Render Partikel Api ---
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    let p = fireParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      fireParticles.splice(i, 1);
      continue;
    }
    fxCtx.beginPath();
    fxCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    let g = Math.floor(200 * p.life);
    fxCtx.fillStyle = `rgba(255, ${g}, 0, ${p.life})`; // Gradasi Kuning ke Merah
    fxCtx.fill();
  }

  // --- Render Jejak Ekor (Tail Trail) ---
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    let tp = trailParticles[i];
    tp.life -= 0.02;
    if (tp.life <= 0) {
      trailParticles.splice(i, 1);
      continue;
    }
    fxCtx.beginPath();
    fxCtx.arc(tp.x, tp.y, tp.size * tp.life, 0, Math.PI * 2);
    if (tp.isGold) {
      fxCtx.fillStyle = `rgba(255, 215, 0, ${tp.life * 0.8})`;
    } else {
      fxCtx.fillStyle = `rgba(200, 200, 255, ${tp.life * 0.5})`;
    }
    fxCtx.fill();
  }

  // --- Render Teks Melayang (Floating Text) ---
  fxCtx.globalCompositeOperation = "source-over"; // Kembalikan mode render normal untuk teks
  fxCtx.font = "bold 24px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  fxCtx.textAlign = "center";

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    ft.y -= 2; // Teks bergerak naik
    ft.life -= 0.02; // Teks perlahan memudar
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }
    fxCtx.fillStyle = `rgba(255, 215, 0, ${ft.life})`; // Kuning Emas
    fxCtx.fillText(ft.text, ft.x, ft.y);
  }
};

// Cache querySelector sekali saja, bukan tiap kali fungsi dipanggil
const _svgEl = document.querySelector(".container-full svg");
const _headColorEl = document.getElementById("head-color");
const _alatasColorEl = document.getElementById("aletas-color");
const _espina1El = document.getElementById("espina-color-1");
const _espina2El = document.getElementById("espina-color-2");

// Cache elemen musuh untuk evolusi
const _enemyAuraOuter = document.getElementById("enemy-aura-outer");
const _enemyAuraInner = document.getElementById("enemy-aura-inner");
const _enemySkullBody = document.getElementById("enemy-skull-body");
const _enemyPupilL    = document.getElementById("enemy-pupil-l");
const _enemyPupilR    = document.getElementById("enemy-pupil-r");
const _enemyElem      = document.getElementById("enemy");

// =====================================================================
// Fungsi Evolusi Musuh — Selaras dengan 4 Fase Naga
// =====================================================================
const updateEnemyEvolution = (currentScore) => {
  // Jangan ubah tampilan jika musuh sedang beku (efek beku menimpa)
  if (typeof enemyFrozen !== "undefined" && enemyFrozen) return;

  let outerColor, innerColor, skullColor, pupilColor, glowFilter, scale;

  if (currentScore < 10) {
    // 💀 FASE 1: Tengkorak Api Merah — Musuh Lemah (skor 0–9)
    const p = currentScore / 10;
    outerColor = "#ff3333";
    innerColor = "#ff9900";
    skullColor = "#ffffff";
    pupilColor = "#ff3333";
    const glow = Math.round(8 + p * 6); // 8 → 14
    glowFilter = `drop-shadow(0px 0px ${glow}px rgba(255, 50, 50, 0.9))`;
    scale = 1.0;

  } else if (currentScore < 20) {
    // ⚡ FASE 2: Tengkorak Listrik Biru — Musuh Menguat (skor 10–19)
    const p = (currentScore - 10) / 10;
    const oR = Math.round(255 * (1 - p));
    outerColor = `rgb(${oR}, ${Math.round(50 * (1 - p))}, 255)`;
    innerColor = `rgb(0, ${Math.round(180 + 75 * p)}, 255)`;
    skullColor = `rgb(${Math.round(255 - 60 * p)}, ${Math.round(255 - 60 * p)}, 255)`;
    pupilColor = `rgb(30, ${Math.round(120 + 80 * p)}, 255)`;
    const glow = Math.round(14 + p * 10); // 14 → 24
    glowFilter = `drop-shadow(0px 0px ${glow}px rgba(0, 160, 255, 0.95))`;
    scale = 1.0 + p * 0.35; // 1.0 → 1.35

  } else if (currentScore < 30) {
    // 👻 FASE 3: Tengkorak Phantom Ungu — Musuh Berbahaya (skor 20–29)
    const p = (currentScore - 20) / 10;
    outerColor = `rgb(${Math.round(140 + p * 60)}, 0, 255)`;
    innerColor = `rgb(${Math.round(80 + p * 120)}, 0, ${Math.round(200 + p * 55)})`;
    skullColor = `rgb(${Math.round(210 - p * 40)}, ${Math.round(180 - p * 180)}, 255)`;
    pupilColor = `rgb(${Math.round(200 + p * 55)}, 0, 255)`;
    const glow = Math.round(20 + p * 12); // 20 → 32
    glowFilter = `drop-shadow(0px 0px ${glow}px rgba(180, 0, 255, 0.95))`;
    scale = 1.35 + p * 0.35; // 1.35 → 1.70

  } else {
    // 😈 FASE 4: Tengkorak Iblis Infernal — Musuh Mematikan (skor 30+)
    const p = Math.min((currentScore - 30) / 20, 1);
    outerColor = `rgb(255, ${Math.round(40 * (1 - p))}, 0)`;
    innerColor = `rgb(255, ${Math.round(100 + 100 * p)}, 0)`;
    skullColor = `rgb(255, ${Math.round(220 - p * 60)}, ${Math.round(160 - p * 160)})`;
    pupilColor = "#ff0000";
    const glow = Math.round(28 + p * 20); // 28 → 48
    glowFilter = `drop-shadow(0px 0px ${glow}px rgba(255, 80, 0, 1.0))`;
    scale = 1.70 + p * 0.30; // 1.70 → 2.0
  }

  // Terapkan perubahan warna ke elemen musuh
  _enemyAuraOuter.setAttribute("fill", outerColor);
  _enemyAuraInner.setAttribute("fill", innerColor);
  _enemySkullBody.setAttribute("fill", skullColor);
  _enemyPupilL.setAttribute("fill", pupilColor);
  _enemyPupilR.setAttribute("fill", pupilColor);
  _enemyElem.style.filter = glowFilter;

  return scale; // Dikembalikan ke javaScript.js untuk update ukuran
};

const updateDragonColor = (currentScore) => {
  let headColor, bodyColor, glowFilter;

  if (currentScore < 10) {
    // ✨ FASE 1: Putih Murni — Naga Baru Lahir (skor 0–9)
    headColor = "rgb(255, 255, 255)";
    bodyColor = "rgb(204, 204, 204)";
    glowFilter = "drop-shadow(0px 0px 8px rgba(200, 220, 255, 0.6))";

  } else if (currentScore < 20) {
    // ⚡ FASE 2: Biru Elektrik — Naga Tumbuh Kuat (skor 10–19)
    const p = (currentScore - 10) / 10; // 0.0 → 1.0
    const headR = Math.round(255 * (1 - p));
    const headG = Math.round(220 * (1 - p * 0.8));
    headColor = `rgb(${headR}, ${headG}, 255)`;
    const bodyR = Math.round(180 * (1 - p));
    const bodyG = Math.round(180 * (1 - p * 0.8));
    bodyColor = `rgb(${bodyR}, ${bodyG}, 255)`;
    const glowSize = Math.round(12 + p * 13); // 12 → 25
    glowFilter = `drop-shadow(0px 0px ${glowSize}px rgba(0, 120, 255, 0.85))`;

  } else if (currentScore < 30) {
    // 🔮 FASE 3: Ungu / Violet — Naga Semi-Dewa (skor 20–29)
    const p = (currentScore - 20) / 10; // 0.0 → 1.0
    const headR = Math.round(180 + p * 75); // 180 → 255
    headColor = `rgb(${headR}, 0, 255)`;
    const bodyR = Math.round(120 + p * 80); // 120 → 200
    bodyColor = `rgb(${bodyR}, 0, 220)`;
    const glowSize = Math.round(16 + p * 14); // 16 → 30
    glowFilter = `drop-shadow(0px 0px ${glowSize}px rgba(160, 0, 255, 0.9))`;

  } else {
    // 🔥 FASE 4: Merah Api — Naga Marah Penuh (skor 30+)
    const p = Math.min((currentScore - 30) / 20, 1); // 0.0 → 1.0 di skor 50
    headColor = "rgb(255, 0, 0)";
    bodyColor = `rgb(255, ${Math.round(30 * (1 - p))}, 0)`;
    const glowSize = Math.round(22 + p * 18); // 22 → 40
    glowFilter = `drop-shadow(0px 0px ${glowSize}px rgba(255, 60, 0, 0.85))`;
  }

  // Terapkan warna ke semua elemen SVG naga (gunakan cache, bukan querySelector ulang)
  _headColorEl.style.fill = headColor;
  _alatasColorEl.style.stopColor = bodyColor;
  _espina1El.style.stopColor = bodyColor;
  _espina2El.style.stopColor = bodyColor;
  _svgEl.style.filter = glowFilter;
};