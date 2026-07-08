import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { t as tr } from '../i18n';
import type { TAGS } from '../dashboards';
import { glassSurface } from './glass';
import { useDismissOnOutsideTap } from '../hooks/useDismissOnOutsideTap';

interface LayoutControlsProps {
  /** Active theme filter — one chip is always selected. */
  tag: string;
  /** Chips to render (useThemeFilter's visibleTags — FAVORITEN only exists
      once something is starred). */
  tags: typeof TAGS;
  onTagChange: (tag: string) => void;
  /** True while a hero is open — the bar slips away so nothing competes
      with the fullscreen card. */
  hidden: boolean;
}

// Bottom center: HandControls owns the top-left, PerfHud the top-right, the
// HotkeyPanel the bottom-right.
const Wrap = styled.div<{ $hidden: boolean }>`
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translate(-50%, ${(p) => (p.$hidden ? '14px' : '0')});
  opacity: ${(p) => (p.$hidden ? 0 : 1)};
  pointer-events: ${(p) => (p.$hidden ? 'none' : 'auto')};
  z-index: 10;
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
`;

const Bar = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  ${glassSurface}

  /* Phones can't fit every chip on one line, and a wrapped multi-row block
     eats the screen. Keep the single pill row but let it scroll sideways —
     one swipe reaches the rest. Scrollbar hidden; the rounded pill clips it. */
  @media (max-width: 640px) {
    max-width: calc(100vw - 20px);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const Chip = styled.button<{ $active: boolean }>`
  padding: 7px 13px;
  border: none;
  border-radius: 999px;
  flex: 0 0 auto;
  white-space: nowrap;
  background: ${(p) => (p.$active ? 'rgba(57, 135, 229, 0.28)' : 'transparent')};
  color: ${(p) => (p.$active ? '#cfe4ff' : 'rgba(255, 255, 255, 0.55)')};
  font: 600 11px/1 inherit;
  font-family: inherit;
  letter-spacing: 0.14em;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.9);
  }
`;

// Anchor for the popover: the menu positions itself above the MEHR chip.
const MoreAnchor = styled.div`
  position: relative;
  flex: 0 0 auto;
`;

const Menu = styled.div`
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  min-width: 168px;
  padding: 6px;
  border-radius: 14px;
  ${glassSurface}
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: menu-up 0.18s ease;

  @keyframes menu-up {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const MenuItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  border: none;
  border-radius: 9px;
  background: ${(p) => (p.$active ? 'rgba(57, 135, 229, 0.28)' : 'transparent')};
  color: ${(p) => (p.$active ? '#cfe4ff' : 'rgba(255, 255, 255, 0.65)')};
  font: 600 11px/1 inherit;
  font-family: inherit;
  letter-spacing: 0.14em;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.92);
  }
`;

// The theme's accent from the categorical palette — the same hue the scene
// tints toward, so the menu previews the scene change.
const AccentDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: 0 0 auto;
  background: ${(p) => p.$color};
`;

/**
 * Theme-filter chips: the `primary` themes render as always-visible chips,
 * everything else lives in the MEHR popover so the bar keeps a fixed width
 * as the theme list grows. An active overflow theme is pulled into the row
 * as an extra chip, so the current filter is always visible at a glance.
 */
export function LayoutControls({ tag, tags, onTagChange, hidden }: LayoutControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  useDismissOnOutsideTap(menuOpen, 'data-theme-menu', () => setMenuOpen(false));

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const primary = tags.filter((t) => t.primary);
  const overflow = tags.filter((t) => !t.primary);
  const activeOverflow = overflow.find((t) => t.id === tag);
  const row = activeOverflow ? [...primary, activeOverflow] : primary;

  const pick = (id: string) => {
    onTagChange(id);
    setMenuOpen(false);
  };

  return (
    <Wrap $hidden={hidden}>
      <Bar>
        {row.map((t) => (
          <Chip key={t.id} $active={tag === t.id} onClick={() => pick(t.id)}>
            {tr(t.label)}
          </Chip>
        ))}
        {overflow.length > 0 && (
          <MoreAnchor data-theme-menu>
            <Chip
              $active={false}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={tr('Weitere Themen')}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {tr('MEHR')} ▾
            </Chip>
            {menuOpen && (
              <Menu role="menu" aria-label={tr('Weitere Themen')}>
                {overflow.map((t) => (
                  <MenuItem
                    key={t.id}
                    role="menuitem"
                    $active={tag === t.id}
                    onClick={() => pick(t.id)}
                  >
                    <AccentDot $color={t.accent} />
                    {tr(t.label)}
                  </MenuItem>
                ))}
              </Menu>
            )}
          </MoreAnchor>
        )}
      </Bar>
    </Wrap>
  );
}
