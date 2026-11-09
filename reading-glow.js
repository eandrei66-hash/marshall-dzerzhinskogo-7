const readingText = "h1, h2, h3, p, a[href]:not(.skip), summary, th, td";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function animateText(element, delay) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent.trim() && !node.parentElement.closest("[aria-hidden=true]")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  const length = nodes.reduce((total, node) => total + node.textContent.replace(/\s/g, "").length, 0);
  const step = Math.min(48, 1800 / Math.max(1, length));
  let index = 0;
  let lastLetter;

  for (const node of nodes) {
    const original = document.createElement("span");
    original.className = "reading-label";
    original.textContent = node.textContent;

    const visible = document.createElement("span");
    visible.setAttribute("aria-hidden", "true");
    for (const letter of node.textContent) {
      if (/\s/u.test(letter)) {
        visible.append(letter);
        continue;
      }
      const glyph = document.createElement("span");
      glyph.className = "reading-letter";
      glyph.style.setProperty("--glow-delay", `${Math.round(delay + index * step)}ms`);
      glyph.textContent = letter;
      visible.append(glyph);
      lastLetter = glyph;
      index += 1;
    }
    node.replaceWith(original, visible);
  }
  return lastLetter;
}

if (!reducedMotion.matches && "IntersectionObserver" in window) {
  const elements = [...document.querySelectorAll(readingText)]
    .filter((element) => !element.parentElement.closest(readingText));
  const coverTitle = document.querySelector(".cover h1");
  const visible = new Set();
  let reading = false;

  async function readNext() {
    if (reading || reducedMotion.matches) return;
    const next = visible.has(coverTitle) ? coverTitle : elements.find((element) => visible.has(element));
    if (!next) return;

    reading = true;
    visible.delete(next);
    observer.unobserve(next);

    try {
      const lastLetter = animateText(next, next === coverTitle ? 400 : 0);
      const animation = lastLetter?.getAnimations()[0];
      if (animation) await animation.finished;
    } catch (error) {
      if (error.name !== "AbortError") throw error;
    } finally {
      reading = false;
      void readNext();
    }
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.25) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    void readNext();
  }, { threshold: 0.25 });

  for (const element of elements) observer.observe(element);
  reducedMotion.addEventListener("change", readNext);
}
