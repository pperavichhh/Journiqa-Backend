const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('passport'); // นำเข้า passport
const User = require('../models/users');
const dotenv = require('dotenv');

// --- Secret Key สำหรับ JWT ---
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    console.error("JWT_SECRET is not defined in .env. JWT operations will fail.");
    process.exit(1);
}

// --- ฟังก์ชันสร้าง JWT Token ---
const generateToken = (id) => {
    return jwt.sign({ id }, jwtSecret, {
        expiresIn: '1h', // Token จะหมดอายุใน 1 ชั่วโมง
    });
};

// --- Middleware สำหรับยืนยัน JWT Token ---
const authenticateToken = (req, res, next) => {
    let token;

    // ตรวจสอบว่ามี Authorization header และเริ่มต้นด้วย 'Bearer' หรือไม่
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // ดึง token ออกมา
            token = req.headers.authorization.split(' ')[1];

            // ตรวจสอบ token
            const decoded = jwt.verify(token, jwtSecret);

            // ค้นหาผู้ใช้จาก ID ใน token
            // สามารถเพิ่มข้อมูลผู้ใช้ใน req ได้ตามต้องการ
            req.user = decoded; // ในที่นี้ decoded.id คือ user ID ที่เราใส่ไปตอน generateToken
            next(); // ไปยัง middleware/route ถัดไป
        } catch (error) {
            console.error("Error verifying JWT token:", error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Unauthorized: Token has expired.' });
            }
            return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }
};

// --- Route: Register User (POST /api/register) ---
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // ตรวจสอบว่าอีเมลถูกใช้งานแล้วหรือไม่
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ error: 'Email is already in use.' });
        }

        // สร้างผู้ใช้ใหม่
        const user = await User.create({
            email,
            password, // Mongoose pre-save hook จะแฮชรหัสผ่านให้เอง
        });

        // สร้าง JWT และส่งกลับไปพร้อมข้อมูลผู้ใช้
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'User registered successfully!',
            email: user.email,
            token, // ส่ง token กลับไปเพื่อให้ผู้ใช้ล็อกอินได้ทันที
        });

    } catch (error) {
        console.error("Error during user registration:", error);
        res.status(500).json({ error: 'Failed to register user.', details: error.message });
    }
});

// --- Route: Login User (POST /api/login) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // ค้นหาผู้ใช้ด้วยอีเมล
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials: User not found.' });
        }

        // เปรียบเทียบรหัสผ่านที่ป้อนเข้ามากับรหัสผ่านที่แฮชไว้
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials: Password incorrect.' });
        }

        // สร้าง JWT และส่งกลับไป
        const token = generateToken(user._id);

        res.status(200).json({
            message: 'Login successful!',
            email: user.email,
            token,
        });

    } catch (error) {
        console.error("Error during user login:", error);
        res.status(500).json({ error: 'Failed to login.', details: error.message });
    }
});

// --- Route สำหรับเริ่มต้น Google OAuth (ผู้ใช้คลิกปุ่มนี้ใน Frontend) ---
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// --- Google callback route (Google จะ Redirect มาที่นี่หลังจาก Login สำเร็จ) ---
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }), // หากการยืนยันตัวตนล้มเหลว Redirect ไปหน้า Login
    (req, res) => {
        // หาก Passport Authentication สำเร็จ (ผู้ใช้ Login ด้วย Google สำเร็จ)
        // req.user จะมีข้อมูลผู้ใช้ที่ Passport ดึงมาจาก deserializeUser()
        if (req.user) {
            // สร้าง JWT ของระบบคุณเอง จาก ID ของผู้ใช้ที่ได้จากฐานข้อมูลของคุณ
            const token = generateToken(req.user._id); // req.user._id คือ ID จาก MongoDB ที่ Passport serialize/deserialize มาให้
            const frontendRedirectUrl = `http://localhost:5000/`; // <<< ปรับ URL นี้ให้ตรงกับ Frontend ของคุณ

            res.redirect(frontendRedirectUrl);
        } else {
            // กรณีที่ไม่น่าจะเกิดขึ้นถ้า failureRedirect ทำงานแล้ว
            res.status(500).json({ error: 'Google login failed for an unknown reason.' });
        }
    }
);

module.exports = router;
module.exports.authenticateToken = authenticateToken; // ส่งออก middleware เพื่อให้ app.js ใช้งานได้