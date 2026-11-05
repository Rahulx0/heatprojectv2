const canvas = document.querySelector("#love-heart");
const ctx = canvas.getContext("2d", { alpha: false });
const pauseButton = document.querySelector("#pause-button");
const replayButton = document.querySelector("#replay-button");

const PHRASES = [
  "I love you",
  "Seni seviyorum",
  "Te amo",
  "Je t'aime",
  "Ich liebe dich",
  "Ti amo",
  "Eu te amo",
  "Я тебя люблю",
  "사랑해",
  "愛してる",
  "我愛你",
  "मैं तुमसे प्यार करता हूँ",
  "Σ' αγαπώ",
  "Anh yêu em",
  "Aku cinta kamu",
  "Kocham cię",
  "Jag älskar dig",
  "أحبك",
  "Mahal kita",
  "Nakupenda"
];

const COLORS = {
  background: "#000000",
  text: "#ff6258",
  glow: "rgba(255, 70, 60, 0.58)"
};

const TOTAL_DURATION = 16_200;
const INTRO_DURATION = 760;
const OUTLINE_DURATION = 7_000;
const FADE_DURATION = 230;
const CURVE_SEGMENTS = 1_200;
const FONT_STACK = 'Arial, "Noto Sans", "Segoe UI", sans-serif';
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let width = 0;
let height = 0;
let pixelRatio = 1;
let composition = [];
let animationStart = performance.now();
let paused = prefersReducedMotion;
let rafId = 0;
let elapsedBeforePause = 0;

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function heartPoint(angle) {
  const x = 16 * Math.sin(angle) ** 3;
  const y = 13 * Math.cos(angle)
    - 5 * Math.cos(2 * angle)
    - 2 * Math.cos(3 * angle)
    - Math.cos(4 * angle);
  return { x, y };
}

function getCurve() {
  const points = [];
  for (let index = 0; index <= CURVE_SEGMENTS; index += 1) {
    points.push(heartPoint((index / CURVE_SEGMENTS) * Math.PI * 2));
  }
  return points;
}

function getHorizontalSpan(y, curve) {
  const crossings = [];

  for (let index = 0; index < curve.length - 1; index += 1) {
    const first = curve[index];
    const second = curve[index + 1];
    const crosses = (first.y <= y && second.y > y) || (second.y <= y && first.y > y);
    if (!crosses) continue;

    const ratio = (y - first.y) / (second.y - first.y);
    crossings.push(first.x + ratio * (second.x - first.x));
  }

  if (crossings.length < 2) return null;
  return { left: Math.min(...crossings), right: Math.max(...crossings) };
}

function makeComposition() {
  const random = mulberry32(11);
  const curve = getCurve();
  const minY = Math.min(...curve.map((point) => point.y));
  const maxY = Math.max(...curve.map((point) => point.y));

  const scaleX = Math.min((width * 0.82) / 32, (height * 0.73) / 22);
  const scaleY = scaleX;
  const centerY = (minY + maxY) / 2;
  const fontSize = clamp(scaleX * 0.73, 10.5, 17);
  const rowStep = (fontSize * 1.47) / scaleY;
  const edgeBand = Math.max(fontSize * 2.15, 38);
  const allEntries = [];

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let rowIndex = 0;
  for (let localY = maxY - rowStep * 0.45; localY > minY + rowStep * 0.4; localY -= rowStep) {
    const span = getHorizontalSpan(localY, curve);
    if (!span) continue;

    const y = height / 2 - (localY - centerY) * scaleY;
    const left = width / 2 + span.left * scaleX;
    const right = width / 2 + span.right * scaleX;
    const rowEntries = [];
    let x = left + 1;
    let phraseIndex = Math.floor(random() * PHRASES.length);
    let attempts = 0;

    while (x < right - fontSize * 1.4 && attempts < 160) {
      attempts += 1;
      const variation = 0.94 + random() * 0.12;
      const size = fontSize * variation;
      const phrase = PHRASES[phraseIndex % PHRASES.length];
      ctx.font = `700 ${size}px ${FONT_STACK}`;
      const measured = ctx.measureText(phrase).width;
      const gap = size * (0.31 + random() * 0.19);

      if (x + measured <= right + 1) {
        const entry = {
          text: phrase,
          x,
          y: y + (random() - 0.5) * 1.6,
          size,
          width: measured,
          row: rowIndex,
          localY,
          centerDistance: Math.abs(localY - centerY),
          leftDistance: x - left,
          rightDistance: right - (x + measured),
          jitter: random()
        };
        rowEntries.push(entry);
        allEntries.push(entry);
        x += measured + gap;
      } else if (rowEntries.length === 0) {
        phraseIndex += 1;
      } else {
        break;
      }
      phraseIndex += 1 + Math.floor(random() * 3);
    }

    rowIndex += 1;
  }

  const centerCandidates = allEntries
    .filter((entry) => Math.abs(entry.localY - centerY) < rowStep * 3.5)
    .sort((a, b) => {
      const aDistance = Math.abs(a.x + a.width / 2 - width / 2) + Math.abs(a.localY - centerY) * scaleY;
      const bDistance = Math.abs(b.x + b.width / 2 - width / 2) + Math.abs(b.localY - centerY) * scaleY;
      return aDistance - bDistance;
    });

  const introEntries = centerCandidates.slice(0, 9);
  const introSet = new Set(introEntries);

  const outlineEntries = [];
  const fillEntries = [];

  for (const entry of allEntries) {
    if (introSet.has(entry)) continue;
    const isEdge = entry.leftDistance < edgeBand || entry.rightDistance < edgeBand;
    (isEdge ? outlineEntries : fillEntries).push(entry);
  }

  outlineEntries.sort((a, b) => {
    const rowDifference = a.centerDistance - b.centerDistance;
    if (Math.abs(rowDifference) > 0.35) return rowDifference;
    return a.jitter - b.jitter;
  });

  const shuffle = (items) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
  };
  shuffle(fillEntries);

  const borderStart = INTRO_DURATION;
  const fillStart = borderStart + OUTLINE_DURATION;
  const borderStep = outlineEntries.length ? OUTLINE_DURATION / outlineEntries.length : 0;
  const fillDuration = TOTAL_DURATION - fillStart;
  const fillStep = fillEntries.length ? fillDuration / fillEntries.length : 0;

  introEntries.forEach((entry, index) => {
    entry.startAt = index * (INTRO_DURATION * 0.62 / Math.max(1, introEntries.length - 1));
    entry.phase = "intro";
  });

  outlineEntries.forEach((entry, index) => {
    entry.startAt = borderStart + index * borderStep;
    entry.phase = "outline";
  });

  fillEntries.forEach((entry, index) => {
    entry.startAt = fillStart + index * fillStep;
    entry.phase = "fill";
  });

  composition = [...introEntries, ...outlineEntries, ...fillEntries];
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  makeComposition();
  render(getElapsed());
}

function getElapsed() {
  if (paused) return elapsedBeforePause;
  return Math.max(0, performance.now() - animationStart);
}

function smoothStep(value) {
  const amount = clamp(value, 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function render(elapsed) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  for (const entry of composition) {
    if (elapsed < entry.startAt) continue;

    const progress = smoothStep((elapsed - entry.startAt) / FADE_DURATION);
    if (progress <= 0) continue;

    const drift = (1 - progress) * (entry.phase === "intro" ? 3 : 5);
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.font = `700 ${entry.size}px ${FONT_STACK}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.text;
    ctx.shadowColor = COLORS.glow;
    ctx.shadowBlur = 7 * progress;
    ctx.fillText(entry.text, entry.x, entry.y + drift);
    ctx.restore();
  }
}

function tick(now) {
  if (paused) return;
  const elapsed = now - animationStart;
  render(elapsed);

  if (elapsed < TOTAL_DURATION + FADE_DURATION) {
    rafId = requestAnimationFrame(tick);
  } else {
    render(TOTAL_DURATION + FADE_DURATION);
    rafId = 0;
  }
}

function replay() {
  cancelAnimationFrame(rafId);
  elapsedBeforePause = 0;
  animationStart = performance.now();
  paused = false;
  pauseButton.classList.remove("is-paused");
  pauseButton.setAttribute("aria-label", "Pause animation");
  pauseButton.title = "Pause animation";
  rafId = requestAnimationFrame(tick);
}

function togglePause() {
  if (paused) {
    animationStart = performance.now() - elapsedBeforePause;
    paused = false;
    pauseButton.classList.remove("is-paused");
    pauseButton.setAttribute("aria-label", "Pause animation");
    pauseButton.title = "Pause animation";
    rafId = requestAnimationFrame(tick);
    return;
  }

  elapsedBeforePause = performance.now() - animationStart;
  paused = true;
  cancelAnimationFrame(rafId);
  pauseButton.classList.add("is-paused");
  pauseButton.setAttribute("aria-label", "Resume animation");
  pauseButton.title = "Resume animation";
}

pauseButton.addEventListener("click", togglePause);
replayButton.addEventListener("click", replay);
window.addEventListener("resize", resizeCanvas, { passive: true });
window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r") replay();
  if (event.code === "Space" && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault();
    togglePause();
  }
});

resizeCanvas();
if (prefersReducedMotion) {
  elapsedBeforePause = TOTAL_DURATION + FADE_DURATION;
  render(elapsedBeforePause);
  pauseButton.classList.add("is-paused");
  pauseButton.setAttribute("aria-label", "Resume animation");
  pauseButton.title = "Resume animation";
} else {
  rafId = requestAnimationFrame(tick);
}
