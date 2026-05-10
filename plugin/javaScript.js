"use strict";


const screen = document.getElementById("screen");
const xmlns = "http://www.w3.org/2000/svg";
const xlinkns = "http://www.w3.org/1999/xlink";

let width = window.innerWidth;
let height = window.innerHeight;
let pointer = { x: width / 2, y: height / 2 };
let rad = 0;
let frm = Math.random();
let radm = Math.min(pointer.x, pointer.y) - 20;

// --- Deteksi Kursor Anti-Bug (Mouse & Layar Sentuh) ---
const updatePointer = (e) => {
  if (e.type.includes("touch") && e.touches && e.touches.length > 0) {
    pointer.x = e.touches[0].clientX;
    pointer.y = e.touches[0].clientY;
  } else {
    pointer.x = e.clientX || e.pageX;
    pointer.y = e.clientY || e.pageY;
  }
  rad = 0;
};

window.addEventListener("mousemove", updatePointer, { passive: true });
window.addEventListener("touchmove", updatePointer, { passive: true });
window.addEventListener("pointermove", updatePointer, { passive: true });

const resize = () => {
  width = window.innerWidth;
  height = window.innerHeight;
  pointer.x = width / 2;
  pointer.y = height / 2;
  radm = Math.min(pointer.x, pointer.y) - 20;
  if (typeof initStars !== "undefined") initStars();
};

window.addEventListener("resize", () => resize(), false);
resize();

// --- Variabel Game ---
let score = 0;
let foodX = 0;
let foodY = 0;
const foodElem = document.getElementById("food");
const scoreElem = document.getElementById("score-value");
let enemyX = -100;
let enemyY = -100;
let enemyVX = 0;
let enemyVY = 0;
const enemyElem = document.getElementById("enemy");
let isGameOver = false;
let gameStarted = false; // Status game dimulai
let isPaused = false; // Status pause
let isShooting = false; // Status tembak bola api (tahan klik/tekan)
let fireballCooldown = 0; // Cooldown tembakan (dalam frame)

// --- Fitur High Score ---
let highScore = 0;
try {
  highScore = localStorage.getItem("dragonHighScore") || 0;
} catch (err) {
  console.warn("Peringatan: LocalStorage dinonaktifkan oleh pengaturan browser.");
}
const highScoreElem = document.getElementById("highscore-value");
if (highScoreElem) highScoreElem.innerText = highScore;

// --- Variabel Power-up (Freeze) ---
let powerupX = -100;
let powerupY = -100;
let isPowerupActive = false;
let enemyFrozen = false;
let freezeTimer = 0;
const powerupElem = document.getElementById("powerup-freeze");

// --- Variabel Mangsa Langka (Golden Food) ---
let goldenFoodX = -100;
let goldenFoodY = -100;
let isGoldenFoodActive = false;
let agileTimer = 0;
const goldenFoodElem = document.getElementById("golden-food");

// --- Variabel Evolusi Ukuran Naga ---
let dragonScale = 1.0;
let enemyScale  = 1.0;

// --- Sistem Jurus Musuh (Enemy Special Attacks) ---
let enemyPreDash      = false; // Fase peringatan sebelum dash
let enemyPreDashTimer = 0;
let enemyDashActive   = false; // Sedang dalam animasi dash
let enemyDashTimer    = 0;
let enemyDashVX       = 0;
let enemyDashVY       = 0;
let enemyDashCooldown = 480;   // Frame hingga dash berikutnya

let skullBullets      = [];    // Array proyektil tengkorak
let bulletCooldown    = 0;

let enemyTeleporting     = false; // Fase peringatan teleport
let enemyTeleportTimer   = 0;
let teleportCooldown     = 0;

// --- Sistem Perisai Naga (Dragon Shield) ---
let shieldActive   = false;
let shieldTimer    = 0;
let shieldCooldown = 0;

// --- Sistem Nyawa (3 Lives) ---
const MAX_LIVES = 3;
let lives = MAX_LIVES;
let invincibilityTimer = 0;
const livesDisplayElem = document.getElementById("lives-display");

// --- Sistem Fase Visual ---
let currentPhase = 1; // Fase saat ini (1-4)
const phaseBgElem       = document.getElementById("phase-bg");
const phaseNotifElem    = document.getElementById("phase-notification");

const phaseData = {
  2: { cls: "p2", title: "⚡ Fase 2: Naga Elektrik",  sub: "Kekuatan listrik membara!" },
  3: { cls: "p3", title: "👻 Fase 3: Naga Semi-Dewa",  sub: "Aura phantom terlepas!" },
  4: { cls: "p4", title: "🔥 Fase 4: Naga Dewa Perang", sub: "Kekuatan penuh terbangkitkan!" },
};

const updatePhaseBg = (phase) => {
  if (!phaseBgElem) return;
  phaseBgElem.className = `phase-${phase}`;
};

const showPhaseNotification = (phase) => {
  if (!phaseNotifElem || !phaseData[phase]) return;
  const d = phaseData[phase];
  phaseNotifElem.innerHTML =
    `<div class="phase-notif-inner ${d.cls}">
       <div class="phase-notif-title">${d.title}</div>
       <div class="phase-notif-sub">${d.sub}</div>
     </div>`;
  phaseNotifElem.classList.remove("hidden");
  // Auto-hide setelah animasi selesai (2.8 detik)
  setTimeout(() => phaseNotifElem.classList.add("hidden"), 2800);
};

const updateLivesDisplay = () => {
  if (!livesDisplayElem) return;
  let html = "";
  for (let i = 0; i < MAX_LIVES; i++) {
    html += i < lives ? "❤️" : "🖤";
  }
  livesDisplayElem.innerHTML = html;
};

const triggerGameOver = () => {
  playSound("explosion");
  playSound("gameover");
  stopBGM();
  triggerScreenShake();
  isGameOver = true;
  document.getElementById("final-score").innerText = score;
  document.getElementById("game-over-modal").classList.remove("hidden");
  try { localStorage.setItem("dragonHighScore", highScore); } catch (err) {}
};

const takeDamage = () => {
  if (invincibilityTimer > 0 || isGameOver || !gameStarted) return;
  lives--;
  updateLivesDisplay();
  if (lives <= 0) {
    // Semua nyawa habis → Game Over
    triggerGameOver();
  } else {
    // Masih hidup → Invincibility + visual feedback
    invincibilityTimer = 150; // 2.5 detik kebal
    playSound("explosion");
    triggerScreenShake();
    // Efek flash merah saat kena damage
    if (_svgEl) _svgEl.classList.add("invincible-flash");
  }
};

// Fungsi tombol Start Screen
document.getElementById("start-btn").addEventListener("click", () => {
  try {
    initAudio(); // Inisialisasi audio
    startBGM(); // Mulai memutar musik
  } catch (err) {
    console.warn("Peringatan: Audio gagal dimuat:", err);
  }
  document.getElementById("start-screen-modal").classList.add("hidden");
  gameStarted = true;
});

// Fungsi tombol restart untuk memuat ulang game
document.getElementById("restart-btn").addEventListener("click", () => {
  location.reload();
});

// --- Event Listener Modal Cara Bermain ---
const howtoModal      = document.getElementById("howto-modal");
const startScreenModal = document.getElementById("start-screen-modal");

const openHowto = () => {
  startScreenModal.classList.add("hidden");
  howtoModal.classList.remove("hidden");
  howtoModal.querySelector(".howto-body").scrollTop = 0; // Reset scroll ke atas
};

const closeHowto = () => {
  howtoModal.classList.add("hidden");
  startScreenModal.classList.remove("hidden");
};

document.getElementById("howto-btn").addEventListener("click", openHowto);
document.getElementById("howto-close-btn").addEventListener("click", closeHowto);
document.getElementById("howto-back-btn").addEventListener("click", closeHowto);

// Tutup modal cara bermain dengan tombol ESC
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape" && !howtoModal.classList.contains("hidden")) {
    closeHowto();
  }
});

// --- Kontrol Tembak Bola Api (Tahan Klik Kiri / Sentuh) ---
window.addEventListener("mousedown", (e) => {
  if (e.button === 0) isShooting = true;
  // Klik Kanan → Aktifkan Perisai Naga (score >= 30)
  if (e.button === 2 && score >= 30 && gameStarted && !isGameOver && !isPaused) {
    if (!shieldActive && shieldCooldown <= 0) {
      shieldActive = true;
      shieldTimer  = 120; // 2 detik perisai aktif
      shieldCooldown = 720; // 12 detik cooldown
    }
  }
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 0) isShooting = false;
});
window.addEventListener("touchstart", () => { isShooting = true; }, { passive: true });
window.addEventListener("touchend", () => { isShooting = false; }, { passive: true });

// --- Fitur Pause ---
window.addEventListener("keydown", (e) => {
  if ((e.code === "Space" || e.code === "KeyP") && gameStarted && !isGameOver) {
    isPaused = !isPaused;
    if (isPaused) {
      document.getElementById("pause-modal").classList.remove("hidden");
      if (typeof audioCtx !== "undefined" && audioCtx.state === "running")
        audioCtx.suspend(); // Bekukan musik
    } else {
      document.getElementById("pause-modal").classList.add("hidden");
      if (typeof audioCtx !== "undefined" && audioCtx.state === "suspended")
        audioCtx.resume(); // Lanjutkan musik
    }
  }
});

// Fungsi untuk mendapatkan koordinat acak yang menghindari area papan skor
const getValidSpawnPosition = () => {
  let x, y;
  let attempts = 0;
  do {
    x = Math.random() * (width - 100) + 50;
    y = Math.random() * (height - 100) + 50;
    attempts++;
  } while (x < 280 && y < 120 && attempts < 100); // Hindari area Kiri Atas, dengan batas aman 100 percobaan
  return { x, y };
};

const spawnFood = () => {
  const pos = getValidSpawnPosition();
  foodX = pos.x;
  foodY = pos.y;
  foodElem.setAttributeNS(null, "transform", `translate(${foodX},${foodY})`);
};
spawnFood();

const spawnPowerup = () => {
  const pos = getValidSpawnPosition();
  powerupX = pos.x;
  powerupY = pos.y;
  powerupElem.setAttributeNS(
    null,
    "transform",
    `translate(${powerupX},${powerupY})`,
  );
  isPowerupActive = true;
};

const spawnEnemy = () => {
  const pos = getValidSpawnPosition();
  enemyX = pos.x;
  enemyY = pos.y;
  // Memberikan kecepatan acak antara 2 hingga 5 piksel per frame
  enemyVX = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 2);
  enemyVY = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 2);
};

const prepend = (use, i) => {
  const elem = document.createElementNS(xmlns, "use");
  elems[i].use = elem;
  elem.setAttributeNS(xlinkns, "xlink:href", "#" + use);
  screen.prepend(elem);
};

let N = 10;
const maxN = 40;

const elems = [];
for (let i = 0; i < N; i++) elems[i] = { use: null, x: width / 2, y: 0 };

for (let i = 1; i < N; i++) {
  if (i === 1) prepend("Cabeza", i);
  else prepend("Espina", i);
}

const run = () => {
  if (isGameOver) return; // Hentikan game loop jika game over
  requestAnimationFrame(run);

  if (isPaused) return; // Bekukan seluruh animasi dan permainan saat di-pause

  drawStars(); // Animasi partikel bintang di setiap frame

  if (gameStarted) {
    drawFire();   // Partikel api & fireball
    drawJurus();  // Proyektil musuh, perisai naga, warning dash/teleport
  }
  let e = elems[0];
  const ax = (Math.cos(3 * frm) * rad * width) / height;
  const ay = (Math.sin(4 * frm) * rad * height) / width;
  let ease = agileTimer > 0 ? 5 : 10;
  if (agileTimer > 0) agileTimer--;

  // Target naga: ke tengah layar saat menu, ke kursor saat main
  let targetX = gameStarted ? pointer.x : width / 2;
  let targetY = gameStarted ? pointer.y : height / 2;

  e.x += (ax + targetX - e.x) / ease;
  e.y += (ay + targetY - e.y) / ease;

  // Seluruh logika gameplay berjalan HANYA JIKA game sudah dimulai
  if (gameStarted) {
    if (fireballCooldown > 0) fireballCooldown--;

  // --- Logika Senjata Bola Api (Manual oleh User) ---
  if (score >= 30 && enemyX > 0 && isShooting && fireballCooldown <= 0) {
    fireballCooldown = 45; // Jeda waktu (cooldown) antar tembakan (0.75 detik)
    playSound("shoot"); // Suara tembakan api
    let hx = elems[1].x; // Koordinat kepala naga
    let hy = elems[1].y;
    let angle = Math.atan2(enemyY - hy, enemyX - hx); // Bidik musuh
    fireballs.push({
      x: hx,
      y: hy,
      vx: Math.cos(angle) * 15, // Kecepatan proyektil
      vy: Math.sin(angle) * 15,
    });
  }

  // --- Deteksi Tubrukan (Kepala naga vs Makanan) ---
  const dx = e.x - foodX;
  const dy = e.y - foodY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 40) {
    // Angka 40 adalah batas toleransi jarak (radius tubrukan)
    playSound("eat"); // Suara memakan makanan
    score++;
    scoreElem.innerText = score;
    updateBGM(score); // Ubah intensitas dan tempo musik

    if (score > highScore) {
      highScore = score;
      highScoreElem.innerText = highScore; // Perbarui tampilan skor tertinggi
    }

    // Efek animasi pop pada angka skor
    scoreElem.classList.remove("pop-animation");
    void scoreElem.offsetWidth; // Memicu reflow browser agar animasi ter-restart
    scoreElem.classList.add("pop-animation");

    // Munculkan teks "+1" melayang di lokasi mangsa dimakan
    floatingTexts.push({ x: foodX, y: foodY, text: "+1", life: 1 });

    spawnFood();
    updateDragonColor(score);  // Perubahan warna naga
    dragonScale = Math.min(1.0 + (score / 60) * 1.0, 2.0);

    // --- Deteksi & Trigger Perubahan Fase ---
    const newPhase = score < 10 ? 1 : score < 20 ? 2 : score < 30 ? 3 : 4;
    if (newPhase !== currentPhase) {
      currentPhase = newPhase;
      updatePhaseBg(newPhase);             // Ganti gradien latar
      showPhaseNotification(newPhase);     // Tampilkan notifikasi besar
      if (typeof playEvolutionSound !== "undefined") {
        playEvolutionSound(newPhase);      // Mainkan suara evolusi khas
      }
    }

    // Evolusi musuh selaras dengan fase naga
    if (score >= 10) {
      const newEnemyScale = updateEnemyEvolution(score);
      if (newEnemyScale) enemyScale = newEnemyScale;
    }

    // Peluang 15% untuk memunculkan item power-up beku (jika musuh sudah muncul)
    if (score >= 10 && !isPowerupActive && Math.random() < 0.15) {
      spawnPowerup();
    }

    // Peluang munculnya Mangsa Langka (Golden Food):
    // - Guaranteed muncul pertama kali di skor 20
    // - Setelah itu: 15% peluang per makan di skor >= 18 (lebih langka, lebih berharga)
    if (score === 20 && !isGoldenFoodActive) {
      const pos = getValidSpawnPosition();
      goldenFoodX = pos.x; goldenFoodY = pos.y;
      goldenFoodElem.setAttributeNS(null, "transform", `translate(${goldenFoodX},${goldenFoodY})`);
      isGoldenFoodActive = true;
    } else if (score >= 18 && score !== 20 && !isGoldenFoodActive && Math.random() < 0.15) {
      const pos = getValidSpawnPosition();
      goldenFoodX = pos.x; goldenFoodY = pos.y;
      goldenFoodElem.setAttributeNS(null, "transform", `translate(${goldenFoodX},${goldenFoodY})`);
      isGoldenFoodActive = true;
    }

    if (score === 10) {
      spawnEnemy(); // Musuh muncul pertama kali di skor 10
    } else if (score > 10) {
      enemyVX *= 1.07; // Kecepatan musuh bertambah 7% setiap makan (lebih lambat karena fase lebih panjang)
      enemyVY *= 1.07;
    }

    // --- Logika Evolusi Naga ---
    // 1. Tambah panjang badan naga setiap makan (hingga batas maxN)
    if (N < maxN) {
      let addSegments = 5; // Setiap makan, tubuh tambah panjang 5 ruas
      if (N + addSegments > maxN) addSegments = maxN - N;

      for (let i = 0; i < addSegments; i++) {
        let newIdx = N + i;
        elems[newIdx] = { use: null, x: elems[N - 1].x, y: elems[N - 1].y };
        prepend("Espina", newIdx);
      }
      N += addSegments;
    }

    // 2. Tumbuhkan sayap (Aletas) pada ruas tertentu saat skor bertambah
    // Sayap tumbuh merata di setiap fase (skor 8, 16, 24, 32)
    if (score === 8 && elems[8]) {
      elems[8].use.setAttributeNS(xlinkns, "xlink:href", "#Aletas");
    }
    if (score === 16 && elems[14]) {
      elems[14].use.setAttributeNS(xlinkns, "xlink:href", "#Aletas");
    }
    if (score === 24 && elems[20]) {
      elems[20].use.setAttributeNS(xlinkns, "xlink:href", "#Aletas");
    }
    if (score === 32 && elems[26]) {
      elems[26].use.setAttributeNS(xlinkns, "xlink:href", "#Aletas");
    }
  } else if (dist < 200 && score > 35) {
    // --- Logika Mangsa Pintar (Menghindar) ---
    // Jika jarak naga dekat (kurang dari 200px) dan skor di atas 18, makanan akan lari ke arah berlawanan
    foodX += (foodX - e.x) * 0.035; // Kecepatan lari mangsa
    foodY += (foodY - e.y) * 0.035;

    // Pastikan makanan tidak lari keluar batas layar
    if (foodX < 30) foodX = 30;
    if (foodX > width - 30) foodX = width - 30;
    if (foodY < 30) foodY = 30;
    if (foodY > height - 30) foodY = height - 30;

    foodElem.setAttributeNS(null, "transform", `translate(${foodX},${foodY})`);
  }

  // --- Deteksi Tubrukan (Kepala naga vs Mangsa Langka Emas) ---
  if (isGoldenFoodActive) {
    const dxG = e.x - goldenFoodX;
    const dyG = e.y - goldenFoodY;
    if (Math.sqrt(dxG * dxG + dyG * dyG) < 40) {
      isGoldenFoodActive = false;
      goldenFoodElem.setAttributeNS(null, "transform", `translate(-100,-100)`);

      score += 5;
      scoreElem.innerText = score;

      if (score > highScore) {
        highScore = score;
        highScoreElem.innerText = highScore;
      }
      updateBGM(score); // Ubah intensitas musik secara drastis
      playSound("gold"); // Suara epik saat memakan mangsa emas

      scoreElem.classList.remove("pop-animation");
      void scoreElem.offsetWidth;
      scoreElem.classList.add("pop-animation");

      floatingTexts.push({
        x: goldenFoodX,
        y: goldenFoodY,
        text: "+5",
        life: 1,
      });
      agileTimer = 300; // Mode Lincah aktif (300 frame, sekitar 5 detik)
      updateDragonColor(score);
    }
  }

  // --- Deteksi Tubrukan (Kepala naga vs Power-Up Freeze) ---
  if (isPowerupActive) {
    const dxP = e.x - powerupX;
    const dyP = e.y - powerupY;
    if (Math.sqrt(dxP * dxP + dyP * dyP) < 40) {
      playSound("freeze"); // Suara efek membeku
      isPowerupActive = false;
      powerupX = -100; // Sembunyikan powerup dari layar
      powerupY = -100;
      powerupElem.setAttributeNS(
        null,
        "transform",
        `translate(${powerupX},${powerupY})`,
      );

      enemyFrozen = true;
      freezeTimer = 300; // 300 frame = ~5 detik waktu beku (asumsi 60 fps)
      enemyElem.style.filter =
        "grayscale(100%) brightness(150%) hue-rotate(180deg)"; // Buat musuh tampak beku (pucat biru)
    }
  }

  // --- Perisai Naga: Tick setiap frame ---
  if (shieldActive) { shieldTimer--; if (shieldTimer <= 0) shieldActive = false; }
  if (shieldCooldown > 0) shieldCooldown--;

  // --- Invincibility Tick ---
  if (invincibilityTimer > 0) {
    invincibilityTimer--;
    if (invincibilityTimer <= 0 && _svgEl) {
      _svgEl.classList.remove("invincible-flash"); // Hapus flash saat selesai
    }
  }

  // --- Proyektil Tengkorak: Update posisi & deteksi tabrakan ---
  for (let i = skullBullets.length - 1; i >= 0; i--) {
    const b = skullBullets[i];
    b.x += b.vx; b.y += b.vy;
    if (b.x < -20 || b.x > width+20 || b.y < -20 || b.y > height+20) {
      skullBullets.splice(i, 1); continue;
    }
    const hx = elems[1] ? elems[1].x : e.x;
    const hy = elems[1] ? elems[1].y : e.y;
    // Cek perisai memblokir proyektil
    if (shieldActive && Math.sqrt((b.x-hx)**2 + (b.y-hy)**2) < 75) {
      // Flash blok di titik benturan
      if (fireParticles.length < MAX_FIRE_PARTICLES) {
        for (let k = 0; k < 6; k++) fireParticles.push({
          x: b.x, y: b.y,
          vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8,
          life: 1, decay: 0.08, size: Math.random()*10+5
        });
      }
      skullBullets.splice(i, 1); continue;
    }
    // Proyektil kena kepala naga → kurangi nyawa
    if (!shieldActive && Math.sqrt((b.x-hx)**2 + (b.y-hy)**2) < 28) {
      skullBullets.splice(i, 1);
      takeDamage();
      if (isGameOver) return;
      continue;
    }
  }

  // --- Deteksi Tubrukan (Kepala naga vs Musuh/Ranjau) ---
  if (score >= 10) {
    if (enemyFrozen) {
      freezeTimer--;
      if (freezeTimer <= 0) {
        enemyFrozen = false;
        enemyElem.style.filter = "";
        // Kembalikan evolusi visual saat unfreeze
        const ns = updateEnemyEvolution(score);
        if (ns) enemyScale = ns;
      }
    } else {
      // === GERAKAN MUSUH ===
      if (enemyDashActive) {
        // Saat dashing: gunakan kecepatan dash (jauh lebih cepat)
        enemyX += enemyDashVX; enemyY += enemyDashVY;
        if (enemyX < 20) { enemyX = 20; enemyDashVX = Math.abs(enemyDashVX); }
        if (enemyX > width-20) { enemyX = width-20; enemyDashVX = -Math.abs(enemyDashVX); }
        if (enemyY < 20) { enemyY = 20; enemyDashVY = Math.abs(enemyDashVY); }
        if (enemyY > height-20) { enemyY = height-20; enemyDashVY = -Math.abs(enemyDashVY); }
        enemyDashTimer--;
        if (enemyDashTimer <= 0) enemyDashActive = false;
      } else {
        // Gerakan bouncing normal
        enemyX += enemyVX; enemyY += enemyVY;
        if (enemyX <= 20 || enemyX >= width-20) enemyVX *= -1;
        if (enemyY <= 20 || enemyY >= height-20) enemyVY *= -1;
      }
      enemyElem.setAttributeNS(null, "transform",
        `translate(${enemyX},${enemyY}) scale(${enemyScale.toFixed(2)})`);

      // === JURUS 1: DASH ATTACK (skor >= 30) ===
      if (score >= 30 && !enemyDashActive) {
        const dashCD = Math.max(200, 480 - Math.floor((score-30)/5)*20);
        if (!enemyPreDash) {
          enemyDashCooldown--;
          if (enemyDashCooldown <= 0) {
            enemyPreDash = true; enemyPreDashTimer = 65;
            enemyDashCooldown = dashCD;
          }
        } else {
          enemyPreDashTimer--;
          if (enemyPreDashTimer <= 0) {
            enemyPreDash = false; enemyDashActive = true; enemyDashTimer = 50;
            const th = elems[1] || elems[0];
            const ang = Math.atan2(th.y - enemyY, th.x - enemyX);
            const spd = Math.min(22, 14 + (score-30)*0.2);
            enemyDashVX = Math.cos(ang)*spd; enemyDashVY = Math.sin(ang)*spd;
            playSound("explosion");
          }
        }
      }

      // === JURUS 2: PROYEKTIL TENGKORAK (skor >= 40) ===
      if (score >= 40) {
        const bulletCD = Math.max(140, 360 - (score-40)*4);
        bulletCooldown--;
        if (bulletCooldown <= 0) {
          bulletCooldown = bulletCD;
          const th = elems[1] || elems[0];
          const ang = Math.atan2(th.y - enemyY, th.x - enemyX);
          const spd = Math.min(13, 7 + (score-40)*0.12);
          skullBullets.push({ x: enemyX, y: enemyY,
            vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd });
          playSound("shoot");
        }
      }

      // === JURUS 3: TELEPORT (skor >= 50) ===
      if (score >= 50) {
        const teleCD = Math.max(280, 600 - (score-50)*6);
        if (!enemyTeleporting) {
          teleportCooldown--;
          if (teleportCooldown <= 0) {
            enemyTeleporting = true; enemyTeleportTimer = 90;
            teleportCooldown = teleCD;
          }
        } else {
          enemyTeleportTimer--;
          if (enemyTeleportTimer <= 0) {
            enemyTeleporting = false;
            const th = elems[1] || elems[0];
            let tx, ty, tries = 0;
            do {
              tx = Math.random()*(width-100)+50;
              ty = Math.random()*(height-100)+50;
              tries++;
            } while (Math.sqrt((tx-th.x)**2 + (ty-th.y)**2) < 250 && tries < 25);
            enemyX = tx; enemyY = ty;
            enemyVX = (Math.random()>0.5?1:-1)*Math.abs(enemyVX);
            enemyVY = (Math.random()>0.5?1:-1)*Math.abs(enemyVY);
          }
        }
      }
    }

    // Deteksi kepala naga kena musuh → kurangi nyawa
    const dxE = e.x - enemyX;
    const dyE = e.y - enemyY;
    if (!shieldActive && Math.sqrt(dxE*dxE + dyE*dyE) < 45*enemyScale) {
      takeDamage();
      if (isGameOver) return;
    }
  }
  } // Akhir dari blok "if (gameStarted)"

  for (let i = 1; i < N; i++) {
    let e = elems[i];
    let ep = elems[i - 1];
    const a = Math.atan2(e.y - ep.y, e.x - ep.x);
    e.x += (ep.x - e.x + (Math.cos(a) * (100 - i)) / 5) / 4;
    e.y += (ep.y - e.y + (Math.sin(a) * (100 - i)) / 5) / 4;
    const s = ((162 + 4 * (1 - i)) / 50) * dragonScale;

    let scaleX = s;
    let scaleY = s;

    // Efek mengepak (Flapping) khusus untuk sayap
    // Ruas ke 8, 14, 20, dan 26 adalah posisi sayap tumbuh
    if (i === 8 || i === 14 || i === 20 || i === 26) {
      // Mengepak menggunakan gelombang Sinus berdasarkan waktu (frm)
      scaleY = s * (0.4 + Math.abs(Math.sin(frm * 10 - i * 0.5)) * 0.8);
    }

    // Efek khusus Kepala Naga saat marah
    if (i === 1 && score >= 30) {
      // Buka rahang saat tombol ditahan atau sesaat setelah menembak
      if (isShooting || fireballCooldown > 30) {
        scaleY = s * (1.5 + Math.sin(frm * 40) * 0.2); // Mulut terbuka lebih lebar
        if (Math.random() < 0.4 && gameStarted)
          emitFire((ep.x + e.x) / 2, (ep.y + e.y) / 2, a, s);
      }
    }

    e.use.setAttributeNS(
      null,
      "transform",
      `translate(${(ep.x + e.x) / 2},${(ep.y + e.y) / 2}) rotate(${
        (180 / Math.PI) * a
      }) scale(${scaleX},${scaleY})`,
    );
  }

  // --- Logika Jejak Ekor (Tail Trail) ---
  // Skip setiap frame genap (50% frame skip) = potong beban separuhnya di fase akhir
  if (elems[N - 1] && Math.random() < 0.5) {
    let tail = elems[N - 1];
    if (trailParticles.length < MAX_TRAIL_PARTICLES) {
      trailParticles.push({
        x: tail.x + (Math.random() - 0.5) * 10,
        y: tail.y + (Math.random() - 0.5) * 10,
        life: 1,
        size: Math.random() * 4 + 2,
        isGold: false
      });
    }
    // Trail emas Mode Lincah: cap + probabilitas 70% (bukan setiap frame)
    if (agileTimer > 0 && trailParticles.length < MAX_TRAIL_PARTICLES && Math.random() < 0.7) {
      trailParticles.push({
        x: tail.x + (Math.random() - 0.5) * 15,
        y: tail.y + (Math.random() - 0.5) * 15,
        life: 1,
        size: Math.random() * 6 + 3,
        isGold: true
      });
    }
  }

  if (rad < radm) rad++;
  frm += 0.003;
};

run();
