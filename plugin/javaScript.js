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
let dragonScale = 1.0; // Skala global naga, bertambah setiap makan (1.0x → 2.0x)
let enemyScale  = 1.0; // Skala global musuh, bertambah setiap makan (1.0x → 2.0x)

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

// --- Kontrol Tembak Bola Api (Tahan Klik / Sentuh) ---
window.addEventListener("mousedown", (e) => {
  if (e.button === 0) isShooting = true;
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

  if (gameStarted) drawFire(); // Animasi partikel api hanya saat main
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
    dragonScale = Math.min(1.0 + (score / 60) * 1.0, 2.0); // Naga membesar dari 1.0x hingga 2.0x di skor 60

    // Evolusi musuh selaras dengan fase naga
    if (score >= 10) {
      const newEnemyScale = updateEnemyEvolution(score);
      if (newEnemyScale) enemyScale = newEnemyScale;
    }

    // Peluang 15% untuk memunculkan item power-up beku (jika musuh sudah muncul)
    if (score >= 10 && !isPowerupActive && Math.random() < 0.15) {
      spawnPowerup();
    }

    // Peluang 10% untuk memunculkan Mangsa Langka (Golden Food) di skor >= 20
    if (score >= 20 && !isGoldenFoodActive && Math.random() < 0.1) {
      const pos = getValidSpawnPosition();
      goldenFoodX = pos.x;
      goldenFoodY = pos.y;
      goldenFoodElem.setAttributeNS(
        null,
        "transform",
        `translate(${goldenFoodX},${goldenFoodY})`,
      );
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

  // --- Deteksi Tubrukan (Kepala naga vs Musuh/Ranjau) ---
  if (score >= 5) {
    if (enemyFrozen) {
      freezeTimer--; // Kurangi waktu beku musuh
      if (freezeTimer <= 0) {
        enemyFrozen = false;
        enemyElem.style.filter = ""; // Kembalikan ke filter glow bawaan di CSS
      }
    } else {
      // Menggerakkan musuh
      enemyX += enemyVX;
      enemyY += enemyVY;
      // Pantulan musuh jika menabrak pinggir layar
      if (enemyX <= 20 || enemyX >= width - 20) enemyVX *= -1;
      if (enemyY <= 20 || enemyY >= height - 20) enemyVY *= -1;
      enemyElem.setAttributeNS(
        null,
        "transform",
        `translate(${enemyX},${enemyY}) scale(${enemyScale.toFixed(2)})`,
      );
    }

    const dxE = e.x - enemyX;
    const dyE = e.y - enemyY;
    // Radius tabrakan ikut membesar sesuai skala musuh
    if (Math.sqrt(dxE * dxE + dyE * dyE) < 45 * enemyScale) {
      playSound("explosion"); // Suara ledakan game over
      playSound("gameover"); // Memutar file game over.mp3
      stopBGM(); // Hentikan musik secara memudar saat Game Over
      triggerScreenShake(); // Getaran kuat saat mati (Game Over)
      isGameOver = true;
      document.getElementById("final-score").innerText = score;
      document.getElementById("game-over-modal").classList.remove("hidden");
      try {
        localStorage.setItem("dragonHighScore", highScore); // Simpan skor tertinggi
      } catch (err) {}
    }
  }
  } // Akhir dari blok "if (gameStarted)" yang hilang

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
