const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const log = document.getElementById('log');
const progress = document.getElementById('progress');
const statusText = document.getElementById('status-text');

let model = null;
let isLive = false;

// 1. ФУНКЦИЯ ЛОГИРОВАНИЯ
function addLog(msg) {
    const entry = document.createElement('div');
    entry.style.marginBottom = "5px";
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.prepend(entry);
    console.log(msg);
}

// 2. ЗАГРУЗКА МОДЕЛИ
async function loadModel() {
    addLog("Запрос к серверу Roboflow...");
    
    // Плавная анимация загрузки (фейковая часть)
    let p = 0;
    const interval = setInterval(() => {
        if (p < 85) { p += 5; progress.style.width = p + "%"; }
    }, 200);

    roboflow.auth({
        publishable_key: "rf_0S9uB0A9P0XvP6Y8p3Y5" // Демо-ключ
    }).load({
        model: "construction-site-safety",
        version: 4
    }).then(m => {
        clearInterval(interval);
        model = m;
        progress.style.width = "100%";
        addLog("Модель успешно загружена!");
        statusText.innerText = "Система готова";
        setTimeout(() => document.getElementById('loading-area').style.display = "none", 500);
    }).catch(err => {
        addLog("ОШИБКА: " + err.message);
        statusText.innerText = "Ошибка загрузки. Проверьте интернет.";
    });
}

loadModel();

// 3. КАМЕРА
async function startCamera() {
    if (!model) return alert("Подождите загрузки модели");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = "block";
        isLive = true;
        detect();
    } catch (e) {
        addLog("Нет доступа к камере");
    }
}

async function detect() {
    if (!isLive) return;
    const predictions = await model.detect(video);
    render(predictions, video);
    requestAnimationFrame(detect);
}

// 4. ФОТО
function processImage(event) {
    const file = event.target.files[0];
    if (!file || !model) return;
    isLive = false;
    video.style.display = "none";
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
        canvas.width = 640;
        canvas.height = 480;
        ctx.drawImage(img, 0, 0, 640, 480);
        const predictions = await model.detect(img);
        render(predictions, img);
    };
}

// 5. ОТРИСОВКА
function render(predictions, source) {
    if (isLive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    }
    predictions.forEach(p => {
        if (p.confidence > 0.6) {
            const isBad = p.class.includes("no-") || p.class === "person";
            const color = isBad ? "#ef4444" : "#22c55e";
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.strokeRect(p.x - p.width/2, p.y - p.height/2, p.width, p.height);
            
            ctx.fillStyle = color;
            ctx.fillRect(p.x - p.width/2, p.y - p.height/2 - 25, p.width, 25);
            ctx.fillStyle = "white";
            ctx.fillText(p.class.toUpperCase(), p.x - p.width/2 + 5, p.y - p.height/2 - 7);
        }
    });
}
