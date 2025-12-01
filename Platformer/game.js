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

// Background (edit these)
const BACKGROUND_COLOR = '#1f2140'; // change color here
const BACKGROUND_IMAGE = 'background.png'; // e.g. 'stars.png' placed in Platformer/, or keep null
const bgImg = new Image();
let bgLoaded = false;
if (BACKGROUND_IMAGE) {
    bgImg.src = BACKGROUND_IMAGE;
    bgImg.onload = () => { bgLoaded = true; };
}
// Optional goal image (set a filename or leave null to use pink box)
const GOAL_IMAGE = 'garchomp.png'; // e.g. 'heart_goal.png'
const GOAL_IMAGE_SCALE = 0.9; // 0-1, fit image inside goal box with padding
const goalImg = new Image();
let goalLoaded = false;
if (GOAL_IMAGE) {
    goalImg.src = GOAL_IMAGE;
    goalImg.onload = () => { goalLoaded = true; };
}
// Frame counter (for timed traps)
let frameCount = 0;
// Physics
const gravity = 0.7;
const moveSpeed = 3.0;
const maxSpeedX = 3.5; // slower top speed
const jumpStrength = 13.0; // a touch stronger for bigger sprite

// Player
const player = {
    x: 60,
    y: 0,
    w: 36, // bigger cat
    h: 48, // bigger cat
    vx: 0,
    vy: 0,
    onGround: false
};

// Player sprite (change path if you move the image)
const girlImg = new Image();
girlImg.src = 'black_cat.png';
let girlImgLoaded = false;
let girlSpriteCrop = null; // computed visible bounds (auto-trim)
girlImg.onload = () => {
    girlImgLoaded = true;
    girlSpriteCrop = computeSpriteVisibleBounds(girlImg);
};

// Player hazard hitbox padding (shrink edges for fair collisions)
const PLAYER_HAZARD_PAD_X = 6;
const PLAYER_HAZARD_PAD_Y = 6;

// Levels
const levels = [
    // Level 1: simple ground and small gap
    {
        start: { x: 60, y: 300 },
        goal: { x: 740, y: 260, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 200, h: 70 },
            { x: 400, y: 380, w: 400, h: 70 },
            { x: 280, y: 320, w: 100, h: 24 },
            { x: 450, y: 300, w: 100, h: 24 }
        ],
        obstacles: {
            spikes: [
                { x: 360, y: 360, w: 60, h: 20 }
            ],
            patrols: [],
            timedSpikes: [
                { x: 520, y: 360, w: 60, h: 20, period: 120, up: 70, phase: 0 }
            ]
        }
    },
    // Level 2: step ups
    {
        start: { x: 40, y: 340 },
        goal: { x: 740, y: 200, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 800, h: 70 },
            { x: 170, y: 330, w: 95, h: 24 },
            { x: 335, y: 290, w: 95, h: 24 },
            { x: 500, y: 250, w: 95, h: 24 },
            { x: 660, y: 220, w: 95, h: 24 }
        ],
        obstacles: {
            spikes: [
                { x: 230, y: 360, w: 80, h: 20 },
                { x: 520, y: 360, w: 80, h: 20 }
            ],
            patrols: [
                { x: 180, y: 312, w: 28, h: 18, minX: 170, maxX: 265, speed: 1.1, dir: 1 }
            ],
            timedSpikes: [
                { x: 170, y: 330 - 16, w: 95, h: 16, period: 180, up: 60, phase: 0 },
                { x: 335, y: 290 - 16, w: 95, h: 16, period: 180, up: 60, phase: 45 },
                { x: 500, y: 250 - 16, w: 95, h: 16, period: 180, up: 60, phase: 90 },
                { x: 660, y: 220 - 16, w: 95, h: 16, period: 180, up: 60, phase: 135 }
            ]
        }
    },
    // Level 3: moving across spaced plats
    {
        start: { x: 40, y: 260 },
        goal: { x: 730, y: 120, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 800, h: 70 },
            { x: 100, y: 300, w: 105, h: 22 },
            { x: 235, y: 260, w: 105, h: 22 },
            { x: 370, y: 220, w: 105, h: 22 },
            { x: 505, y: 180, w: 105, h: 22 },
            { x: 640, y: 150, w: 115, h: 22 }
        ],
        obstacles: {
            spikes: [
                { x: 300, y: 360, w: 80, h: 20 }
            ],
            patrols: [
                { x: 160, y: 360, w: 28, h: 18, minX: 140, maxX: 660, speed: 1.0, dir: 1 }
            ],
            timedSpikes: [
                { x: 200, y: 360, w: 60, h: 20, period: 90, up: 45, phase: 10 }
            ]
        }
    },
    // Level 4: a pit to jump
    {
        start: { x: 40, y: 300 },
        goal: { x: 730, y: 260, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 300, h: 70 },
            { x: 380, y: 380, w: 420, h: 70 },
            { x: 240, y: 320, w: 110, h: 24 },
            { x: 500, y: 320, w: 110, h: 24 }
        ],
        obstacles: {
            spikes: [
                { x: 310, y: 360, w: 80, h: 20 }
            ],
            patrols: [
                { x: 240, y: 300, w: 24, h: 20, minX: 240, maxX: 610, speed: 1.2, dir: 1 }
            ],
            timedSpikes: [
                { x: 440, y: 360, w: 60, h: 20, period: 80, up: 40, phase: 0 }
            ]
        }
    },
    // Level 5: finale
    {
        start: { x: 40, y: 320 },
        goal: { x: 740, y: 80, w: 24, h: 24 },
        platforms: [
            { x: 0, y: 380, w: 800, h: 70 },
            { x: 130, y: 340, w: 110, h: 22 },
            { x: 290, y: 300, w: 110, h: 22 },
            { x: 450, y: 260, w: 110, h: 22 },
            { x: 610, y: 220, w: 130, h: 22 },
            { x: 515, y: 160, w: 95, h: 22 }
        ],
        obstacles: {
            spikes: [
                { x: 360, y: 360, w: 100, h: 20 }
            ],
            patrols: [
                { x: 470, y: 240, w: 24, h: 20, minX: 470, maxX: 740, speed: 1.4, dir: 1 }
            ],
            timedSpikes: [
                { x: 680, y: 360, w: 60, h: 20, period: 70, up: 35, phase: 15 }
            ]
        }
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

// Final message after last level (customize this)
const finalMessage = 'We reached the end, but my love for you never does. ♥';

// Simple message/overlay state
let mode = 'playing'; // 'playing' | 'message' | 'final'
let messageText = '';
let pendingNextLevelIndex = null;

function showLevelCompleteMessage(text, nextIndex) {
    mode = 'message';
    messageText = text || 'Level complete!';
    pendingNextLevelIndex = nextIndex;
}

function showFinalMessage(text) {
    mode = 'final';
    messageText = text || finalMessage;
    pendingNextLevelIndex = 0; // restart index
}

function advanceMessage() {
    if (mode === 'message') {
        mode = 'playing';
        if (pendingNextLevelIndex != null) {
            if (pendingNextLevelIndex < levels.length) {
                loadLevel(pendingNextLevelIndex);
            } else {
                loadLevel(0);
            }
        }
        pendingNextLevelIndex = null;
    } else if (mode === 'final') {
        mode = 'playing';
        loadLevel(0);
        pendingNextLevelIndex = null;
    }
}

function loadLevel(i) {
    levelIndex = Math.max(0, Math.min(levels.length - 1, i));
    currentLevel = levels[levelIndex];
    player.x = currentLevel.start.x;
    player.y = currentLevel.start.y;
    player.vx = 0;
    player.vy = 0;
    if (currentLevel.obstacles && Array.isArray(currentLevel.obstacles.patrols)) {
        for (const p of currentLevel.obstacles.patrols) {
            p.dir = p.dir || 1;
        }
    }
    // Ensure obstacles structure
    currentLevel.obstacles = currentLevel.obstacles || {};
    // Snapshot base hazards once to avoid duplication on reload
    if (!currentLevel._baseSpikes) {
        currentLevel._baseSpikes = (currentLevel.obstacles.spikes || []).slice();
    }
    if (!currentLevel._baseTimedSpikes) {
        currentLevel._baseTimedSpikes = (currentLevel.obstacles.timedSpikes || []).slice();
    }
    // Auto-add TIMED spikes above thin platforms for levels 3-5 (indexes 2..4)
    const isAutoSpikeLevel = levelIndex >= 2 && levelIndex <= 4;
    if (isAutoSpikeLevel) {
        // 2x slower cycles for levels 3–5; keep proportional spacing
        let period = 240, up = 72, phaseStep = 56; // level 3 (was 120/36/28)
        if (levelIndex === 3) { period = 240; up = 100; phaseStep = 48; } // level 4 (was 100/50/24)
        if (levelIndex === 4) { period = 240; up = 60; phaseStep = 60; }  // level 5 (was 80/50/20)
        const spikeH = 16;
        const autoTimed = [];
        let idx = 0;
        for (const plat of currentLevel.platforms) {
            // Treat thin platforms as "non-ground": typical thin h <= 30; ground is ~70
            if (plat.h <= 30) {
                // Reverse staggering and widen spacing
                const phase = (period - ((idx * phaseStep) % period)) % period;
                autoTimed.push({
                    x: plat.x,
                    y: plat.y - spikeH,
                    w: plat.w,
                    h: spikeH,
                    period,
                    up,
                    phase
                });
                idx++;
            }
        }
        currentLevel.obstacles.spikes = currentLevel._baseSpikes.slice();
        currentLevel.obstacles.timedSpikes = currentLevel._baseTimedSpikes.concat(autoTimed);
    } else {
        currentLevel.obstacles.spikes = currentLevel._baseSpikes.slice();
        currentLevel.obstacles.timedSpikes = currentLevel._baseTimedSpikes.slice();
    }
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
    if ((mode === 'message' || mode === 'final') && (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp')) {
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
    if (mode !== 'playing') { e.preventDefault(); advanceMessage(); }
}, { passive: false });
canvas.addEventListener('mousedown', () => {
    if (mode !== 'playing') advanceMessage();
});

// Game Loop
function update() {
    if (mode !== 'playing') return;

    const left = keys.ArrowLeft;
    const right = keys.ArrowRight;
    const jump = keys.ArrowUp || keys.Space;

    if (left && !right) player.vx -= 0.4; // slower acceleration
    if (right && !left) player.vx += 0.4; // slower acceleration
    if (!left && !right) player.vx *= 0.8;
    if (player.vx > maxSpeedX) player.vx = maxSpeedX;
    if (player.vx < -maxSpeedX) player.vx = -maxSpeedX;

    if (jump && player.onGround) {
        player.vy = -jumpStrength;
        player.onGround = false;
    }

    player.vy += gravity;

    moveAndCollide(player, currentLevel.platforms);

    // World bounds (opaque walls: left/right/top)
    if (player.x < 0) { player.x = 0; player.vx = 0; }
    if (player.x + player.w > GAME_WIDTH) { player.x = GAME_WIDTH - player.w; player.vx = 0; }
    if (player.y < 0) { player.y = 0; player.vy = 0; }

    // Move patrols
    const obs = currentLevel.obstacles || {};
    const patrols = obs.patrols || [];
    for (const p of patrols) {
        p.x += p.speed * (p.dir || 1);
        if (p.x < p.minX) { p.x = p.minX; p.dir = 1; }
        if (p.x + p.w > p.maxX) { p.x = p.maxX - p.w; p.dir = -1; }
    }

    if (rectsOverlap(player, currentLevel.goal)) {
        const next = levelIndex + 1;
        if (next < levels.length) {
            const msg = levelMessages[levelIndex] || 'Level complete!';
            showLevelCompleteMessage(msg, next);
        } else {
            showFinalMessage(finalMessage);
        }
    }

    // Hazard collisions
    const spikes = obs.spikes || [];
    for (const s of spikes) {
        if (rectsOverlap(getPlayerHazardAABB(), s)) {
            loadLevel(levelIndex);
            return;
        }
    }
    const timedSpikes = obs.timedSpikes || [];
    for (const s of timedSpikes) {
        const period = s.period || 60;
        const up = s.up || 30;
        const phase = s.phase || 0;
        const active = ((frameCount + phase) % period) < up;
        if (active && rectsOverlap(getPlayerHazardAABB(), s)) {
            loadLevel(levelIndex);
            return;
        }
    }
    for (const p of patrols) {
        // expanded hitbox = more deadly
        const pad = 6;
        const pr = getPlayerHazardAABB();
        if (rectsOverlap(pr, { x: p.x - pad, y: p.y - pad, w: p.w + pad * 2, h: p.h + pad * 2 })) {
            loadLevel(levelIndex);
            return;
        }
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
    if (bgLoaded) {
        ctx.drawImage(bgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // platforms
    ctx.fillStyle = '#7bd389';
    for (const p of currentLevel.platforms) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
    }

    // obstacles
    const obs = currentLevel.obstacles || {};
    // static and timed spikes
    for (const s of (obs.spikes || [])) {
        drawSpikeStrip(ctx, s, true);
    }
    for (const s of (obs.timedSpikes || [])) {
        const period = s.period || 60;
        const up = s.up || 30;
        const phase = s.phase || 0;
        const active = ((frameCount + phase) % period) < up;
        if (active) {
            drawSpikeStrip(ctx, s, true);
        }
    }
    ctx.fillStyle = '#ff9f1c';
    for (const m of (obs.patrols || [])) {
        ctx.fillRect(m.x, m.y, m.w, m.h);
    }

    // goal
    const g = currentLevel.goal;
    if (goalLoaded) {
        drawGoalImage(ctx, goalImg, g, GOAL_IMAGE_SCALE);
    } else {
        ctx.fillStyle = '#ff72b6';
        ctx.fillRect(g.x, g.y, g.w, g.h);
    }

    // player (sprite with fallback)
    if (girlImgLoaded) {
        if (girlSpriteCrop) {
            ctx.drawImage(girlImg, girlSpriteCrop.x, girlSpriteCrop.y, girlSpriteCrop.w, girlSpriteCrop.h, player.x, player.y, player.w, player.h);
        } else {
            ctx.drawImage(girlImg, player.x, player.y, player.w, player.h);
        }
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
    } else if (mode === 'final') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = '#ffdde8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '28px system-ui, -apple-system, Arial';
        wrapText(ctx, messageText, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12, 600, 32);
        ctx.font = '14px system-ui, -apple-system, Arial';
        ctx.fillText('Tap to restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 140);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
}

function loop() {
    update();
    draw();
    frameCount++;
    requestAnimationFrame(loop);
}

loop();

// Helpers
function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getPlayerHazardAABB() {
    return {
        x: player.x + PLAYER_HAZARD_PAD_X,
        y: player.y + PLAYER_HAZARD_PAD_Y,
        w: Math.max(2, player.w - 2 * PLAYER_HAZARD_PAD_X),
        h: Math.max(2, player.h - 2 * PLAYER_HAZARD_PAD_Y)
    };
}

function drawSpikeStrip(ctx, r, active) {
    const baseY = r.y + r.h;
    const spikeH = r.h;
    const spikeW = Math.max(8, Math.min(24, r.w / 5));
    ctx.beginPath();
    for (let x = r.x; x < r.x + r.w; x += spikeW) {
        const mid = x + spikeW / 2;
        ctx.moveTo(x, baseY);
        ctx.lineTo(mid, baseY - spikeH);
        ctx.lineTo(x + spikeW, baseY);
    }
    ctx.closePath();
    ctx.fillStyle = active ? '#e63946' : 'rgba(230,57,70,0.35)';
    ctx.fill();
}

function drawGoalImage(ctx, img, goalRect, scale) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) {
        ctx.drawImage(img, goalRect.x, goalRect.y, goalRect.w, goalRect.h);
        return;
    }
    const maxW = goalRect.w * (scale || 1);
    const maxH = goalRect.h * (scale || 1);
    const s = Math.min(maxW / iw, maxH / ih);
    const dw = iw * s;
    const dh = ih * s;
    const dx = goalRect.x + (goalRect.w - dw) / 2;
    const dy = goalRect.y + (goalRect.h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
}

// Compute visible (non-transparent) bounds of an image
function computeSpriteVisibleBounds(img, alphaThreshold = 10) {
    try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return null;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const cctx = c.getContext('2d');
        cctx.drawImage(img, 0, 0);
        const data = cctx.getImageData(0, 0, w, h).data;
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            const row = y * w * 4;
            for (let x = 0; x < w; x++) {
                const i = row + x * 4;
                const a = data[i + 3];
                if (a > alphaThreshold) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX || maxY < minY) return null; // image fully transparent
        return { x: minX, y: minY, w: (maxX - minX + 1), h: (maxY - minY + 1) };
    } catch (_) {
        return null;
    }
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
