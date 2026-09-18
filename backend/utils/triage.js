/**
 * utils/triage.js
 * Rule-based NLP and severity scoring engine for SOS distress packets.
 * Analyzes emergency type and free-text message to calculate a priority score from 1 to 10.
 */

// Critical keywords that boost urgency in disaster triage
const CRITICAL_KEYWORDS = [
  'trapped', 'buried', 'bleeding', 'unconscious', 'infant', 'baby', 'child',
  'heart', 'crushed', 'suffocating', 'fire', 'explosion', 'drowning', 'dying',
  'severed', 'urgent', 'critical', 'collapsed', 'under rubble'
];

const HIGH_KEYWORDS = [
  'elderly', 'diabetic', 'fracture', 'broken', 'asthma', 'pregnant', 'oxygen',
  'smoke', 'rising water', 'cut off', 'stranded', 'injured', 'burn', 'blood'
];

const MEDIUM_KEYWORDS = [
  'food', 'water', 'shelter', 'blanket', 'cold', 'fever', 'pain', 'lost'
];

/**
 * Calculates priority score (1 - 10) and priority level
 * @param {string} emergencyType - e.g. 'trapped', 'medical', 'fire', 'flood', 'other', 'safe_checkin'
 * @param {string} message - free-text note from survivor
 * @returns {{ score: number, priority: 'low' | 'medium' | 'high' | 'critical', flags: string[] }}
 */
function calculateTriagePriority(emergencyType, message = '') {
  // Safe check-ins have lowest urgency
  if (emergencyType === 'safe_checkin') {
    return { score: 1, priority: 'low', flags: ['safe_checkin'] };
  }

  let baseScore = 5;
  const flags = [];

  // Base score according to emergency category
  switch (emergencyType) {
    case 'trapped':
      baseScore = 8;
      flags.push('type:trapped');
      break;
    case 'fire':
      baseScore = 8;
      flags.push('type:fire');
      break;
    case 'medical':
      baseScore = 7;
      flags.push('type:medical');
      break;
    case 'flood':
      baseScore = 6;
      flags.push('type:flood');
      break;
    case 'other':
    default:
      baseScore = 4;
      break;
  }

  const text = (message || '').toLowerCase();

  // Scan for critical keywords (+3 boost)
  for (const word of CRITICAL_KEYWORDS) {
    if (text.includes(word)) {
      baseScore += 3;
      flags.push(`keyword:${word}`);
      break;
    }
  }

  // Scan for high keywords (+1.5 boost)
  for (const word of HIGH_KEYWORDS) {
    if (text.includes(word)) {
      baseScore += 1.5;
      flags.push(`keyword:${word}`);
      break;
    }
  }

  // Cap score between 1 and 10
  const finalScore = Math.min(10, Math.max(1, Math.round(baseScore * 10) / 10));

  let priority = 'medium';
  if (finalScore >= 8.5) priority = 'critical';
  else if (finalScore >= 7.0) priority = 'high';
  else if (finalScore <= 3.5) priority = 'low';

  return {
    score: finalScore,
    priority,
    flags,
  };
}

module.exports = {
  calculateTriagePriority,
};
