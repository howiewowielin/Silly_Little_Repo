const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    Space: false
};

// Virtual resolution
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

// Physics
const gravity = 0.7;
const moveSpeed = 3.0;
const maxSpeedX = 5.0;
const jumpStrength = 12.0;

// Player
const player = {
    x: 60,
    y: 0,
    w: 24,
    h: 32,
    vx: 0,
    vy: 0,
    onGround: false
};

// Player sprite (change path if you move the image)
const girlImg = new Image();
girlImg.src = 'Black_cat.png';
let girlImgLoaded = false;
girlImg.onload = () => { girlImgLoaded = true; };

// Levels
const levels = [
    // Level 1: simple ground and small gap
    {
        start: { x: 60, y: 300 },
        goal: { x: 740, y: 260, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 800, h: 70 },
            { x: 300, y: 320, w: 80, h: 20 },
            { x: 420, y: 300, w: 80, h: 20 }
        ]
    },
    // Level 2: step ups
    {
        start: { x: 40, y: 340 },
        goal: { x: 740, y: 200, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 800, h: 70 },
            { x: 180, y: 330, w: 80, h: 20 },
            { x: 320, y: 290, w: 80, h: 20 },
            { x: 460, y: 250, w: 80, h: 20 },
            { x: 600, y: 220, w: 120, h: 20 }
        ]
    },
    // Level 3: moving across spaced plats
    {
        start: { x: 40, y: 260 },
        goal: { x: 730, y: 120, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 800, h: 70 },
            { x: 120, y: 300, w: 80, h: 18 },
            { x: 240, y: 260, w: 80, h: 18 },
            { x: 360, y: 220, w: 80, h: 18 },
            { x: 480, y: 180, w: 80, h: 18 },
            { x: 600, y: 150, w: 100, h: 18 }
        ]
    },
    // Level 4: a pit to jump
    {
        start: { x: 40, y: 300 },
        goal: { x: 730, y: 260, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 300, h: 70 },
            { x: 380, y: 380, w: 420, h: 70 },
            { x: 260, y: 320, w: 80, h: 20 },
            { x: 520, y: 320, w: 80, h: 20 }
        ]
    },
    // Level 5: finale
    {
        start: { x: 40, y: 320 },
        goal: { x: 740, y: 80, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 800, h: 70 },
            { x: 150, y: 340, w: 100, h: 18 },
            { x: 300, y: 300, w: 100, h: 18 },
            { x: 460, y: 260, w: 100, h: 18 },
            { x: 620, y: 220, w: 120, h: 18 },
            { x: 520, y: 160, w: 80, h: 18 }
        ]
    }
];

let levelIndex = 0;
let currentLevel = levels[levelIndex];

// Editable messages shown after each level (fill in your quotes!)
const levelMessages = [
    'Level 1 complete! (Edit me with something you love about her ♥)',
    'Level 2 complete! (Edit me with your own sweet line)',
    'Level 3 complete! (Another compliment goes here)',
    'Level 4 complete! (Keep the love coming)',
    'Level 5 complete! You did it! (Your finale message)'
];

// Simple message/overlay state
let mode = 'playing'; // 'playing' | 'message'
let messageText = '';
let pendingNextLevelIndex = null;

function showLevelCompleteMessage(text, nextIndex) {
    mode = 'message';
    messageText = text || 'Level complete!';
    pendingNextLevelIndex = nextIndex;
}

function advanceMessage() {
    if (mode !== 'message') return;
    mode = 'playing';
    if (pendingNextLevelIndex != null) {
        if (pendingNextLevelIndex < levels.length) {
            loadLevel(pendingNextLevelIndex);
        } else {
            loadLevel(0);
        }
    }
    pendingNextLevelIndex = null;
}

function loadLevel(i) {
    levelIndex = Math.max(0, Math.min(levels.length - 1, i));
    currentLevel = levels[levelIndex];
    player.x = currentLevel.start.x;
    player.y = currentLevel.start.y;
    player.vx = 0;
    player.vy = 0;
}
loadLevel(0);

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const s = Math.min(canvas.width / GAME_WIDTH, canvas.height / GAME_HEIGHT);
    scale = s;
    offsetX = (canvas.width - GAME_WIDTH * scale) / 2;
    offsetY = (canvas.height - GAME_HEIGHT * scale) / 2;
}
window.addEventListener('resize', resize);
resize();

// Input Handling
window.addEventListener('keydown', (e) => {
    if (mode === 'message' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp')) {
        e.preventDefault();
        advanceMessage();
        return;
    }
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// Touch Controls
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const jumpBtn = document.getElementById('jumpBtn');

const addTouchListener = (elem, code) => {
    elem.addEventListener('touchstart', (e) => { e.preventDefault(); keys[code] = true; });
    elem.addEventListener('touchend', (e) => { e.preventDefault(); keys[code] = false; });
};

addTouchListener(leftBtn, 'ArrowLeft');
addTouchListener(rightBtn, 'ArrowRight');
addTouchListener(jumpBtn, 'ArrowUp'); // Map jump button to ArrowUp

// Tap/click anywhere to advance from message
canvas.addEventListener('touchstart', (e) => {
    if (mode === 'message') { e.preventDefault(); advanceMessage(); }
}, { passive: false });
canvas.addEventListener('mousedown', () => {
    if (mode === 'message') advanceMessage();
});

// Game Loop
function update() {
    if (mode !== 'playing') return;

    const left = keys.ArrowLeft;
    const right = keys.ArrowRight;
    const jump = keys.ArrowUp || keys.Space;

    if (left && !right) player.vx -= 0.6;
    if (right && !left) player.vx += 0.6;
    if (!left && !right) player.vx *= 0.8;
    if (player.vx > maxSpeedX) player.vx = maxSpeedX;
    if (player.vx < -maxSpeedX) player.vx = -maxSpeedX;

    if (jump && player.onGround) {
        player.vy = -jumpStrength;
        player.onGround = false;
    }

    player.vy += gravity;

    moveAndCollide(player, currentLevel.platforms);

    if (rectsOverlap(player, currentLevel.goal)) {
        const next = levelIndex + 1;
        const msg = levelMessages[levelIndex] || 'Level complete!';
        showLevelCompleteMessage(msg, next);
    }

    if (player.y > GAME_HEIGHT + 200) {
        loadLevel(levelIndex);
    }
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    // background
    ctx.fillStyle = '#2d2f49';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // platforms
    ctx.fillStyle = '#7bd389';
    for (const p of currentLevel.platforms) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
    }

    // goal
    ctx.fillStyle = '#ff72b6';
    const g = currentLevel.goal;
    ctx.fillRect(g.x, g.y, g.w, g.h);

    // player (sprite with fallback)
    if (girlImgLoaded) {
        ctx.drawImage(girlImg, player.x, player.y, player.w, player.h);
    } else {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    // HUD
    ctx.fillStyle = 'white';
    ctx.font = '16px system-ui, -apple-system, Arial';
    ctx.fillText(`Level ${levelIndex + 1} / ${levels.length}`, 12, 22);

    // Message overlay
    if (mode === 'message') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, messageText, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, 520, 24);
        ctx.font = '14px system-ui, -apple-system, Arial';
        ctx.fillText('Tap or press to continue', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();

// Helpers
function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function moveAndCollide(body, solids) {
    body.x += body.vx;
    resolveAxis(body, solids, 'x');
    body.y += body.vy;
    const wasFalling = body.vy > 0;
    resolveAxis(body, solids, 'y');
    body.onGround = wasFalling && body.vy === 0;
}

function resolveAxis(body, solids, axis) {
    for (const s of solids) {
        if (!rectsOverlap(body, s)) continue;
        if (axis === 'x') {
            if (body.vx > 0) body.x = s.x - body.w;
            else if (body.vx < 0) body.x = s.x + s.w;
            body.vx = 0;
        } else {
            if (body.vy > 0) body.y = s.y - body.h;
            else if (body.vy < 0) body.y = s.y + s.h;
            body.vy = 0;
        }
    }
}

let flashTimer = 0;
function showWinFlash() {
    flashTimer = 18;
}

// Simple win flash overlay
(function winOverlayLoop() {
    if (flashTimer > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(255, 114, 182, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashTimer--;
    }
    requestAnimationFrame(winOverlayLoop);
})();

// Text wrap helper for overlay
function wrapText(ctx, text, centerX, startY, maxWidth, lineHeight) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    ctx.font = '20px system-ui, -apple-system, Arial';
    for (let n = 0; n < words.length; n++) {
        const testLine = line ? line + ' ' + words[n] : words[n];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line) {
            lines.push(line);
            line = words[n];
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);
    let y = startY - ((lines.length - 1) * lineHeight) / 2;
    for (const l of lines) {
        ctx.fillText(l, centerX, y);
        y += lineHeight;
    }
}
