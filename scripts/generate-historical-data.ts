import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Deterministic PRNG (mulberry32) so the dataset is reproducible.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260916);

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number): number {
  return rand() * (max - min) + min;
}
function gaussian(mean: number, stdDev: number): number {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}
function clip(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function weightedPick<T>(options: readonly (readonly [T, number])[]): T {
  const total = options.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;
  for (const [value, w] of options) {
    r -= w;
    if (r <= 0) return value;
  }
  return options[options.length - 1][0];
}

const AUDIENCE_TYPES = ["Loyal Customers", "New subscribers", "Custom campaign"] as const;
const INTEREST_CATEGORIES = [
  "culture",
  "sport",
  "food",
  "fashion",
  "technology",
  "travel",
  "music",
  "gaming",
  "healthFitness",
  "finance",
] as const;
const AGE_BUCKETS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;

const CONTENT_TEMPLATES: Record<(typeof INTEREST_CATEGORIES)[number], string[]> = {
  culture: [
    "Get your tickets to the new art exhibition - {discount}% off for members.",
    "Discover the city's hottest theatre premiere, now with a {discount}% early-bird discount.",
    "Museums after dark: join our exclusive evening tour, {discount}% off this week.",
  ],
  sport: [
    "Gear up for the season! {discount}% off sportswear and equipment.",
    "Your local team just won - celebrate with {discount}% off jerseys and gear.",
    "New training season starts now. Get {discount}% off all fitness gear.",
  ],
  food: [
    "Craving something new? Try our chef's specials with {discount}% off your order.",
    "Weekend food fest is here - {discount}% off all combo meals.",
    "Your favourite restaurant just added new dishes. Enjoy {discount}% off this week.",
  ],
  fashion: [
    "Your next favourite is here. Enjoy {discount}% off our new collection. Shop now.",
    "New season, new look - {discount}% off the latest arrivals.",
    "Refresh your wardrobe today with {discount}% off select styles.",
  ],
  technology: [
    "Upgrade your tech - {discount}% off the latest gadgets this week only.",
    "New model just launched. Pre-order now and save {discount}%.",
    "Smart home essentials are on sale - {discount}% off this weekend.",
  ],
  travel: [
    "Escape the everyday! Book your next trip and save {discount}%.",
    "Flash sale on flights - {discount}% off selected destinations.",
    "Your dream vacation is closer than you think - {discount}% off packages.",
  ],
  music: [
    "New releases just dropped - stream now and get {discount}% off concert tickets.",
    "Festival season is here! Grab your pass with {discount}% off.",
    "Your favourite artist is coming to town - {discount}% off early tickets.",
  ],
  gaming: [
    "Level up! {discount}% off the newest game releases and in-game credits.",
    "Weekend gaming sale - {discount}% off top titles.",
    "New DLC just dropped, {discount}% off this week only.",
  ],
  healthFitness: [
    "Start your wellness journey - {discount}% off gym memberships and supplements.",
    "New year, new you - {discount}% off fitness plans this month.",
    "Feel your best - {discount}% off wellness and recovery sessions.",
  ],
  finance: [
    "Grow your savings - open an account today and get a bonus offer.",
    "Limited-time rate boost on savings accounts - act now.",
    "Simplify your finances - switch today and get {discount}% off advisory fees.",
  ],
};
const GENERIC_TEMPLATES = [
  "Renew your car insurance policy today for a special corporate discount.",
  "Subscribe to our newsletter for weekly updates.",
  "Don't miss our general store-wide announcement.",
  "Important update regarding your account - please review.",
  "Check out what's new this month across all categories.",
];

type Record_ = {
  audience: (typeof AUDIENCE_TYPES)[number];
  totalContacts: number;
  genderDistribution: { male: number; female: number; other: number };
  ageDistribution: Record<(typeof AGE_BUCKETS)[number], number>;
  interests: Record<(typeof INTEREST_CATEGORIES)[number], number>;
  estimatedReach: number;
  engagement: number;
  conversations: number;
  optOuts: number;
  cost: number;
  content: string;
};

function generateGenderDistribution() {
  const other = randInt(1, 5);
  const remaining = 100 - other;
  const male = randInt(35, 55);
  const female = remaining - male;
  return { male, female: Math.max(1, female), other };
}

function generateAgeDistribution(audience: (typeof AUDIENCE_TYPES)[number]) {
  // Base weights per audience type, then perturb and normalize to ~100.
  const baseWeights: Record<(typeof AUDIENCE_TYPES)[number], number[]> = {
    "New subscribers": [22, 30, 22, 14, 8, 4],
    "Loyal Customers": [8, 24, 27, 21, 14, 6],
    "Custom campaign": [16, 22, 20, 18, 14, 10],
  };
  const weights = baseWeights[audience].map((w) => Math.max(1, w + randInt(-4, 4)));
  const total = weights.reduce((a, b) => a + b, 0);
  const pct = weights.map((w) => Math.round((w / total) * 100));
  const diff = 100 - pct.reduce((a, b) => a + b, 0);
  pct[1] += diff; // absorb rounding drift into the largest typical bucket
  const dist = {} as Record<(typeof AGE_BUCKETS)[number], number>;
  AGE_BUCKETS.forEach((bucket, i) => {
    dist[bucket] = Math.max(0, pct[i]);
  });
  return dist;
}

function generateInterests() {
  const interests = {} as Record<(typeof INTEREST_CATEGORIES)[number], number>;
  // Pick 2-3 standout interests per audience for a realistic signal shape.
  const standoutCount = randInt(2, 3);
  const shuffled = [...INTEREST_CATEGORIES].sort(() => rand() - 0.5);
  const standouts = new Set(shuffled.slice(0, standoutCount));
  for (const cat of INTEREST_CATEGORIES) {
    interests[cat] = standouts.has(cat) ? randInt(28, 45) : randInt(3, 22);
  }
  return interests;
}

function generateRecord(): Record_ {
  const audience = weightedPick([
    [AUDIENCE_TYPES[0], 5],
    [AUDIENCE_TYPES[1], 3],
    [AUDIENCE_TYPES[2], 2],
  ] as const);

  const contactsRange: Record<(typeof AUDIENCE_TYPES)[number], [number, number]> = {
    "Loyal Customers": [5000, 50000],
    "New subscribers": [500, 20000],
    "Custom campaign": [100, 100000],
  };
  const [minC, maxC] = contactsRange[audience];
  const totalContacts = randInt(minC, maxC);

  const genderDistribution = generateGenderDistribution();
  const ageDistribution = generateAgeDistribution(audience);
  const interests = generateInterests();

  // 70% of the time, target one of the audience's standout interests
  // (well-matched content); 30% of the time pick a mismatched or generic
  // topic, to produce realistic low performers too.
  const sortedInterests = INTEREST_CATEGORIES.slice().sort((a, b) => interests[b] - interests[a]);
  const topInterests = sortedInterests.slice(0, 3);
  const isWellTargeted = rand() < 0.7;
  let topic: (typeof INTEREST_CATEGORIES)[number] | null;
  let content: string;
  let matchScore: number;

  const discount = randInt(10, 40);
  if (isWellTargeted) {
    topic = pick(topInterests);
    content = pick(CONTENT_TEMPLATES[topic]).replace("{discount}", String(discount));
    matchScore = interests[topic];
  } else if (rand() < 0.5) {
    // mismatched: pick one of the audience's weakest interests
    const weakest = sortedInterests[sortedInterests.length - 1];
    topic = weakest;
    content = pick(CONTENT_TEMPLATES[weakest]).replace("{discount}", String(discount));
    matchScore = interests[weakest];
  } else {
    // fully generic, off-category content
    topic = null;
    content = pick(GENERIC_TEMPLATES);
    matchScore = 5;
  }

  const audienceBaselines: Record<(typeof AUDIENCE_TYPES)[number], { engagement: number; optOut: number }> = {
    "Loyal Customers": { engagement: 14, optOut: 0.4 },
    "New subscribers": { engagement: 9, optOut: 0.9 },
    "Custom campaign": { engagement: 11, optOut: 0.7 },
  };
  const baseline = audienceBaselines[audience];

  const deliveryRate = clip(gaussian(audience === "New subscribers" ? 0.9 : 0.95, 0.03), 0.8, 0.99);
  const estimatedReach = Math.round(totalContacts * deliveryRate);

  const engagement = clip(
    baseline.engagement + matchScore * 0.55 + gaussian(0, 3),
    0.5,
    75,
  );

  const conversionFactor = clip(gaussian(0.22, 0.06), 0.05, 0.45);
  const conversations = Math.max(
    0,
    Math.round(estimatedReach * (engagement / 100) * conversionFactor),
  );

  const optOutRate = clip(
    (baseline.optOut * (46 - matchScore)) / 46 / 100 + gaussian(0, 0.001),
    0.0005,
    0.03,
  );
  const optOuts = Math.max(0, Math.round(estimatedReach * optOutRate));

  const perContactCost = clip(gaussian(0.028, 0.006), 0.012, 0.05);
  const cost = Math.round(totalContacts * perContactCost * 100) / 100;

  return {
    audience,
    totalContacts,
    genderDistribution,
    ageDistribution,
    interests,
    estimatedReach,
    engagement: Math.round(engagement * 10) / 10,
    conversations,
    optOuts,
    cost,
    content,
  };
}

const RECORD_COUNT = 1000;
const records: Record_[] = Array.from({ length: RECORD_COUNT }, generateRecord);

const outPath = join(__dirname, "..", "data", "historical-data.json");
writeFileSync(outPath, JSON.stringify(records));
console.log(`Wrote ${records.length} records to ${outPath}`);
