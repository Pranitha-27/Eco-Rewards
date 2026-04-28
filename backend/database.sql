-- ============================================================
-- EcoRewards FINAL STABLE DATABASE SETUP
-- ============================================================

CREATE DATABASE IF NOT EXISTS EcoRewards;
USE EcoRewards;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS UserAchievements;
DROP TABLE IF EXISTS LeaderboardCache;
DROP TABLE IF EXISTS ChallengeCompletions;
DROP TABLE IF EXISTS DailyChallenges;
DROP TABLE IF EXISTS UserBadges;
DROP TABLE IF EXISTS RefreshTokens;
DROP TABLE IF EXISTS Activities;
DROP TABLE IF EXISTS Users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE Users (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(50)  UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    email            VARCHAR(100) UNIQUE NOT NULL,

    points           INT DEFAULT 0,
    carbon_saved     FLOAT DEFAULT 0,
    total_distance   FLOAT DEFAULT 0,

    current_streak   INT DEFAULT 0,
    longest_streak   INT DEFAULT 0,
    last_active_date DATE DEFAULT NULL,

    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ACTIVITIES
-- ============================================================

CREATE TABLE Activities (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    distance         FLOAT NOT NULL,
    mode             VARCHAR(20) NOT NULL,
    points_earned    INT DEFAULT 0,
    co2_saved        FLOAT DEFAULT 0,
    trees_equivalent FLOAT DEFAULT 0,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX idx_act_user_date ON Activities(user_id, created_at);

-- ============================================================
-- BADGES
-- ============================================================

CREATE TABLE UserBadges (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id   INT NOT NULL,
    badge_id  VARCHAR(50),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_badge (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ============================================================
-- DAILY CHALLENGES (FIXED)
-- ============================================================

CREATE TABLE DailyChallenges (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id VARCHAR(80) UNIQUE NOT NULL,
    title        VARCHAR(100) NOT NULL,
    description  VARCHAR(255),
    target_value FLOAT NOT NULL,
    target_mode  VARCHAR(20),
    bonus_points INT DEFAULT 50,
    active_date  DATE NOT NULL,

    INDEX idx_active_date (active_date)
);

-- ============================================================
-- CHALLENGE COMPLETIONS (FIXED)
-- ============================================================

CREATE TABLE ChallengeCompletions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    challenge_id VARCHAR(80) NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_completion (user_id, challenge_id),

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ============================================================
-- TOKENS
-- ============================================================

CREATE TABLE RefreshTokens (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    token      VARCHAR(255) UNIQUE,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ============================================================
-- LEADERBOARD CACHE
-- ============================================================

CREATE TABLE LeaderboardCache (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    period     ENUM('week','month','all') NOT NULL,
    type       ENUM('points','co2','distance') NOT NULL,
    data       JSON NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_cache (period, type)
);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================

CREATE TABLE UserAchievements (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    achievement_id VARCHAR(50),
    achieved_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_achievement (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ============================================================
-- SEED TODAY'S CHALLENGES (WORKING)
-- ============================================================

SET SQL_SAFE_UPDATES = 0;

DELETE FROM DailyChallenges WHERE active_date = CURDATE();

INSERT INTO DailyChallenges
(challenge_id, title, description, target_value, target_mode, bonus_points, active_date)
VALUES
(CONCAT('cycle_', CURDATE()), 'Cycle 5km Today', 'Ride at least 5km', 5, 'cycle', 100, CURDATE()),
(CONCAT('walk_', CURDATE()),  'Walk 2km Today',  'Walk at least 2km', 2, 'walk', 50, CURDATE()),
(CONCAT('run_', CURDATE()),   'Run 3km Today',   'Run at least 3km', 3, 'run', 75, CURDATE()),
(CONCAT('metro_', CURDATE()), 'Take Metro',     'Any metro trip counts', 1, 'metro', 40, CURDATE()),
(CONCAT('any_', CURDATE()),   'Any Eco Trip',   'Log any trip', 1, NULL, 25, CURDATE());

-- ============================================================
-- VERIFY
-- ============================================================

SELECT 'Tables Ready' AS status;
SELECT * FROM DailyChallenges;