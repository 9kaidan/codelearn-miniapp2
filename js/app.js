import { lessons } from "./lessons.js";

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
   HOME
========================= */

function renderHome() {
  if (!user) return;

  const progressPercent = Math.min(100, (user.xp / 200) * 100);
  const remainingXP = 200 - (user.xp % 200);

  content.innerHTML = `
    <h2>Главная</h2>

    <div class="card">
      <h3>🚀 Продолжить обучение</h3>
      <p>${user.current_course} • Урок ${user.current_lesson_id}</p>
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
    </div>
  `;

  setTimeout(() => {
    document.getElementById("progressFill").style.width = `${progressPercent}%`;
  }, 100);

  document.getElementById("continueBtn").addEventListener("click", () => {

    const reverseLangMap = {
      "Python": "python",
      "C++": "cpp",
      "C#": "csharp",
      "Dart": "dart"
    };

    currentLanguage = reverseLangMap[user.current_course];

    if (!currentLanguage) {
      renderLearn();
      return;
    }

    renderCurrentLesson();
  });
}

/* =========================
   LANGUAGE SELECT
========================= */

function renderLearn() {
  if (!user) return;

  content.innerHTML = `
    <h2>Выбери язык</h2>
    <div class="language-card" data-lang="python">🐍 Python</div>
  `;

  document.querySelectorAll(".language-card").forEach(card => {
    card.addEventListener("click", async () => {

      currentLanguage = card.dataset.lang;

      user.current_course = "Python";
      user.current_language = "python";
      user.current_lesson_id = 1;
      user.completed_lessons = [];

      await supabaseClient
        .from("users")
        .update({
          current_course: user.current_course,
          current_language: user.current_language,
          current_lesson_id: user.current_lesson_id,
          completed_lessons: user.completed_lessons
        })
        .eq("telegram_id", user.telegram_id);

      renderCurrentLesson();
    });
  });
}

/* =========================
   LESSON SYSTEM
========================= */

function renderCurrentLesson() {
  const languageLessons = lessons[currentLanguage];
  if (!languageLessons) return;

  const lesson = languageLessons.find(
    l => l.id === user.current_lesson_id
  );

  if (!lesson) {
    content.innerHTML = `
      <div class="card">🎉 Курс завершён!</div>
    `;
    return;
  }

  if (lesson.type === "theory") renderTheoryLesson(lesson);
  if (lesson.type === "quiz") renderQuizLesson(lesson);
}

function renderTheoryLesson(lesson) {
  content.innerHTML = `
    <button id="backBtn" class="back-btn">← Назад</button>
    <div class="card">
      <h3>${lesson.title}</h3>
      <p>${lesson.content}</p>
      <button id="completeLesson" class="primary-btn">
        Завершить (+20 XP)
      </button>
    </div>
  `;

  document.getElementById("completeLesson")
    .addEventListener("click", async () => {
      await completeLesson(lesson, 20);
    });

  document.getElementById("backBtn")
    .addEventListener("click", renderHome);
}

function renderQuizLesson(lesson) {
  content.innerHTML = `
    <button id="backBtn" class="back-btn">← Назад</button>
    <div class="card">
      <h3>${lesson.question}</h3>
      ${lesson.options.map((opt, i) => `
        <div class="quiz-option" data-index="${i}">
          ${opt}
        </div>
      `).join("")}
    </div>
  `;

  document.querySelectorAll(".quiz-option")
    .forEach(option => {
      option.addEventListener("click", async () => {
        const selected = parseInt(option.dataset.index);

        if (selected === lesson.correct) {
          await completeLesson(lesson, 30);
        } else {
          alert("Неправильно 😅");
        }
      });
    });

  document.getElementById("backBtn")
    .addEventListener("click", renderHome);
}

async function completeLesson(lesson, xpReward) {

  if (!user.completed_lessons) {
    user.completed_lessons = [];
  }

  user.completed_lessons.push(lesson.id);
  user.current_lesson_id++;
  user.xp += xpReward;
  user.today_xp += xpReward;

  await supabaseClient
    .from("users")
    .update({
      xp: user.xp,
      today_xp: user.today_xp,
      current_lesson_id: user.current_lesson_id,
      completed_lessons: user.completed_lessons
    })
    .eq("telegram_id", user.telegram_id);

  renderHome();
}

/* =========================
   INIT
========================= */

(async () => {
  user = await loadUser();
  if (!user) return;

  if (!user.current_language) {
    user.current_language = "python";
    user.current_lesson_id = 1;
    user.completed_lessons = [];
  }

  updateHeader();
  renderHome();
})();
