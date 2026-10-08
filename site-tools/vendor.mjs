import { copyFileSync, mkdirSync } from "node:fs";
const out = new URL("../site/vendor/", import.meta.url);
mkdirSync(out, { recursive: true });
const files = [
  ["gsap/dist/gsap.min.js", "gsap.min.js"],
  ["gsap/dist/ScrollTrigger.min.js", "ScrollTrigger.min.js"],
  ["gsap/dist/DrawSVGPlugin.min.js", "DrawSVGPlugin.min.js"],
  ["lenis/dist/lenis.min.js", "lenis.min.js"],
  ["lenis/dist/lenis.css", "lenis.css"],
  ["lenis/LICENSE", "LICENSE-lenis.txt"],
];
for (const [src, dst] of files) {
  copyFileSync(new URL(`./node_modules/${src}`, import.meta.url), new URL(dst, out));
}
