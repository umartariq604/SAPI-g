const express = require('express');
const router = express.Router();
const { Threat } = require('../models/threat');
const { authenticateToken } = require('../middleware/auth');

// Get threat activity data
router.get('/stats/threats', authenticateToken, async (req, res) => {
  try {
    const { range = 'hour' } = req.query;
    const now = new Date();
    let startTime;

    switch (range) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
    }

    const threats = await Threat.find({
      timestamp: { $gte: startTime }
    }).sort({ timestamp: 1 });

    // Group threats by time interval
    const groupedThreats = threats.reduce((acc, threat) => {
      const date = new Date(threat.timestamp);
      let label;
      
      if (range === 'hour') {
        label = `${date.getHours().toString().padStart(2, '0')}:00`;
      } else if (range === 'day') {
        label = `${date.getHours().toString().padStart(2, '0')}:00`;
      } else if (range === 'week') {
        label = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!acc[label]) {
        acc[label] = { threats: 0, blocked: 0 };
      }
      
      acc[label].threats++;
      if (threat.status === 'blocked') {
        acc[label].blocked++;
      }
      
      return acc;
    }, {});

    const result = Object.entries(groupedThreats).map(([label, data]) => ({
      label,
      threats: data.threats,
      blocked: data.blocked
    }));

    res.json({ threats: result });
  } catch (error) {
    console.error('Error fetching threat data:', error);
    res.status(500).json({ error: 'Failed to fetch threat data' });
  }
});

// Get threat statistics
router.get('/stats/threat-stats', authenticateToken, async (req, res) => {
  try {
    const totalThreats = await Threat.countDocuments();
    const blockedThreats = await Threat.countDocuments({ status: 'blocked' });
    const activeThreats = await Threat.countDocuments({ status: 'active' });

    res.json({
      totalThreats,
      blockedThreats,
      activeThreats
    });
  } catch (error) {
    console.error('Error fetching threat stats:', error);
    res.status(500).json({ error: 'Failed to fetch threat stats' });
  }
});

// Get threat types distribution
router.get('/stats/threat-types', authenticateToken, async (req, res) => {
  try {
    const threatTypes = await Threat.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Map threat types to icons
    const typeIcons = {
      'SQL Injection': 'fas fa-database',
      'XSS Attack': 'fas fa-code',
      'Brute Force': 'fas fa-key',
      'DDoS': 'fas fa-network-wired',
      'Malware': 'fas fa-virus',
      'Phishing': 'fas fa-fish'
    };

    const result = threatTypes.map(type => ({
      ...type,
      icon: typeIcons[type.name] || 'fas fa-shield-alt'
    }));

    res.json({ types: result });
  } catch (error) {
    console.error('Error fetching threat types:', error);
    res.status(500).json({ error: 'Failed to fetch threat types' });
  }
});

// Get recent threats
router.get('/stats/recent-threats', authenticateToken, async (req, res) => {
  try {
    const recentThreats = await Threat.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .select('name ip timestamp status type')
      .lean();

    const result = recentThreats.map(threat => ({
      name: threat.name,
      ip: threat.ip,
      time: formatTimeAgo(threat.timestamp),
      status: threat.status,
      icon: getThreatIcon(threat.type)
    }));

    res.json({ threats: result });
  } catch (error) {
    console.error('Error fetching recent threats:', error);
    res.status(500).json({ error: 'Failed to fetch recent threats' });
  }
});

// Helper function to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} days ago`;
  if (hours > 0) return `${hours} hours ago`;
  if (minutes > 0) return `${minutes} minutes ago`;
  return 'just now';
}

// Helper function to get threat icon
function getThreatIcon(type) {
  const typeIcons = {
    'SQL Injection': 'fas fa-database',
    'XSS Attack': 'fas fa-code',
    'Brute Force': 'fas fa-key',
    'DDoS': 'fas fa-network-wired',
    'Malware': 'fas fa-virus',
    'Phishing': 'fas fa-fish'
  };
  return typeIcons[type] || 'fas fa-shield-alt';
}

module.exports = router; 