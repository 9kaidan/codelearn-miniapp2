const tg = window.Telegram.WebApp;

tg.expand();
tg.ready();

const user = tg.initDataUnsafe.user;

if (user) {
    document.getElementById("username").innerText =
        "Привет, " + user.first_name;
}