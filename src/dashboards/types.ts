import type { Frame } from './draw';

export interface Dashboard {
  id: string;
  title: string;
  /** True for panels that keep moving while idle — re-rendered on ticks. */
  live?: boolean;
  /** Theme tags for the filter chips; assigned from TAGS_BY_ID. */
  tags?: string[];
  draw: (f: Frame) => void;
}

/**
 * Time fed into the one-shot idle render: far past every intro, so panels
 * show a settled chart until a hover replays the animation from 0.
 */
export const SETTLED_T = 9.7;
