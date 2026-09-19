/**
 * controllers/adminController.js
 * Controller for Admin dashboard: Analytics, Audit Trail, CSV Export, Zones, and Rescue Teams.
 */

const Incident = require('../models/Incident');
const SOSRecord = require('../models/SOSRecord');
const User = require('../models/User');
const Zone = require('../models/Zone');
const RescueTeam = require('../models/RescueTeam');
const AuditLog = require('../models/AuditLog');

// @desc    Get dashboard summary statistics & analytics data for Chart.js
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res) => {
  try {
    const totalSOS = await SOSRecord.countDocuments();
    const activeSOS = await SOSRecord.countDocuments({ flagged: false, emergencyType: { $ne: 'safe_checkin' } });
    const safeCheckins = await SOSRecord.countDocuments({ emergencyType: 'safe_checkin' });
    const flaggedCount = await SOSRecord.countDocuments({ flagged: true });

    const totalIncidents = await Incident.countDocuments();
    const newIncidents = await Incident.countDocuments({ status: 'new' });
    const assignedIncidents = await Incident.countDocuments({ status: 'assigned' });
    const resolvedIncidents = await Incident.countDocuments({ status: 'resolved' });

    // Incidents by type breakdown
    const byTypeAggregate = await Incident.aggregate([
      { $group: { _id: '$emergencyType', count: { $sum: 1 } } },
    ]);
    const byType = {};
    byTypeAggregate.forEach(item => { byType[item._id] = item.count; });

    // Incidents by priority breakdown
    const byPriorityAggregate = await Incident.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    const byPriority = {};
    byPriorityAggregate.forEach(item => { byPriority[item._id] = item.count; });

    // Average triage score
    const avgTriage = await SOSRecord.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$priorityScore' } } },
    ]);

    // Active rescue teams
    const totalTeams = await RescueTeam.countDocuments();
    const availableTeams = await RescueTeam.countDocuments({ status: 'available' });

    // ── 7-Day Incident Time Series (for Line Chart) ────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyAggregate = await Incident.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Build a full 7-day array (fill missing days with 0)
    const incidentsByDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const found = dailyAggregate.find(
        (a) => a._id.year === d.getFullYear() && a._id.month === d.getMonth() + 1 && a._id.day === d.getDate()
      );
      incidentsByDay.push({ label, count: found ? found.count : 0 });
    }

    // ── Incidents by Zone (for Bar Chart) ────────────────────────────────────
    const byZoneAggregate = await Incident.aggregate([
      { $match: { zone: { $ne: null } } },
      { $group: { _id: '$zone', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'zones',
          localField: '_id',
          foreignField: '_id',
          as: 'zoneInfo',
        },
      },
      { $unwind: { path: '$zoneInfo', preserveNullAndEmpty: true } },
      { $project: { zoneName: { $ifNull: ['$zoneInfo.name', 'Unknown Zone'] }, count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    const byZone = byZoneAggregate.map((z) => ({ zone: z.zoneName, count: z.count }));

    // ── Resolution Rate ───────────────────────────────────────────────────────
    const resolutionRate = totalIncidents > 0
      ? Math.round((resolvedIncidents / totalIncidents) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSOS,
          activeSOS,
          safeCheckins,
          flaggedCount,
          totalIncidents,
          newIncidents,
          assignedIncidents,
          resolvedIncidents,
          totalTeams,
          availableTeams,
          avgTriageScore: avgTriage[0] ? Math.round(avgTriage[0].avgScore * 10) / 10 : 5.0,
          resolutionRate,
        },
        breakdowns: {
          byType,
          byPriority,
          byZone,
        },
        timeSeries: {
          incidentsByDay,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get immutable audit log trail
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Export incident records as CSV for post-disaster evaluation
// @route   GET /api/admin/export/csv
// @access  Private/Admin
exports.exportCSV = async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('assignedTeam', 'name contactPhone')
      .populate('zone', 'name')
      .sort({ createdAt: -1 });

    let csv = 'IncidentCode,Title,EmergencyType,Latitude,Longitude,Status,Priority,PriorityScore,AssignedTeam,Zone,CreatedAt,ResolvedAt\n';

    incidents.forEach(inc => {
      const row = [
        `"${inc.incidentCode}"`,
        `"${(inc.title || '').replace(/"/g, '""')}"`,
        `"${inc.emergencyType}"`,
        inc.location ? inc.location.lat : '',
        inc.location ? inc.location.lng : '',
        `"${inc.status}"`,
        `"${inc.priority}"`,
        inc.priorityScore,
        `"${inc.assignedTeam ? inc.assignedTeam.name : 'Unassigned'}"`,
        `"${inc.zone ? inc.zone.name : 'All'}"`,
        `"${new Date(inc.createdAt).toISOString()}"`,
        `"${inc.resolvedAt ? new Date(inc.resolvedAt).toISOString() : ''}"`,
      ].join(',');
      csv += row + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="meshsos_incidents_export.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all Zones
// @route   GET /api/admin/zones
// @access  Public / Private
exports.getZones = async (req, res) => {
  try {
    const zones = await Zone.find().populate('assignedTeams');
    return res.status(200).json({ success: true, count: zones.length, data: zones });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Create a new Zone polygon
// @route   POST /api/admin/zones
// @access  Private/Admin
exports.createZone = async (req, res) => {
  try {
    const { name, code, description, color, coordinates } = req.body;

    if (!name || !coordinates) {
      return res.status(400).json({ success: false, error: 'Zone name and polygon coordinates are required' });
    }

    const zone = await Zone.create({
      name,
      code: code || name.substring(0, 4).toUpperCase(),
      description: description || '',
      color: color || '#ef4444',
      polygon: {
        type: 'Polygon',
        coordinates,
      },
    });

    return res.status(201).json({ success: true, data: zone });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all Rescue Teams
// @route   GET /api/admin/teams
// @access  Public / Private
exports.getRescueTeams = async (req, res) => {
  try {
    const teams = await RescueTeam.find().populate('zone');
    return res.status(200).json({ success: true, count: teams.length, data: teams });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Create a Rescue Team
// @route   POST /api/admin/teams
// @access  Private/Admin
exports.createRescueTeam = async (req, res) => {
  try {
    const { name, teamType, contactPhone, currentLocation, membersCount, zone } = req.body;

    if (!name || !currentLocation || currentLocation.lat == null || currentLocation.lng == null) {
      return res.status(400).json({ success: false, error: 'Team name and current GPS location are required' });
    }

    const team = await RescueTeam.create({
      name,
      teamType: teamType || 'general_sar',
      contactPhone: contactPhone || '',
      currentLocation,
      membersCount: membersCount || 4,
      zone: zone || null,
    });

    return res.status(201).json({ success: true, data: team });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
