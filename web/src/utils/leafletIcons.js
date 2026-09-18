/**
 * utils/leafletIcons.js
 * Custom styled HTML markers for Leaflet.js map.
 */

import L from 'leaflet';

/**
 * Creates a pulsing styled HTML DivIcon for Leaflet
 */
export function createCustomMarker(type, priority = 'medium') {
  let color = '#ef4444';
  let icon = '🆘';
  let pulse = true;

  switch (type) {
    case 'medical':
      color = '#ef4444';
      icon = '🩺';
      break;
    case 'trapped':
      color = '#f97316';
      icon = '🧱';
      break;
    case 'fire':
      color = '#dc2626';
      icon = '🔥';
      break;
    case 'flood':
      color = '#2563eb';
      icon = '🌊';
      break;
    case 'safe_checkin':
      color = '#10b981';
      icon = '💚';
      pulse = false;
      break;
    case 'team':
      color = '#8b5cf6';
      icon = '🚑';
      pulse = false;
      break;
    case 'water':
      color = '#06b6d4';
      icon = '💧';
      pulse = false;
      break;
    case 'hazard_road':
      color = '#eab308';
      icon = '🚧';
      pulse = false;
      break;
    default:
      color = '#6b7280';
      icon = '⚠️';
      break;
  }

  const isCritical = priority === 'critical';

  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${isCritical ? '42px' : '36px'};
      height: ${isCritical ? '42px' : '36px'};
      background-color: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5), 0 0 12px ${color}88;
      font-size: ${isCritical ? '20px' : '16px'};
      cursor: pointer;
      transition: transform 0.2s;
    ">
      ${pulse ? `<div style="
        position: absolute;
        top: -6px; left: -6px; right: -6px; bottom: -6px;
        border-radius: 50%;
        border: 2px solid ${color};
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        opacity: 0.75;
      "></div>` : ''}
      <span>${icon}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}
