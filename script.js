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

// DMW-style muted demo grids: visible clips may play together for comparison.
// The full supplementary video retains its own native controls and audio.
const demoVideos = [...document.querySelectorAll("video[data-demo]")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const supplementaryVideo = document.querySelector(".coopuq-supplementary");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting && !reducedMotion.matches && supplementaryVideo.paused) {
        target.play().catch(() => { /* Native controls remain available. */ });
      } else {
        target.pause();
      }
    });
  }, { threshold: 0.35 });
  demoVideos.forEach(video => observer.observe(video));
}
supplementaryVideo.addEventListener("play", () => {
  demoVideos.forEach(video => video.pause());
});
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) demoVideos.forEach(video => video.pause());
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
