// Picsum returns consistently high-quality photos. Fixed seeds -> fixed URLs,
// browser-cacheable and reproducible (subject is random, not topic-locked).
const SEEDS = [
  'aurora',
  'summit',
  'valley',
  'river',
  'canyon',
  'meadow',
  'glacier',
  'dune',
  'coast',
  'lake',
  'fjord',
  'grove',
  'ridge',
  'tundra',
  'cascade',
  'crater',
] as const;

// Image dimensions: high enough that the enlarged hero card stays crisp.
const WIDTH = 1200;
const HEIGHT = 1500;

export interface CarouselImage {
  id: string;
  url: string;
}

export const IMAGES: CarouselImage[] = SEEDS.map((seed) => ({
  id: seed,
  url: `https://picsum.photos/seed/${seed}/${WIDTH}/${HEIGHT}`,
}));

export const IMAGE_COUNT = IMAGES.length;
