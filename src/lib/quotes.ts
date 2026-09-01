import { dayNumber } from "./date";

/**
 * Light-hearted, kind quotes/jokes about discipline, habits, and health for the
 * landing hero. Kept generic (no names) since Verdant is self-hostable.
 *
 * Selection is a shuffle-bag rotation: each cycle is a fresh shuffle of ALL lines,
 * one shown per day with no repeats; when the bag empties it reshuffles (a new
 * order) and repeats. Done deterministically from the date — zero storage, no API.
 */
export const DAILY_LINES = [
  // discipline & habits
  "Discipline is just self-care with a to-do list.",
  "Consistency is the quietest superpower.",
  "Habits are the compound interest of getting better.",
  "Motivation gets you started; habits keep you going.",
  "You don't have to be great to start, but you have to start to be great.",
  "Small choices, stacked daily, become a different person.",
  "Discipline is choosing what you want most over what you want now.",
  "The plan only works on the days you don't feel like it.",
  "Win the morning, coast the afternoon.",
  "Showing up is half the battle; the snacks are the other half.",
  "One good choice won't fix everything. A hundred of them will.",
  "Today's effort is tomorrow's lighter step.",
  "Be the reason your future self says thank you.",
  "Future you is watching. Make them proud.",
  "Show up for yourself like you'd show up for a friend.",
  "Your only competition is yesterday's you.",
  "Slow progress is still progress; the couch offers none.",
  "Progress, not perfection — and definitely not that third cookie.",
  "A streak is just one good day, repeated.",
  "Don't break the chain — your check-in is waiting.",
  "Tiny gains are still gains. Compound them.",
  "Done beats perfect. Perfect never logs in.",
  "The habit is the goal; the kilos are the receipt.",
  "Repetition is boring. So is being out of breath on the stairs.",
  "Discipline weighs ounces; regret weighs tons.",
  "You can't out-wish a habit, but you can out-show-up one.",
  "Start where you are, use what you have, log what you did.",

  // weigh-ins & the scale
  "The scale is only a mood — the habit is the magic.",
  "Sweat now, brag at the next weigh-in.",
  "Cravings are temporary; the streak is forever.",
  "The scale measures gravity, not worth.",
  "Weigh in, don't weigh down.",
  "Numbers wobble; trends tell the truth.",
  "One weigh-in is a data point, not a verdict.",
  "Trust the trend line, not the morning grump.",
  "The graph only needs to keep drifting down.",
  "A heavy scale day is just a plot twist, not the ending.",
  "Water weight is the drama queen of the scale.",

  // food & kitchen humor
  "Abs are made in the kitchen, which is annoyingly far from the couch.",
  "Motivation gets you started; the snack cupboard tests your resolve.",
  "A body in motion stays out of the fridge.",
  "Small steps still count — even the long way to the fridge.",
  "Hunger is a question; not every answer is a cookie.",
  "Eat like you love yourself, not like you're mad at the pantry.",
  "The fridge light is not a campfire. Don't linger.",
  "Meal prep: arguing with your future cravings and winning.",
  "Veggies first; the plate is not a popularity contest.",
  "If it came from a plant, eat it. If it was made in one, maybe don't.",
  "The second helping is optional. Remember that around 8pm.",
  "Discipline is closing the kitchen after dinner.",
  "A snack delayed is sometimes a snack denied — nicely done.",
  "Chew slower; your stomach reads at its own pace.",
  "Cook once, win twice.",

  // movement
  "The hardest lift is the one off the couch.",
  "Rome wasn't built in a day, and neither was a six-pack.",
  "A walk a day keeps the 'what happened?' away.",
  "Some days you run; some days you walk. Both beat the couch.",
  "Take the stairs — the elevator can't tone a thing.",
  "Movement is a gift you give your future joints.",
  "A short workout you did beats a long one you skipped.",
  "Lace up. The first ten minutes lie; the rest feel great.",
  "You never regret the walk you took.",
  "Stretch now or creak later.",
  "Park far, walk happy.",
  "Dance counts. Cleaning counts. Chasing the cat counts.",
  "Strong is just consistent, wearing gym clothes.",
  "Your couch will forgive you for leaving it.",

  // sleep, water, wellness
  "Drink the water. Future you is thirsty for results.",
  "Sleep is the cheat code nobody wants to use.",
  "Hydrate like it's your job — it kind of is.",
  "Rest is part of the work, not a reward for it.",
  "A glass of water solves more than you'd think.",
  "Eight hours of sleep beats eight excuses.",
  "Recovery days build the body that shows up.",
  "Stress less, breathe more, log it anyway.",
  "Your body keeps score; be on its side.",
  "Tired isn't a personality. Sleep on it.",

  // mindset & kindness
  "Take care of your body; it's the only place you have to live.",
  "Fall seven times, stand up eight, skip the second helping nine.",
  "Be patient with your body; it's listening.",
  "You are not behind. You are exactly one choice from on-track.",
  "Compare yourself to who you were, not to a highlight reel.",
  "A missed day is a comma, not a full stop.",
  "Grace today, grit tomorrow.",
  "The goal is to feel good, not just look good.",
  "Celebrate the boring days; that's where it's won.",
  "Kindness to yourself is a performance enhancer.",
  "You can begin again at any meal, any morning, any minute.",
  "The best project you'll ever work on is you.",
  "Health is a long game; play it kindly.",
  "Tiny wins are still worth a quiet fist-pump.",
  "Don't 'should' on yourself. Just do the next small thing.",

  // streaks, time, perseverance
  "Inch by inch, life's a cinch; by the yard, it's hard.",
  "The dip is part of the climb.",
  "Quitting takes a second; momentum takes a week.",
  "What gets logged gets noticed; what gets noticed gets better.",
  "Patience and a check-in beat motivation alone.",
  "Keep the promise you made to yourself this morning.",
  "Boring consistency outruns shiny bursts.",
  "Every expert was once a beginner who didn't stop.",
  "The first month is the toughest; the second is freedom.",
  "You can't add days to your streak, only today.",

  // cozy / seasonal flavor
  "Let a kilo fall with the autumn leaves.",
  "Cozy season, steady habits.",
  "Even the slow river carves the canyon.",
  "Tend yourself like a garden — water, light, patience.",
  "A year of squares is built one day at a time. So are you.",
  "Plant the habit today; bloom by spring.",
  "Steady as a candle, warm as the fire.",
  "Seasons change; so can you, gently.",
] as const;

/** Seeded Fisher-Yates: the shuffled order of [0..n-1] for a given cycle seed. */
function shuffledOrder(n: number, seed: number): number[] {
  let s = (seed * 2654435761) >>> 0; // scramble the seed first
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shuffle-bag pick for the day. `day` is a "YYYY-MM-DD" string (use todaySG()).
 * Every line shows once per cycle of `DAILY_LINES.length` days before any repeats;
 * each cycle is reshuffled into a new order.
 */
export function dailyLine(day: string): string {
  const n = DAILY_LINES.length;
  const dayN = dayNumber(day);
  const cycle = Math.floor(dayN / n);
  const pos = ((dayN % n) + n) % n;
  const order = shuffledOrder(n, cycle + 1); // +1 so the seed is never 0
  return DAILY_LINES[order[pos]];
}
