"use strict";

const copyButton = document.querySelector("#copy-citation");
const status = document.querySelector("#copy-status");
copyButton.addEventListener("click", async () => {
  const citation = document.querySelector("#bibtex").textContent.trim();
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(citation);
    status.textContent = "Citation copied to clipboard.";
    copyButton.textContent = "Copied!";
    window.setTimeout(() => { copyButton.textContent = "Copy citation"; }, 2200);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector("#bibtex"));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = "Citation selected. Press Ctrl+C (Windows/Linux) or ⌘C (Mac) to copy, or download the .bib file.";
  }
});

// Link native controls on a shared elapsed-time axis. Shorter clips hold their
// final frame; neither clip loops until both have finished.
function createComparisonController(pair) {
  const videos = [...pair.querySelectorAll("video[data-demo]")];
  let requested = false;
  let preparing = false;
  let generation = 0;
  let pendingLoad;
  const internalPlay = new WeakSet();
  const internalPause = new WeakSet();
  const internalSeek = new WeakSet();

  const duration = video => Number.isFinite(video.duration) ? video.duration : 0;
  const clock = () => videos.reduce((a, b) => duration(a) >= duration(b) ? a : b);
  const pauseVideo = video => {
    if (!video.paused) {
      internalPause.add(video);
      video.pause();
    }
  };
  const pause = () => {
    requested = false;
    preparing = false;
    generation += 1;
    pendingLoad?.abort();
    videos.forEach(pauseVideo);
    pair.removeAttribute("aria-busy");
  };
  const ready = (video, signal) => {
    const hasFrame = () => !video.error && !video.seeking && (video.readyState >= 3 ||
      (video.readyState >= 2 && duration(video) > 0 && video.currentTime >= duration(video) - 0.04));
    if (hasFrame()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("canplay", loaded);
        video.removeEventListener("seeked", loaded);
        video.removeEventListener("error", failed);
        signal.removeEventListener("abort", cancelled);
      };
      const loaded = () => {
        if (hasFrame()) { cleanup(); resolve(); }
      };
      const failed = () => { cleanup(); reject(new Error("Video unavailable")); };
      const cancelled = () => { cleanup(); reject(new Error("Playback cancelled")); };
      video.addEventListener("canplay", loaded);
      video.addEventListener("seeked", loaded);
      video.addEventListener("error", failed);
      signal.addEventListener("abort", cancelled, { once: true });
      video.preload = "auto";
      if (!video.readyState || video.error) video.load();
    });
  };
  const align = position => {
    videos.forEach(video => {
      const target = Math.min(position, duration(video));
      if (Math.abs(video.currentTime - target) > 0.04) {
        internalSeek.add(video);
        video.currentTime = target;
      }
    });
  };
  const play = async ({ restart = false, position } = {}) => {
    const request = ++generation;
    pendingLoad?.abort();
    pendingLoad = new AbortController();
    requested = true;
    preparing = true;
    videos.forEach(pauseVideo);
    pair.setAttribute("aria-busy", "true");
    try {
      await Promise.all(videos.map(video => ready(video, pendingLoad.signal)));
      if (request !== generation) return;
      const leader = clock();
      const finished = position === undefined && leader.currentTime >= duration(leader) - 0.04;
      const target = restart || finished ? 0 : position ?? leader.currentTime;
      align(target);
      await Promise.all(videos.map(video => ready(video, pendingLoad.signal)));
      if (request !== generation) return;
      // Issue both play requests in the same turn, after both clips are ready.
      await Promise.all(videos.filter(video => target < duration(video) - 0.04).map(video => {
        internalPlay.add(video);
        return video.play().finally(() => internalPlay.delete(video));
      }));
      if (request !== generation) return;
      preparing = false;
      pair.removeAttribute("aria-busy");
    } catch {
      if (request !== generation) return;
      pause();
    }
  };

  videos.forEach(video => {
    video.loop = false;
    video.muted = true;
    video.addEventListener("play", () => {
      if (!video.paused && !internalPlay.has(video)) play({ position: video.currentTime });
    });
    video.addEventListener("pause", () => {
      if (internalPause.delete(video) || video.ended) return;
      pause();
    });
    video.addEventListener("seeking", () => {
      if (internalSeek.has(video)) return;
      if (requested || !video.paused) play({ position: video.currentTime });
      else { pause(); align(video.currentTime); }
    });
    video.addEventListener("seeked", () => internalSeek.delete(video));
    video.addEventListener("ratechange", () => {
      videos.forEach(peer => {
        if (peer.playbackRate !== video.playbackRate) peer.playbackRate = video.playbackRate;
      });
    });
    video.addEventListener("waiting", () => {
      if (requested && !preparing && !video.ended) play();
    });
    video.addEventListener("ended", () => {
      if (requested && !preparing && videos.every(clip => clip.currentTime >= duration(clip) - 0.04)) play({ restart: true });
    });
    video.addEventListener("error", () => {
      if (requested && !preparing) {
        pause();
      }
    });
  });
  return { element: pair, videos, play, pause };
}

// Observe comparisons as a pair, so individual visibility cannot pause one side.
const demoVideos = [...document.querySelectorAll("video[data-demo]")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const supplementaryVideo = document.querySelector(".coopuq-supplementary");
const comparisons = [...document.querySelectorAll(".comparison-pair")].map(createComparisonController);
const pairControllers = new Map(comparisons.map(controller => [controller.element, controller]));
const pairedVideos = new Set(comparisons.flatMap(controller => controller.videos));
const pauseDemos = () => {
  comparisons.forEach(controller => controller.pause());
  demoVideos.filter(video => !pairedVideos.has(video)).forEach(video => video.pause());
};
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      const shouldPlay = isIntersecting && !reducedMotion.matches && supplementaryVideo.paused && !document.hidden;
      const comparison = pairControllers.get(target);
      if (comparison) {
        if (shouldPlay) comparison.play();
        else comparison.pause();
      } else if (shouldPlay) {
        target.play().catch(() => { /* Native controls remain available. */ });
      } else {
        target.pause();
      }
    });
  }, { threshold: 0.35 });
  demoVideos.filter(video => !pairedVideos.has(video)).forEach(video => observer.observe(video));
  comparisons.forEach(controller => observer.observe(controller.element));
}
supplementaryVideo.addEventListener("play", pauseDemos);
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) pauseDemos();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseDemos();
});

// Keep the template's scroll control, including reduced-motion support.
const scrollButton = document.querySelector("#scroll-to-top");
const updateScrollButton = () => {
  scrollButton.classList.toggle("visible", window.scrollY > 300);
};
window.addEventListener("scroll", updateScrollButton, { passive: true });
scrollButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
});
updateScrollButton();
