const BADGES = [
  { id: 'first_trip',  name: 'First Steps',     emoji: '👣', desc: 'Logged your first trip',    check: (u) => u.total_trips >= 1   },
  { id: 'ten_trips',   name: 'Getting Serious', emoji: '🚀', desc: 'Logged 10 trips',            check: (u) => u.total_trips >= 10  },
  { id: 'cyclist',     name: 'Cyclist',         emoji: '🚴', desc: 'Cycled 50km total',          check: (u) => u.cycle_distance >= 50  },
  { id: 'walker',      name: 'Walker',          emoji: '🚶', desc: 'Walked 20km total',          check: (u) => u.walk_distance >= 20   },
  { id: 'streak_7',    name: 'Week Warrior',    emoji: '🔥', desc: '7-day streak',              check: (u) => u.current_streak >= 7   },
  { id: 'co2_10kg',    name: 'Carbon Slayer',   emoji: '🌍', desc: 'Saved 10kg of CO₂',         check: (u) => u.carbon_saved >= 10    },
  { id: 'points_1000', name: 'Point Hoarder',   emoji: '💎', desc: 'Earned 1000 points',        check: (u) => u.points >= 1000        },
  { id: 'metro_rider', name: 'Metro Rider',     emoji: '🚇', desc: 'Took metro 10 times',       check: (u) => u.metro_trips >= 10     },
];

async function checkAndAwardBadges(db, userId) {
  // Get user stats needed for badge checks
  const [statsRows] = await db.query(`
    SELECT
      u.points,
      u.carbon_saved,
      u.current_streak,
      COUNT(a.id)                                              AS total_trips,
      SUM(CASE WHEN a.mode = 'cycle' THEN a.distance ELSE 0 END) AS cycle_distance,
      SUM(CASE WHEN a.mode = 'walk'  THEN a.distance ELSE 0 END) AS walk_distance,
      SUM(CASE WHEN a.mode = 'metro' THEN 1           ELSE 0 END) AS metro_trips
    FROM Users u
    LEFT JOIN Activities a ON a.user_id = u.id
    WHERE u.id = ?
    GROUP BY u.id`, [userId]);

  const stats = statsRows[0];

  // Get badges already earned
  const [earned] = await db.query(
    'SELECT badge_id FROM UserBadges WHERE user_id = ?',
    [userId]
  );
  const earnedIds = new Set(earned.map(b => b.badge_id));

  const newBadges = [];

  for (const badge of BADGES) {
    if (!earnedIds.has(badge.id) && badge.check(stats)) {
      await db.query(
        'INSERT IGNORE INTO UserBadges (user_id, badge_id) VALUES (?, ?)',
        [userId, badge.id]
      );
      newBadges.push({ id: badge.id, name: badge.name, emoji: badge.emoji, desc: badge.desc });
    }
  }

  return newBadges;
}

module.exports = { checkAndAwardBadges, BADGES };