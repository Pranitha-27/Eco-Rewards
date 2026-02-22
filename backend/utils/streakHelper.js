async function updateStreak(db, userId) {
  const [rows] = await db.query(
    'SELECT current_streak, longest_streak, last_active_date FROM Users WHERE id = ?',
    [userId]
  );
  const user     = rows[0];
  const today    = new Date().toISOString().split('T')[0];
  const lastDate = user.last_active_date
    ? new Date(user.last_active_date).toISOString().split('T')[0]
    : null;

  let newStreak = user.current_streak;

  if (lastDate === today) {
    // Already logged today — no change
    return newStreak;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  if (lastDate === yStr) {
    // Logged yesterday — extend streak
    newStreak += 1;
  } else {
    // Gap in activity — reset streak to 1
    newStreak = 1;
  }

  const longest = Math.max(newStreak, user.longest_streak);

  await db.query(
    `UPDATE Users SET
       current_streak   = ?,
       longest_streak   = ?,
       last_active_date = ?
     WHERE id = ?`,
    [newStreak, longest, today, userId]
  );

  return newStreak;
}

module.exports = { updateStreak };