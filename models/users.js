// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true, // อีเมลยังคง required เพราะเป็นตัวระบุหลัก
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        // *** IMPORTANT CHANGE HERE ***
        required: function() {
            return !this.googleId;
        },
        minlength: 6
    },
    // *** NEW FIELD FOR GOOGLE AUTH ***
    googleId: {
        type: String,
        unique: true, // Google ID ควรจะไม่ซ้ำกัน
        sparse: true // ใช้ sparse เพื่อให้ field นี้สามารถเป็น null ได้ แต่ยังคงบังคับ unique ถ้ามีค่าอยู่
    },
    // คุณอาจเพิ่มฟิลด์อื่นๆ จาก Google Profile เช่น
    // displayName: { type: String },
    // profilePicture: { type: String },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// --- Middleware ของ Mongoose ก่อนบันทึกข้อมูล (pre-save hook) ---
UserSchema.pre('save', async function(next) {
    // แฮชรหัสผ่านก็ต่อเมื่อมีการแก้ไขรหัสผ่านและมีรหัสผ่านอยู่
    if (this.isModified('password') && this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// --- Method สำหรับเปรียบเทียบรหัสผ่าน ---
UserSchema.methods.matchPassword = async function(enteredPassword) {
    // เปรียบเทียบรหัสผ่านก็ต่อเมื่อผู้ใช้มี password ใน DB
    if (!this.password) {
        return false; // ผู้ใช้ Google ไม่มีรหัสผ่านในระบบ
    }
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;