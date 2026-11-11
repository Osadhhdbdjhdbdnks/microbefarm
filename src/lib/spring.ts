/** Damped spring physics and easing helpers shared by animated components. */

export type Spring = { value: number; velocity: number };

export const newSpring = (): Spring => ({ value: 0, velocity: 0 });

/**
 * Advance a spring toward `target` with the given stiffness, using an
 * externally supplied damping ratio and a fixed-timestep delta in seconds.
 * Snaps to the target once motion becomes negligible.
 */
export const stepSpring = (
  s: Spring,
  target: number,
  stiff: number,
  dt: number,
  damping: number,
) => {
  s.velocity += ((target - s.value) * stiff - s.velocity * damping) * dt;
  s.value += s.velocity * dt;
  if (Math.abs(s.velocity) < 0.001 && Math.abs(target - s.value) < 0.001) {
    s.value = target;
    s.velocity = 0;
  }
};

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Symmetric 0→1→0 cycle curve over the normalized progress `p`. */
export const smoothCycle = (p: number) => {
  const x = p % 1;
  return x < 0.5
    ? 0.5 * (1 - Math.cos(Math.PI * x))
    : 0.5 * (1 + Math.cos(Math.PI * x));
};

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
