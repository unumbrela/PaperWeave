/**
 * Pure pointer-tilt math shared by the tool cards and the core-flow stations.
 * No hooks/refs here — each component keeps its own local ref (the lint-clean
 * pattern) and just feeds the element + cursor position in. The `.tilt` CSS
 * family (see globals.css) turns these custom properties into the rotation +
 * radial bloom.
 */

const MAX_TILT = 7; // degrees

/** Write tilt rotation + cursor glow from a pointer position onto `el`. */
export function writeTilt(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  lift: number,
  glow: number,
) {
  const rect = el.getBoundingClientRect();
  const px = (clientX - rect.left) / rect.width; // 0–1
  const py = (clientY - rect.top) / rect.height; // 0–1
  el.style.setProperty("--tilt-y", `${(px - 0.5) * 2 * MAX_TILT}deg`);
  el.style.setProperty("--tilt-x", `${-(py - 0.5) * 2 * MAX_TILT}deg`);
  el.style.setProperty("--tilt-lift", `${lift}px`);
  el.style.setProperty("--glow-x", `${px * 100}%`);
  el.style.setProperty("--glow-y", `${py * 100}%`);
  el.style.setProperty("--glow-o", String(glow));
}

/** Reset tilt + glow back to rest. */
export function clearTilt(el: HTMLElement) {
  el.style.setProperty("--tilt-x", "0deg");
  el.style.setProperty("--tilt-y", "0deg");
  el.style.setProperty("--tilt-lift", "0px");
  el.style.setProperty("--glow-o", "0");
}
