const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/users.js');  

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // exclude password
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users - create user
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
    res.status(201).json({ message: 'User created', id: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /users/:id - update user
router.put('/:id', async (req, res) => {
  try {
    const { username, email, password, telphone } = req.body;

    const user = await User.findById(req.params.id);
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

// DELETE /users/:id - delete user
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google login route
// POST /users/google-login
router.post('/google-login', async (req, res) => {
  try {
    const { id_token } = req.body;

    if (!id_token) return res.status(400).json({ error: 'Missing id_token' });

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // 1. ค้นหาผู้ใช้ใน DB
    let user = await User.findOne({ email });

    // 2. ถ้าไม่เจอ → สร้างผู้ใช้ใหม่
    if (!user) {
      user = new User({
        username: name,
        email,
        password: '',  // Google users don't need a password
        telphone: '',
        start_member_date: new Date()
      });
      await user.save();
    }

    // 3. ส่งข้อมูลกลับ (สามารถส่ง JWT หรือ session ก็ได้)
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ error: 'Invalid ID token' });
  }
});


module.exports = router;
