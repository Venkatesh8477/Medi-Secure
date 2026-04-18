const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxLength: 100
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxLength: 150
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician', 'receptionist', 'patient']
    },
    first_name: {
        type: String,
        maxLength: 100
    },
    last_name: {
        type: String,
        maxLength: 100
    },
    auth_type: {
        type: String,
        enum: ['zkp', 'traditional', 'simple_hash'],
        default: 'simple_hash'
    },
    password_hash: {
        type: String,
        maxLength: 255
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Ensure indexes are created
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);
module.exports = User;
