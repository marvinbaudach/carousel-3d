// Cross-platform haptic tick for swipe detents and commits.
//
// Android (Chrome et al.) exposes the Vibration API. iOS Safari never
// implemented it, but since iOS 17.4 toggling an <input type="checkbox"
// switch> via a programmatic label click fires the native switch haptic —
// the same trick the `ios-haptics` npm package uses. The switch lives
// hidden in the DOM and gets clicked instead of vibrated.

let switchLabel: HTMLLabelElement | null = null;

function ensureSwitch(): HTMLLabelElement {
  if (switchLabel) return switchLabel;
  const label = document.createElement('label');
  // Visually hidden but not display:none — Safari skips the haptic for
  // elements removed from rendering entirely.
  label.style.cssText =
    'position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);pointer-events:none;opacity:0';
  label.setAttribute('aria-hidden', 'true');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', ''); // Safari's switch control — the haptic source
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  switchLabel = label;
  return label;
}

/** Fire a light haptic tick (Android vibration or iOS switch haptic). */
export function hapticTick() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(8);
    return;
  }
  // iOS path: only bother where the switch haptic can exist (touch devices).
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  try {
    ensureSwitch().click();
  } catch {
    // No haptics available — the tick is purely additive feedback.
  }
}
