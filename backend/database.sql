
CREATE DATABASE EcoRewards;
USE EcoRewards;
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    points INT DEFAULT 0,
    carbon_saved FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO Users (username, password_hash, email) 
VALUES 
('john_doe', SHA2('securepassword123', 256), 'john@example.com');
SELECT * FROM Users 
WHERE username = 'john_doe' AND password_hash = SHA2('securepassword123', 256);

USE EcoRewards;

-- Add Activities table to persist trips (replaces localStorage)
CREATE TABLE IF NOT EXISTS Activities (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    distance      FLOAT NOT NULL,
    mode          VARCHAR(20) NOT NULL,
    points_earned INT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Add index for fast user activity lookups
CREATE INDEX idx_activities_user ON Activities(user_id);