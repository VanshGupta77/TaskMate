const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskpet';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Error:', err));

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    pet: { type: String, default: null },
    petName: { type: String, default: '' },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: null },
    history: [{
        date: String,
        completed: Number,
        total: Number,
        percentage: Number,
        xpEarned: Number,
        stageIndex: Number
    }],
    createdAt: { type: Date, default: Date.now }
});

const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Task = mongoose.model('Task', TaskSchema);

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) throw new Error('No token');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'taskpet-secret-key-2024');
        const user = await User.findById(decoded.id);
        if (!user) throw new Error('User not found');
        
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Please authenticate' });
    }
};

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password || password.length < 6) {
            return res.status(400).json({ message: 'Valid username, email, and password (min 6 chars) required' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'taskpet-secret-key-2024', { expiresIn: '30d' });
        
        res.status(201).json({
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'taskpet-secret-key-2024', { expiresIn: '30d' });
        
        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/user/me', auth, async (req, res) => {
    res.json({ user: { id: req.user._id, username: req.user.username, email: req.user.email } });
});

app.get('/api/user/data', auth, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
        const today = new Date().toDateString();
        
        if (req.user.lastCompletedDate !== today) {
            await Task.updateMany({ userId: req.user._id }, { completed: false });
            const refreshedTasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
            
            res.json({
                pet: req.user.pet,
                petName: req.user.petName,
                level: req.user.level,
                xp: req.user.xp,
                streak: req.user.streak,
                lastCompletedDate: req.user.lastCompletedDate,
                tasks: refreshedTasks,
                history: req.user.history.slice(0, 30)
            });
        } else {
            res.json({
                pet: req.user.pet,
                petName: req.user.petName,
                level: req.user.level,
                xp: req.user.xp,
                streak: req.user.streak,
                lastCompletedDate: req.user.lastCompletedDate,
                tasks,
                history: req.user.history.slice(0, 30)
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/user/pet', auth, async (req, res) => {
    try {
        const { pet, petName } = req.body;
        req.user.pet = pet;
        req.user.petName = petName;
        await req.user.save();
        res.json({ message: 'Pet updated', pet: req.user.pet, petName: req.user.petName });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/user/data', auth, async (req, res) => {
    try {
        await Task.deleteMany({ userId: req.user._id });
        req.user.pet = null;
        req.user.petName = '';
        req.user.level = 1;
        req.user.xp = 0;
        req.user.streak = 0;
        req.user.lastCompletedDate = null;
        req.user.history = [];
        await req.user.save();
        res.json({ message: 'All data reset' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/tasks', auth, async (req, res) => {
    try {
        const { text, completed, createdAt } = req.body;
        const task = new Task({
            userId: req.user._id,
            text,
            completed: completed || false,
            createdAt: createdAt || new Date()
        });
        await task.save();
        
        const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.status(201).json({ tasks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
        if (!task) return res.status(404).json({ message: 'Task not found' });
        
        if (req.body.completed !== undefined) {
            task.completed = req.body.completed;
            await task.save();
            
            if (task.completed) {
                req.user.xp += 50;
                req.user.level = Math.floor(req.user.xp / 200) + 1;
                await req.user.save();
            }
        }
        
        const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ tasks, xp: req.user.xp, level: req.user.level });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
    try {
        await Task.deleteOne({ _id: req.params.id, userId: req.user._id });
        const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ tasks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/complete-day', auth, async (req, res) => {
    try {
        const { completed, total, percentage, tasks: taskUpdates } = req.body;
        const today = new Date().toDateString();
        
        if (req.user.lastCompletedDate === today) {
            return res.status(400).json({ message: 'Day already completed!' });
        }

        const XP_PER_TASK = 50;
        let xpEarned = 0;
        let streak = req.user.streak;
        
        if (percentage === 100) { xpEarned = XP_PER_TASK * total * 2; streak++; }
        else if (percentage >= 75) { xpEarned = Math.floor(XP_PER_TASK * total * 1.5); streak++; }
        else if (percentage >= 50) { xpEarned = Math.floor(XP_PER_TASK * total); streak = 0; }
        else { xpEarned = Math.floor(XP_PER_TASK * completed * 0.5); streak = 0; }

        req.user.xp += xpEarned;
        req.user.level = Math.floor(req.user.xp / 200) + 1;
        req.user.streak = streak;
        req.user.lastCompletedDate = today;
        
        const STAGES = [0, 25, 50, 75, 100];
        let stageIndex = 0;
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (percentage >= STAGES[i]) { stageIndex = i; break; }
        }
        
        req.user.history.unshift({
            date: today,
            completed,
            total,
            percentage,
            xpEarned,
            stageIndex
        });
        if (req.user.history.length > 30) req.user.history.pop();
        
        await req.user.save();
        
        await Task.updateMany({ userId: req.user._id }, { completed: false });
        const freshTasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
        
        const evolved = percentage >= 75;
        const petData = req.user.pet ? {
            dragon: { stages: ['🥚', '🐣', '🦎', '🐉', '🐲'], stageNames: ['Egg', 'Hatchling', 'Drake', 'Dragon', 'Elder Dragon'] },
            cat: { stages: ['🥚', '🐱', '🐈', '🦁', '👑'], stageNames: ['Egg', 'Kitten', 'Cat', 'Lion', 'King'] },
            robot: { stages: ['🥚', '🔩', '🤖', '👾', '🚀'], stageNames: ['Core', 'Parts', 'Robot', 'AI', 'Spaceship'] },
            plant: { stages: ['🥚', '🌱', '🌿', '🌳', '🌍'], stageNames: ['Seed', 'Sprout', 'Bush', 'Tree', 'World Tree'] }
        }[req.user.pet] : null;
        
        res.json({
            xp: req.user.xp,
            level: req.user.level,
            streak: req.user.streak,
            lastCompletedDate: req.user.lastCompletedDate,
            history: req.user.history,
            tasks: freshTasks,
            xpEarned,
            evolved,
            stageIndex,
            evolutionText: evolved ? (petData ? petData.stageNames[Math.min(stageIndex, 4)] + ' Form!' : 'Growing!') : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/leaderboard', auth, async (req, res) => {
    try {
        const leaderboard = await User.find({ xp: { $gt: 0 } })
            .select('username pet petName level xp')
            .sort({ xp: -1 })
            .limit(50);
        
        res.json({ leaderboard });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TaskPet Server running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}/api`);
});

module.exports = app ;