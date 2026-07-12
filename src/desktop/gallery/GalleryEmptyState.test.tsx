import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as i18n from '../../i18n';
import { GalleryEmptyState } from './GalleryEmptyState';

// The gallery grid silently rendered nothing when a search/category combination
// matched zero cards. The empty state must say so, echo what was filtered, and
// offer a one-click way back.

beforeEach(async () => {
  await i18n.setLocale('de');
});

afterEach(() => {
  cleanup();
});

describe('GalleryEmptyState', () => {
  it('announces that no cards were found', () => {
    render(<GalleryEmptyState query="qqq" categoryLabel={undefined} onReset={vi.fn()} />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Keine Karten gefunden')).toBeTruthy();
  });

  it('echoes the active query and category', () => {
    render(<GalleryEmptyState query="klima" categoryLabel="GESUNDHEIT" onReset={vi.fn()} />);
    const hint = screen.getByText(/Kein Treffer für/);
    expect(hint.textContent).toContain('„klima“');
    expect(hint.textContent).toContain('gesundheit');
  });

  it('omits the hint line when nothing is filtered', () => {
    render(<GalleryEmptyState query="" categoryLabel={undefined} onReset={vi.fn()} />);
    expect(screen.queryByText(/Kein Treffer für/)).toBeNull();
  });

  it('resets the filters on click', () => {
    const onReset = vi.fn();
    render(<GalleryEmptyState query="qqq" categoryLabel={undefined} onReset={onReset} />);
    fireEvent.click(screen.getByRole('button', { name: /Filter zurücksetzen/ }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('translates its copy when the locale switches', async () => {
    await i18n.setLocale('en');
    render(<GalleryEmptyState query="qqq" categoryLabel={undefined} onReset={vi.fn()} />);
    expect(screen.getByText('No cards found')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reset filters/ })).toBeTruthy();
  });
});
