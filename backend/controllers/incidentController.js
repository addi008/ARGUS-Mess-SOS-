/**
 * controllers/incidentController.js
 * Incident Command System (ICS) controller for triage, team assignment, and resolution.
 */

const Incident = require('../models/Incident');
const RescueTeam = require('../models/RescueTeam');
const AuditLog = require('../models/AuditLog');
const { haversineDistanceKm } = require('../utils/security');

// @desc    Get all incidents with filtering & pagination
// @route   GET /api/incidents
// @access  Private / Public
exports.getIncidents = async (req, res) => {
  try {
    const { status, priority, emergencyType, zone, limit = 100 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (emergencyType) query.emergencyType = emergencyType;
    if (zone) query.zone = zone;

    const incidents = await Incident.find(query)
      .populate('assignedTeam')
      .populate('assignedToUser', 'name email')
      .populate('zone')
      .populate('sosRecords')
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get single incident with nearest team suggestions
// @route   GET /api/incidents/:id
// @access  Private
exports.getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('assignedTeam')
      .populate('assignedToUser', 'name email')
      .populate('zone')
      .populate('sosRecords');

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    // Auto-suggest nearest available teams
    let suggestedTeams = [];
    if (incident.location && incident.location.lat) {
      const availableTeams = await RescueTeam.find({ status: { $ne: 'offline' } });
      suggestedTeams = availableTeams
        .map(team => {
          const distanceKm = haversineDistanceKm(
            incident.location.lat,
            incident.location.lng,
            team.currentLocation.lat,
            team.currentLocation.lng
          );
          return {
            ...team.toObject(),
            distanceKm: Math.round(distanceKm * 10) / 10,
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5);
    }

    return res.status(200).json({
      success: true,
      data: incident,
      suggestedTeams,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Assign rescue team to incident
// @route   PATCH /api/incidents/:id/assign
// @access  Private (Coordinator/Admin)
exports.assignTeam = async (req, res) => {
  try {
    const { teamId, note } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const team = await RescueTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Rescue team not found' });
    }

    incident.assignedTeam = team._id;
    incident.status = 'assigned';
    if (req.user) incident.assignedToUser = req.user._id;

    if (note) {
      incident.notes.push({
        author: req.user ? req.user.name : 'Dispatcher',
        content: `Team ${team.name} assigned. Note: ${note}`,
      });
    }

    await incident.save();

    // Update team status to busy/dispatched
    team.status = 'dispatched';
    await team.save();

    // Audit log
    if (req.user) {
      await AuditLog.create({
        actor: {
          userId: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
        action: 'ASSIGN_RESCUE_TEAM',
        targetType: 'Incident',
        targetId: incident._id.toString(),
        details: { teamName: team.name, teamId: team._id, incidentCode: incident.incidentCode },
        ipAddress: req.ip || '127.0.0.1',
      }).catch(err => console.error('AuditLog error:', err.message));
    }

    // Emit live update
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_update', {
        type: 'ASSIGNED',
        incident,
        team,
      });
    }

    return res.status(200).json({
      success: true,
      data: incident,
      team,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Mark incident as resolved
// @route   PATCH /api/incidents/:id/resolve
// @access  Private (Coordinator/Admin)
exports.resolveIncident = async (req, res) => {
  try {
    const { resolutionSummary } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.resolutionSummary = resolutionSummary || 'Resolved by command centre team.';

    incident.notes.push({
      author: req.user ? req.user.name : 'Dispatcher',
      content: `Incident marked as RESOLVED. Summary: ${incident.resolutionSummary}`,
    });

    await incident.save();

    // If team was assigned, free them up
    if (incident.assignedTeam) {
      await RescueTeam.findByIdAndUpdate(incident.assignedTeam, { status: 'available' });
    }

    // Audit log
    if (req.user) {
      await AuditLog.create({
        actor: {
          userId: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
        action: 'RESOLVE_INCIDENT',
        targetType: 'Incident',
        targetId: incident._id.toString(),
        details: { incidentCode: incident.incidentCode, resolutionSummary },
        ipAddress: req.ip || '127.0.0.1',
      }).catch(err => console.error('AuditLog error:', err.message));
    }

    // Emit live update
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_update', {
        type: 'RESOLVED',
        incident,
      });
    }

    return res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
