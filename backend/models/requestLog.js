const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
    responseTime: { type: Number }, // in milliseconds
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RequestLog', requestLogSchema);
