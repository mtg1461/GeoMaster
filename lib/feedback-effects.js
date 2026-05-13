(function () {
window.GeoMaster = window.GeoMaster || {};

let feedbackTimeout = 0;
let confettiTimeout = 0;
let trimTimeout = 0;

function clearFeedbackFx(container) {
  if (!container) {
    return;
  }

  if (feedbackTimeout) {
    window.clearTimeout(feedbackTimeout);
    feedbackTimeout = 0;
  }

  if (confettiTimeout) {
    window.clearTimeout(confettiTimeout);
    confettiTimeout = 0;
  }

  if (trimTimeout) {
    window.clearTimeout(trimTimeout);
    trimTimeout = 0;
  }

  container.replaceChildren();
  container.classList.remove("is-correct", "is-wrong");
  container.closest(".game-hud")?.classList.remove("feedback-correct", "feedback-wrong");
  trimConfettiCanvases();
}

function trimConfettiCanvases() {
  document.querySelectorAll("canvas").forEach((canvas) => {
    if (canvas.style.zIndex !== "999999999" || canvas.style.pointerEvents !== "none") {
      return;
    }

    canvas.style.transition = "opacity 160ms ease";
    canvas.style.opacity = "0";
    window.setTimeout(() => canvas.remove(), 180);
  });
}

function playCorrectFx(container) {
  if (!container) {
    return;
  }

  clearFeedbackFx(container);
  if (typeof window.confetti === "function") {
    window.confetti({
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      count: 70,
      size: 1.15,
      velocity: 190,
      fade: true,
    });

    confettiTimeout = window.setTimeout(() => {
      confettiTimeout = 0;
      window.confetti({
        position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        count: 24,
        size: 0.8,
        velocity: 145,
        fade: true,
      });
    }, 80);

    trimTimeout = window.setTimeout(() => {
      trimTimeout = 0;
      trimConfettiCanvases();
    }, 620);
  }

  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "100vw";
  container.style.height = "100vh";
  container.style.zIndex = "9999";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.transform = "none";

  const flash = document.createElement("span");
  flash.style.position = "fixed";
  flash.style.inset = "0";
  flash.style.background = "radial-gradient(circle at center, rgba(121, 216, 145, 0.42), rgba(47, 157, 104, 0.18) 28%, transparent 68%)";
  flash.style.animation = "feedback-screen-flash 720ms ease-out forwards";
  container.appendChild(flash);

  const burst = document.createElement("span");
  burst.className = "feedback-burst";
  burst.style.position = "fixed";
  burst.style.left = "50%";
  burst.style.top = "50%";
  burst.style.zIndex = "1";
  container.appendChild(burst);

  const pieceCount = 24;

  for (let index = 0; index < pieceCount; index += 1) {
    const piece = document.createElement("span");
    const angle = (360 / pieceCount) * index + (index % 3) * 5;
    const distance = 150 + (index % 5) * 24;

    piece.className = "confetti-piece";
    piece.style.position = "fixed";
    piece.style.left = "50%";
    piece.style.top = "50%";
    piece.style.zIndex = "2";
    piece.style.setProperty("--angle", `${angle}deg`);
    piece.style.setProperty("--distance", `${distance}px`);
    piece.style.setProperty("--spin", `${index % 2 === 0 ? 120 : -120}deg`);
    piece.style.setProperty("--piece-color", ["#79d891", "#2f9d68", "#c4ffdb", "#f2c94c"][index % 4]);
    container.appendChild(piece);
  }

  container.classList.add("is-correct");
  container.closest(".game-hud")?.classList.add("feedback-correct");
  feedbackTimeout = window.setTimeout(() => {
    feedbackTimeout = 0;
    clearFeedbackFx(container);
  }, 680);
}

function playWrongFx(container) {
  if (!container) {
    return;
  }

  clearFeedbackFx(container);
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "100vw";
  container.style.height = "100vh";
  container.style.zIndex = "9999";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.transform = "none";

  const flash = document.createElement("span");
  flash.style.position = "fixed";
  flash.style.inset = "0";
  flash.style.background = "radial-gradient(circle at center, rgba(200, 71, 62, 0.42), rgba(140, 18, 28, 0.2) 30%, transparent 68%)";
  flash.style.animation = "feedback-screen-flash 620ms ease-out forwards";
  container.appendChild(flash);

  for (let index = 0; index < 2; index += 1) {
    const ring = document.createElement("span");
    ring.className = "wrong-ring";
    ring.style.position = "fixed";
    ring.style.left = "50%";
    ring.style.top = "50%";
    ring.style.zIndex = "2";
    ring.style.setProperty("--ring-delay", `${index * 70}ms`);
    container.appendChild(ring);
  }

  container.classList.add("is-wrong");
  container.closest(".game-hud")?.classList.add("feedback-wrong");
  feedbackTimeout = window.setTimeout(() => {
    feedbackTimeout = 0;
    clearFeedbackFx(container);
  }, 680);
}

window.GeoMaster.feedbackEffects = {
  clearFeedbackFx,
  playCorrectFx,
  playWrongFx,
};
})();
