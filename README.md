# 🌿 EcoRewards - Sustainable Transportation Tracker

A full-stack web application that rewards users for choosing eco-friendly transportation methods. Track your trips, earn points, save CO₂, and unlock rewards!

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Database Setup](#-database-setup)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [File Structure](#-file-structure)
- [Usage Guide](#-usage-guide)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## ✨ Features

- 🚶 **Trip Logging** - Track walks, runs, cycles, bus, metro, and EV trips
- 🏆 **Points System** - Earn points based on distance and transport mode
- 🌍 **CO₂ Calculator** - See how much carbon you've saved
- 🔥 **Streak Tracking** - Maintain daily activity streaks
- 🎁 **Rewards System** - Unlock coupons and discounts
- 📊 **Dashboard** - Visualize your weekly progress with charts
- 🏅 **Badges** - Earn achievement badges for milestones
- 📱 **Responsive Design** - Works on desktop and mobile

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL |
| **Authentication** | JWT (JSON Web Tokens) |
| **Charts** | Chart.js |
| **Environment** | dotenv |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v8 or higher) - [Download](https://www.mysql.com/)
- **npm** or **yarn** - Comes with Node.js

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ecorewards.git
cd ecorewards
```

### 2. Install Dependencies

```bash
# Navigate to backend folder
cd backend

# Install all npm packages
npm install
```

### 3. Project Structure

```
ecorewards/
├── backend/
│   ├── config/
│   │   └── db.js              # Database connection
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── routes/
│   │   ├── auth.js            # Login/Register routes
│   │   └── points.js          # Points/Activities routes
│   ├── utils/
│   │   ├── co2Calculator.js   # CO₂ calculation logic
│   │   ├── streakHelper.js    # Streak tracking
│   │   └── badgeEngine.js     # Badge system
│   ├── .env                   # Environment variables
│   └── server.js              # Main server file
├── frontend/
│   ├── assets/
│   │   └── bg.jpg             # Background image
│   ├── index.html             # Trip logging page
│   ├── login.html             # Login page
│   ├── register.html          # Registration page
│   ├── dashboard.html         # User dashboard
│   └── leaderboard.html       # Leaderboard page
└── README.md
```

---

## 🗄 Database Setup

### 1. Create Database

```sql
CREATE DATABASE ecorewards;
USE ecorewards;
```

### 2. Create Tables

```sql
-- Users Table
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    points INT DEFAULT 0,
    carbon_saved DECIMAL(10,4) DEFAULT 0,
    total_distance DECIMAL(10,2) DEFAULT 0,
    current_streak INT DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities Table
CREATE TABLE Activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    distance DECIMAL(10,2) NOT NULL,
    mode ENUM('walk', 'run', 'cycle', 'bus', 'metro', 'ev') NOT NULL,
    points_earned INT NOT NULL,
    co2_saved DECIMAL(10,4) NOT NULL,
    trees_equivalent DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- UserBadges Table
CREATE TABLE UserBadges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id VARCHAR(50) NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- DailyChallenges Table
CREATE TABLE DailyChallenges (
    challenge_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    target_mode VARCHAR(20),
    target_value DECIMAL(10,2),
    bonus_points INT NOT NULL,
    active_date DATE NOT NULL
);

-- ChallengeCompletions Table
CREATE TABLE ChallengeCompletions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    challenge_id INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES DailyChallenges(challenge_id) ON DELETE CASCADE
);
```

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` folder:

```env
# Server Configuration
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ecorewards

# JWT Secret (Change this to a random string!)
JWT_SECRET=your_super_secret_jwt_key_change_this

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## ▶ Running the Application

### 1. Start the Server

```bash
cd backend
npm start
```

### 2. Access the Application

Open your browser and visit:

```
http://localhost:3000
```

You should see the **Login Page** first.

### 3. Default Flow

1. **Register** a new account at `/register.html`
2. **Login** with your credentials
3. **Log a Trip** from the home page
4. **View Dashboard** to see your points and CO₂ savings

---

## 🌐 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login user | ❌ |
| GET | `/api/auth/profile` | Get user profile | ✅ |

### Points & Activities

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/points` | Get user stats & activities | ✅ |
| POST | `/api/points/add` | Log new activity | ✅ |
| GET | `/api/points/weekly` | Get weekly progress data | ✅ |
| GET | `/api/points/badges` | Get user badges | ✅ |

---

## 📖 Usage Guide

### 🚶 Logging a Trip

1. Navigate to the Home page (`/index.html`)
2. Enter distance in kilometers
3. Select transport mode (Walk, Run, Cycle, Bus, Metro, EV)
4. Click **"Log Trip"**
5. View your earned points and CO₂ saved

### 📊 Viewing Dashboard

1. Click **"View Dashboard"** after logging a trip
2. See your:
   - Total Points
   - Current Streak
   - CO₂ Saved
   - Total Distance
   - Recent Activities
   - Weekly Progress Chart
   - Available Rewards

### 🏆 Earning Rewards

| Points | Reward | Code |
|--------|--------|------|
| 100 | 10% Off at EcoMart | `ECOMART10` |
| 200 | Free Coffee at GreenCafe | `FREECOFFEE` |
| 500 | 20% Off on EcoClothes | `ECOCLOTH20` |
| 1000 | Free Meal at VeganBite | `VEGANMEAL` |

---

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Check if port 3000 is already in use
netstat -ano | findstr :3000

# Kill the process or change PORT in .env
```

### Database Connection Error

```bash
# Verify MySQL is running
# Check .env credentials match your MySQL setup
# Ensure database 'ecorewards' exists
```

### Dashboard Shows 0 Points

1. Clear browser localStorage:
   ```javascript
   localStorage.clear();
   ```
2. Logout and login again
3. Check browser console (F12) for errors
4. Verify API returns data in Network tab

### Page Loads Wrong HTML

1. Stop the server
2. Clear browser cache (Ctrl + Shift + Delete)
3. Ensure `app.get('/')` comes BEFORE `express.static` in `server.js`
4. Restart server

---

## 📝 Points & CO₂ Calculation

### Points Per Kilometer

| Mode | Points/km |
|------|-----------|
| 🚶 Walk | 25 |
| 🏃 Run | 20 |
| 🚴 Cycle | 35 |
| 🚌 Bus | 30 |
| 🚇 Metro | 45 |
| 🚗 EV | 50 |

### CO₂ Saved Per Kilometer (kg)

| Mode | CO₂ Factor |
|------|------------|
| 🚶 Walk | 0.171 |
| 🏃 Run | 0.171 |
| 🚴 Cycle | 0.158 |
| 🚌 Bus | 0.101 |
| 🚇 Metro | 0.148 |
| 🚗 EV | 0.087 |

*Note: CO₂ saved is calculated compared to average car emissions.*

---

## 🔒 Security Notes

- **JWT tokens** expire after 24 hours
- **Passwords** are hashed using bcrypt
- **API endpoints** require authentication (except login/register)
- **CORS** is enabled for localhost development

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- CO₂ factors based on EPA emission standards
- Inspired by sustainable transportation initiatives
- Built with ❤️ for a greener planet

---

## 📧 Contact

For questions or support, please open an issue on GitHub or contact the development team.

**🌿 Start your eco-journey today!**