// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // สำหรับแฮชรหัสผ่าน

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true, // อีเมลต้องไม่ซ้ำกัน
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6 // กำหนดความยาวรหัสผ่านขั้นต่ำ
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// --- Middleware ของ Mongoose ก่อนบันทึกข้อมูล (pre-save hook) ---
// ใช้สำหรับแฮชรหัสผ่านก่อนที่จะบันทึกลงฐานข้อมูล
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) { // ตรวจสอบว่ามีการแก้ไขรหัสผ่านหรือไม่
        return next();
    }
    const salt = await bcrypt.genSalt(10); // สร้าง salt (ค่าสุ่ม)
    this.password = await bcrypt.hash(this.password, salt); // แฮชรหัสผ่าน
    next();
});

// --- Method สำหรับเปรียบเทียบรหัสผ่าน ---
// จะใช้เมื่อผู้ใช้เข้าสู่ระบบ
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;