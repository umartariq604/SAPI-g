const mongoose = require('mongoose');

const threatSchema = new mongoose.Schema({
    threatType: {
        type: String,
        required: true,
        enum: [
            'SQL Injection',
            'XSS Attack',
            'Brute Force',
            'DDoS',
            'Malware',
            'Phishing',
            'Port scan',
            'BruteForce',
            'SQLi',
            'XSS'
        ]
    },
    ip: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'blocked', 'mitigated'],
        default: 'active'
    },
    detectedAt: {
        type: Date,
        default: Date.now
    },
    details: {
        type: Object,
        default: {}
    }
});

// Create indexes for faster queries
threatSchema.index({ detectedAt: -1 });
threatSchema.index({ ip: 1 });
threatSchema.index({ threatType: 1 });

module.exports = mongoose.model('Threat', threatSchema);
