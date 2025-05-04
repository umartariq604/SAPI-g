const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: function() { return !this.googleId; }, trim: true },
    lastName: { type: String, required: function() { return !this.googleId; }, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { 
        type: String, 
        required: function() { return !this.googleId; } // Password is required only for non-Google users
    },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true // This will automatically add createdAt and updatedAt fields
});

module.exports = mongoose.model('User', userSchema);
