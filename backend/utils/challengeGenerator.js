// utils/challengeGenerator.js
// Automatically generates 3 fresh challenges every day

const CHALLENGE_POOL = [
  // Walk challenges
  { title: '🚶 Morning Mover',       target_mode: 'walk',  target_value: 1,    bonus_points: 30,  description: 'Walk at least 1 km today' },
  { title: '🚶 Step Explorer',       target_mode: 'walk',  target_value: 3,    bonus_points: 60,  description: 'Walk 3 km to earn bonus points' },
  { title: '🚶 Distance Walker',     target_mode: 'walk',  target_value: 5,    bonus_points: 100, description: 'Walk 5 km in a single trip' },
  { title: '🚶 Marathon Walker',     target_mode: 'walk',  target_value: 10,   bonus_points: 180, description: 'Walk 10 km — serious dedication!' },

  // Run challenges
  { title: '🏃 Quick Dash',          target_mode: 'run',   target_value: 1,    bonus_points: 35,  description: 'Run at least 1 km today' },
  { title: '🏃 Jogger\'s Quest',     target_mode: 'run',   target_value: 3,    bonus_points: 70,  description: 'Run 3 km to stay fit and earn points' },
  { title: '🏃 5K Runner',           target_mode: 'run',   target_value: 5,    bonus_points: 120, description: 'Complete a 5 km run today' },

  // Cycle challenges
  { title: '🚴 Pedal Power',         target_mode: 'cycle', target_value: 2,    bonus_points: 50,  description: 'Cycle 2 km instead of driving' },
  { title: '🚴 Cycle Champion',      target_mode: 'cycle', target_value: 5,    bonus_points: 90,  description: 'Cycle 5 km and save big on CO₂' },
  { title: '🚴 Tour de City',        target_mode: 'cycle', target_value: 10,   bonus_points: 150, description: 'Cycle 10 km around the city' },
  { title: '🚴 Commuter Hero',       target_mode: 'cycle', target_value: 15,   bonus_points: 220, description: 'Cycle 15 km — skip the car entirely!' },

  // Bus challenges
  { title: '🚌 Bus Buddy',           target_mode: 'bus',   target_value: 3,    bonus_points: 45,  description: 'Take the bus for at least 3 km' },
  { title: '🚌 Transit Warrior',     target_mode: 'bus',   target_value: 8,    bonus_points: 85,  description: 'Ride the bus 8 km today' },
  { title: '🚌 Public Transport Pro',target_mode: 'bus',   target_value: 15,   bonus_points: 130, description: 'Bus 15 km — public transport champion' },

  // Metro challenges
  { title: '🚇 Metro Rider',         target_mode: 'metro', target_value: 5,    bonus_points: 60,  description: 'Ride the metro for 5 km' },
  { title: '🚇 Underground Legend',  target_mode: 'metro', target_value: 10,   bonus_points: 110, description: 'Take metro 10 km today' },
  { title: '🚇 Rail Runner',         target_mode: 'metro', target_value: 20,   bonus_points: 180, description: 'Ride 20 km on metro — zero emissions!' },

  // EV challenges
  { title: '⚡ Electric Start',      target_mode: 'ev',    target_value: 5,    bonus_points: 55,  description: 'Drive EV for 5 km instead of petrol' },
  { title: '⚡ Green Driver',        target_mode: 'ev',    target_value: 15,   bonus_points: 100, description: 'Drive your EV 15 km today' },
  { title: '⚡ EV Explorer',         target_mode: 'ev',    target_value: 30,   bonus_points: 160, description: 'Drive 30 km in your electric vehicle' },

  // Any mode challenges (target_mode = null)
  { title: '🌿 Eco Starter',         target_mode: null,    target_value: 1,    bonus_points: 25,  description: 'Log any eco-friendly trip today' },
  { title: '🌍 Carbon Cutter',       target_mode: null,    target_value: 5,    bonus_points: 75,  description: 'Travel 5 km by any green mode' },
  { title: '🔥 Streak Builder',      target_mode: null,    target_value: 2,    bonus_points: 50,  description: 'Log a trip to keep your streak alive' },
  { title: '🌱 Green Commuter',      target_mode: null,    target_value: 8,    bonus_points: 110, description: 'Travel 8 km without a petrol car' },
  { title: '🏆 Eco Legend',          target_mode: null,    target_value: 20,   bonus_points: 250, description: 'Travel 20 km sustainably in one day' },
];

/**
 * Picks 3 non-repeating challenges for today using date as seed.
 * Same date always returns the same 3 challenges (deterministic).
 */
function getTodaysChallenges() {
  const today = new Date();
  // Seed = YYYYMMDD as integer — same day always picks same challenges
  const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  // Simple seeded shuffle (Fisher-Yates with deterministic seed)
  const pool    = [...CHALLENGE_POOL];
  let   seedVal = seed;

  function seededRandom() {
    seedVal = (seedVal * 1664525 + 1013904223) & 0xffffffff;
    return (seedVal >>> 0) / 0xffffffff;
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Pick first 3 — one easy, one medium, one any-mode
  // Try to pick variety: at least 1 any-mode + 2 specific modes
  const anyMode  = pool.filter(c => c.target_mode === null);
  const specific = pool.filter(c => c.target_mode !== null);

  const picked = [
    specific[0],    // specific mode challenge
    specific[1],    // another specific mode challenge
    anyMode[0],     // wildcard any-mode challenge
  ];

  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  return picked.map(c => ({ ...c, active_date: todayStr }));
}

/**
 * Ensures today's challenges exist in the DB.
 * Call this on server start and once daily.
 */
async function seedTodaysChallenges(db) {
  try {
    const todayStr   = new Date().toISOString().split('T')[0];
    const challenges = getTodaysChallenges();

    // Check if today's challenges already exist
    const [existing] = await db.query(
      'SELECT COUNT(*) AS cnt FROM DailyChallenges WHERE active_date = ?',
      [todayStr]
    );

    if (existing[0].cnt >= 3) {
      console.log(`✅ Today's challenges already seeded (${todayStr})`);
      return;
    }

    // Clear any partial inserts for today
    await db.query('DELETE FROM DailyChallenges WHERE active_date = ?', [todayStr]);

    // Insert the 3 challenges
    for (const ch of challenges) {
      await db.query(
        `INSERT INTO DailyChallenges 
           (title, description, target_mode, target_value, bonus_points, active_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ch.title, ch.description, ch.target_mode, ch.target_value, ch.bonus_points, ch.active_date]
      );
    }

    console.log(`🎯 Seeded 3 new challenges for ${todayStr}`);
  } catch (err) {
    console.error('Challenge seeding error:', err.message);
  }
}

/**
 * Schedules daily challenge refresh at midnight.
 */
function scheduleDailyRefresh(db) {
  function msUntilMidnight() {
    const now       = new Date();
    const midnight  = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight - now;
  }

  function scheduleNext() {
    const ms = msUntilMidnight();
    console.log(`⏰ Next challenge refresh in ${Math.round(ms / 60000)} minutes`);
    setTimeout(async () => {
      await seedTodaysChallenges(db);
      scheduleNext(); // schedule again for next midnight
    }, ms);
  }

  scheduleNext();
}

module.exports = { seedTodaysChallenges, scheduleDailyRefresh, getTodaysChallenges };