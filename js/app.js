const content = document.getElementById("content");
const navButtons = document.querySelectorAll(".bottom-nav button");
const themeToggle = document.getElementById("themeToggle");

let currentPage = "home";
let currentLanguage = null;
let user = null;

/* =========================
   UTILS
========================= */

function setActive(btn) {
  navButtons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function animatePage() {
  content.classList.remove("fade");
  void content.offsetWidth;
  content.classList.add("fade");
}

/* =========================
   PAGES
========================= */

function renderHome() {
  if (!user) return;

  const progressPercent = Math.min(100, (user.xp / 200) * 100);
  const remainingXP = 200 - (user.xp % 200);

  content.innerHTML = `
    <h2>Главная</h2>

    <div class="card">
      <h3>🚀 Продолжить обучение</h3>
      <p>${user.current_course} • ${user.current_lesson}</p>
      <button class="primary-btn" id="continueBtn">Продолжить</button>
    </div>

    <div class="card">
      <h3>📊 Уровень ${user.level}</h3>
      <p>До следующего уровня осталось ${remainingXP} XP</p>
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill" style="width: 0;"></div>
      </div>
    </div>

    <div class="card">
      <h3>📈 Статистика дня</h3>
      <p>🔥 Стрик: ${user.streak} дней</p>
      <p>⚡ XP сегодня: +${user.today_xp}</p>
      <p>🎯 Челлендж выполнен: —</p>
    </div>
  `;

  setTimeout(() => {
    document.getElementById("progressFill").style.width = `${progressPercent}%`;
  }, 100);

  document.getElementById("continueBtn").addEventListener("click", () => {
    renderLanguageMenu();
  });
}

function renderLearn() {
  if (!user) return;

  content.innerHTML = `
    <h2>Выбери язык</h2>
    <div class="language-card" data-lang="python">🐍 Python</div>
    <div class="language-card" data-lang="cpp">💙 C++</div>
    <div class="language-card" data-lang="csharp">🎯 C#</div>
    <div class="language-card" data-lang="dart">🟣 Dart</div>
  `;

  document.querySelectorAll(".language-card").forEach(card => {
    card.addEventListener("click", () => {
      currentLanguage = card.dataset.lang;
      renderLanguageMenu();
    });
  });
}

function renderProgress() {
  content.innerHTML = `
    <h2>Твой прогресс</h2>
    <div class="card">Python — 65%</div>
    <div class="card">C++ — 20%</div>
  `;
}

function renderProfile() {
  if (!user) return;

  content.innerHTML = `
    <h2>Редактор профиля</h2>

    <div class="profile-card">
      <label>Никнейм</label>
      <input type="text" id="nameInput" value="${user.username}" class="styled-input"/>
    </div>

    <div class="profile-card">
      <label>Выбрать аватар</label>
      <input type="file" id="avatarInput" accept="image/*" class="styled-input"/>
    </div>

    <div class="profile-card">
      <button id="saveProfile" class="primary-btn">Сохранить изменения</button>
    </div>
  `;

  document.getElementById("saveProfile").addEventListener("click", async () => {
    const newName = document.getElementById("nameInput").value.trim();
    const avatarFile = document.getElementById("avatarInput").files[0];

    let updatedUser = { ...user };

    if (newName !== "") updatedUser.username = newName;

    if (avatarFile) {
      const reader = new FileReader();
      reader.onload = async function(e) {
        updatedUser.avatar = e.target.result;
        await saveUser(updatedUser);
      };
      reader.readAsDataURL(avatarFile);
    } else {
      await saveUser(updatedUser);
    }
  });
}

/* =========================
   SUPABASE USER LOGIC
========================= */

async function loadUser() {
  const telegramID = window.TELEGRAM_USER_ID;

  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("telegram_id", telegramID)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  if (data) return data;

  const newUser = {
    telegram_id: telegramID,
    username: window.TELEGRAM_USERNAME,
    xp: 0,
    level: 1,
    streak: 0,
    today_xp: 0,
    current_course: "Python",
    current_lesson: "Введение",
    avatar: "👨‍💻"
  };

  const { error: insertError } = await supabaseClient
    .from("users")
    .insert([newUser]);

  if (insertError) {
    console.error(insertError);
    return null;
  }

  return newUser;
}

async function saveUser(updatedUser) {
  // Проверка на уникальность ника
  const { data: existing } = await supabaseClient
    .from("users")
    .select("telegram_id")
    .eq("username", updatedUser.username)
    .maybeSingle();

  if (existing && existing.telegram_id !== updatedUser.telegram_id) {
    alert("Ник уже занят ❌");
    return;
  }

  const { error } = await supabaseClient
    .from("users")
    .update(updatedUser)
    .eq("telegram_id", updatedUser.telegram_id);

  if (error) {
    alert("Ошибка сохранения");
  } else {
    user = updatedUser;
    updateHeader();
    alert("Профиль сохранён ✅");
  }
}

/* =========================
   HEADER
========================= */

function updateHeader() {
  if (!user) return;

  document.querySelector(".username").innerText = `Привет, ${user.username}`;
  document.querySelector(".level").innerText = `Level ${user.level} • ${user.xp} XP`;

  const avatar = document.querySelector(".avatar");
  if (user.avatar && user.avatar.startsWith("data:image")) {
    avatar.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  } else {
    avatar.innerText = user.avatar || "👨‍💻";
  }
}

/* =========================
   LANGUAGE MENU
========================= */

function renderLanguageMenu() {
  if (!user || !currentLanguage) return;

  content.innerHTML = `
    <button id="backBtn" class="back-btn">← Назад</button>
    <div class="card" data-mode="theory">📘 Теория</div>
    <div class="card" data-mode="quiz">🧠 Викторина</div>
    <div class="card" data-mode="practice">💻 Практика</div>
    <div class="card" data-mode="challenge">🏆 Челлендж</div>
  `;

  document.getElementById("backBtn").addEventListener("click", () => {
    renderLearn();
  });

  document.querySelectorAll(".card[data-mode]").forEach(card => {
    card.addEventListener("click", () => {
      renderMode(card.dataset.mode);
    });
  });
}

/* =========================
   MODE PAGES
========================= */

function renderMode(mode) {
  if (!user || !currentLanguage) return;

  content.innerHTML = `
    <button id="backBtn" class="back-btn">← Назад</button>
    <div class="card">
      Раздел "${mode}" для ${currentLanguage}
      <br><br>
      (Здесь будет контент по JSON или урокам)
    </div>
  `;

  document.getElementById("backBtn").addEventListener("click", () => {
    renderLanguageMenu();
  });
}

/* =========================
   MAIN ROUTER
========================= */

function render(page) {
  currentPage = page;
  animatePage();

  if (page === "home") renderHome();
  if (page === "learn") renderLearn();
  if (page === "progress") renderProgress();
  if (page === "profile") renderProfile();
}

/* =========================
   EVENTS
========================= */

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    setActive(btn);
    render(btn.dataset.page);
  });
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
});

/* =========================
   INIT
========================= */

(async () => {
  user = await loadUser();
  if (!user) return;

  updateHeader();
  render("home");
  navButtons[0].classList.add("active");
})();
