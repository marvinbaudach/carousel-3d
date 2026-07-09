// A dependency-free stand-in for CanvasRenderingContext2D. jsdom ships no 2D
// canvas and node-canvas is a heavy native build we don't want in CI, so the
// card smoke test draws into this recording stub instead. Every method the
// renderers actually call (see `grep 'ctx\.' src`) is present and side-effect
// free; the handful that must return a value — measureText, the gradients,
// getImageData — return valid shapes so wrapping/hit-test code paths still run.
// If a renderer ever reaches for a method we don't stub, `draw()` throws, and
// the smoke test surfaces that as a failure — which keeps this stub honest.

interface FakeGradient {
  addColorStop(offset: number, color: string): void;
}

const gradient: FakeGradient = { addColorStop() {} };

/** Records the name of every drawing call, for optional "did it draw anything"
    assertions on top of the "did it throw" contract. */
export interface Recorder {
  calls: string[];
}

export function createFakeContext(width = 512, height = 640): CanvasRenderingContext2D & Recorder {
  const calls: string[] = [];
  const noop = (name: string) => (): void => void calls.push(name);

  const ctx = {
    canvas: { width, height },
    calls,

    // Mutable drawing state the renderers assign to. Kept as plain fields so
    // reads-after-write behave; the values themselves are never inspected.
    fillStyle: '#000' as string | CanvasGradient,
    strokeStyle: '#000' as string | CanvasGradient,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: 'transparent',

    // Path + state (no-ops).
    save: noop('save'),
    restore: noop('restore'),
    beginPath: noop('beginPath'),
    closePath: noop('closePath'),
    moveTo: noop('moveTo'),
    lineTo: noop('lineTo'),
    arc: noop('arc'),
    rect: noop('rect'),
    roundRect: noop('roundRect'),
    clip: noop('clip'),
    fill: noop('fill'),
    stroke: noop('stroke'),
    fillRect: noop('fillRect'),
    strokeRect: noop('strokeRect'),
    clearRect: noop('clearRect'),
    fillText: noop('fillText'),
    strokeText: noop('strokeText'),
    setLineDash: noop('setLineDash'),
    setTransform: noop('setTransform'),
    translate: noop('translate'),
    rotate: noop('rotate'),
    scale: noop('scale'),

    // Value-returning methods.
    createLinearGradient(): FakeGradient {
      calls.push('createLinearGradient');
      return gradient;
    },
    createRadialGradient(): FakeGradient {
      calls.push('createRadialGradient');
      return gradient;
    },
    measureText(text: string): TextMetrics {
      calls.push('measureText');
      // A plausible width (~6px/char at the stub's reference) so the eyebrow's
      // wrap-onto-two-lines branch is actually exercised for long titles.
      return { width: String(text).length * 6 } as TextMetrics;
    },
    getImageData(_x: number, _y: number, w = 1, h = 1): ImageData {
      calls.push('getImageData');
      const cw = Math.max(1, Math.floor(w));
      const ch = Math.max(1, Math.floor(h));
      return { data: new Uint8ClampedArray(cw * ch * 4), width: cw, height: ch } as ImageData;
    },
  };

  return ctx as unknown as CanvasRenderingContext2D & Recorder;
}
