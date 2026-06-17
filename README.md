# 🐾 TaskMate — Complete Tasks. Grow Your Companion.

A gamified productivity app where your virtual pet grows as you complete daily tasks. Built with vanilla JavaScript, Node.js, Express, and MongoDB Atlas — featuring real-time cloud sync, offline support, and a global leaderboard.

🌐 **Live App → [grindpet.vercel.app](https://grindpet.vercel.app)**

---

## ✨ Features

- **Virtual Pet System** — Choose from 8 unique pets, each with 5 evolution stages
- **Task Tracking** — Add, complete, and delete daily tasks with XP rewards
- **Cloud Sync** — All progress saved to MongoDB Atlas and synced across sessions
- **Offline Support** — Keep working offline; changes sync automatically when reconnected
- **XP & Leveling** — Earn XP by completing tasks and finishing the day strong
- **Streak System** — Maintain daily streaks for bonus rewards
- **Daily Summary** — See how you performed at the end of each day
- **Global Leaderboard** — Compete with other users by XP
- **History View** — Track your last 30 days of performance
- **JWT Authentication** — Secure login and registration with persistent sessions

---

## 🛠️ Tech Stack

**Frontend**
- HTML5, CSS3, Vanilla JavaScript
- Space Grotesk + Syne (Google Fonts)
- Fully responsive design
- Deployed on Vercel

**Backend**
- Node.js + Express.js
- MongoDB Atlas (cloud database)
- Mongoose ODM
- JWT (JSON Web Tokens) for auth
- bcryptjs for password hashing
- Deployed on Vercel (serverless)

---

## 🐉 Pets Available

| Pet | Stages |
|-----|--------|
| Dragon | 🥚 → 🐣 → 🦎 → 🐉 → 🐲 |
| Cat | 🥚 → 🐱 → 🐈 → 🦁 → 👑 |
| Robot | 🥚 → 🔩 → 🤖 → 👾 → 🚀 |
| Plant | 🥚 → 🌱 → 🌿 → 🌳 → 🌍 |
| Fox | 🥚 → 🦊 → 🐺 → 🦁 → 🐉 |
| Phoenix | 🥚 → 🐣 → 🦅 → 🔥 → ☀️ |
| Bunny | 🥚 → 🐰 → 🐇 → 🦄 → ✨ |
| Ghost | 🥚 → 👻 → 💀 → 🌑 → ⚡ |

---

## 📁 Project Structure

```
GrindPet/
├── Frontend/
│   ├── index.html       # Main UI
│   ├── app.js           # All frontend logic
│   └── style.css        # Styling
│
├── Backend/
│   ├── server.js        # Express server + all API routes
│   ├── package.json
│   ├── vercel.json      # Vercel deployment config
│   ├── .env             # Local environment variables (never committed)
│   └── .env.example     # Safe template for contributors
│
└── README.md
```

---

## 🚀 Deployment

The app is fully deployed on **Vercel** across two projects:

| Service | URL |
|---------|-----|
| Frontend | [grindpet.vercel.app](https://grindpet.vercel.app) |
| Backend API | [grindpet-backend.vercel.app/api](https://grindpet-backend.vercel.app/api) |

**Environment variables** are configured directly in the Vercel dashboard (not in any committed file):

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `PORT` | Set automatically by Vercel |

> ⚠️ The `.env` file is listed in `.gitignore` and is never pushed to GitHub.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/user/me` | Get current user info |
| GET | `/api/user/data` | Get all user data + tasks |
| POST | `/api/user/pet` | Set or update pet |
| DELETE | `/api/user/data` | Reset all user progress |
| POST | `/api/tasks` | Add a new task |
| PATCH | `/api/tasks/:id` | Toggle task completion |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/complete-day` | Complete the day and earn rewards |
| GET | `/api/leaderboard` | Get global leaderboard |

---

## 🎮 How It Works

1. **Register** an account and choose your pet
2. **Add tasks** for the day (wake up early, gym, study, etc.)
3. **Check off tasks** as you complete them — each gives +50 XP
4. **Complete the day** to earn bonus XP based on completion %:
   - 100% → 2x XP + streak bonus 🔥
   - 75%+ → 1.5x XP + streak maintained
   - 50%+ → 1x XP
   - Below 50% → 0.5x XP + streak reset
5. Your pet **evolves** as your daily score improves
6. Climb the **global leaderboard** by earning XP

---

## 🧑‍💻 Run Locally (for contributors)

### Prerequisites
- Node.js v18+
- A free [MongoDB Atlas](https://cloud.mongodb.com) account

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/grindpet.git
cd grindpet
```

### 2. Install dependencies
```bash
cd Backend
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Open `.env` and fill in your own values:
```env
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/grindpet?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret_key
```

### 4. Start the backend server
```bash
node server.js
```

You should see:
```
MongoDB Connected
GrindPet Server running on port 3001
API URL: http://localhost:3001/api
```

> If you see `MongoDB Error`, check your `MONGODB_URI` and make sure your current IP is whitelisted in MongoDB Atlas → Network Access → IP Access List.

### 5. Open the frontend
Open `Frontend/index.html` with the **Live Server** extension in VS Code, or open it directly in your browser.

> Make sure `API_URL` in `app.js` points to `http://localhost:3001/api` for local development.

---

## 🔮 Planned Features

- [ ] Daily reminder notifications
- [ ] Task categories (Study, Gym, Personal, Work)
- [ ] Weekly performance charts
- [ ] Achievement badges
- [ ] Friend system — view friends' pets
- [ ] Mobile app (React Native)
- [ ] Custom pet names and skins
- [ ] Dark / light mode toggle

---

## 👨‍💻 Author

**Vansh Gupta**  
CSE Student | AI/ML Specialization | AKTU  
[GitHub](https://github.com/VanshGupta77) · [LinkedIn](www.linkedin.com/in/vansh-gupta)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
