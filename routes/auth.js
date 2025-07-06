const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bcrypt = require('bcrypt');
const User = require('../models/users');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error("JWT_SECRET is not defined in .env. Exiting...");
  process.exit(1);
}
const generateToken = (id) => {
  return jwt.sign({ id }, jwtSecret, { expiresIn: '1h' });
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; 
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Token has expired.' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
};

// Register new user (POST /api/register)
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required.' });

    try {
        const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ error: 'Email is already in use.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully!',
      email: user.email,
      token,
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ error: 'Failed to register user.', details: error.message });
  }
});

// Login user (POST /api/login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: 'Invalid credentials: User not found.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: 'Invalid credentials: Password incorrect.' });

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

// Google OAuth routes using passport.js
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {
    if (req.user) {
      const token = generateToken(req.user._id);
      const frontendRedirectUrl = `http://localhost:5000/?token=${token}`; // You can send token in query or cookie

      res.redirect(frontendRedirectUrl);
    } else {
      res.status(500).json({ error: 'Google login failed for an unknown reason.' });
    }
  }
);

module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.generateToken = generateToken;
