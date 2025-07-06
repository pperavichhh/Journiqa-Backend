const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/users.js');  
const { OAuth2Client } = require('google-auth-library');
const { authenticateToken, generateToken } = require('./auth'); // import from auth.js

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

// Public route - create user (register)
router.post('/', async (req, res) => {
  try {
    const { username, email, password, telphone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      telphone,
      start_member_date: new Date()
    });

    await user.save();

    // Generate JWT token after registration
    const token = generateToken(user._id);

    res.status(201).json({ 
      message: 'User created', 
      id: user._id, 
      token 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public login route - (can add JWT token)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user._id);

    res.json({ message: 'Login successful', email: user.email, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected route - get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected route - update current user
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { username, email, password, telphone } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (username) user.username = username;
    if (email) user.email = email;
    if (telphone) user.telphone = telphone;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected route - delete current user
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user.id);
    if (!deletedUser) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google login route
router.post('/google-login', async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) return res.status(400).json({ error: 'Missing id_token' });

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        username: name,
        email,
        password: '',  
        telphone: '',
        start_member_date: new Date()
      });
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        token,
      }
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ error: 'Invalid ID token' });
  }
});

module.exports = router;
