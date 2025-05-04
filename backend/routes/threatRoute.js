const express = require('express');
const router = express.Router();
const Threat = require('../models/threat');

// POST: Log threat from AI module
router.post('/log', async (req, res) => {
  try {
    const { 
      ip, 
      threatType, 
      confidence, 
      endpoint, 
      method, 
      email, 
      userAgent, 
      requestData 
    } = req.body;

    if (!ip || !threatType) {
      return res.status(400).json({ message: "IP and Threat Type are required" });
    }

    const newThreat = new Threat({ 
      ip, 
      threatType,
      confidence: confidence || 0.0,
      endpoint: endpoint || 'unknown',
      method: method || 'unknown',
      email: email || 'unknown',
      userAgent: userAgent || 'unknown',
      requestData: requestData || {},
      detectedAt: new Date()
    });
    
    await newThreat.save();

    res.status(201).json({ message: "Threat logged successfully", data: newThreat });
  } catch (err) {
    console.error("Error logging AI threat:", err);
    res.status(500).json({ message: "Error saving threat" });
  }
});

// GET: Return the most recent threats with optional filtering
router.get('/recent', async (req, res) => {
  try {
    const { limit = 20, threatType, ip } = req.query;
    const query = {};
    
    if (threatType) query.threatType = threatType;
    if (ip) query.ip = ip;
    
    const recentThreats = await Threat.find(query)
      .sort({ detectedAt: -1 })
      .limit(parseInt(limit));
      
    res.json(recentThreats);
  } catch (err) {
    console.error("Error fetching recent threats:", err);
    res.status(500).json({ message: "Error fetching threats" });
  }
});

// GET: Get threat statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalThreats: await Threat.countDocuments({}),
      threatsByType: await Threat.aggregate([
        { $group: { _id: '$threatType', count: { $sum: 1 } } }
      ]),
      recentThreats: await Threat.find()
        .sort({ detectedAt: -1 })
        .limit(5)
    };
    
    res.json(stats);
  } catch (err) {
    console.error("Error fetching threat stats:", err);
    res.status(500).json({ message: "Error fetching threat statistics" });
  }
});

module.exports = router;
