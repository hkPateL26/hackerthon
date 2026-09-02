import L from 'leaflet';
import type { CameraStatus } from '../../../types/camera';

export const STATUS_COLORS: Record<CameraStatus, { bg: string; border: string; label: string; symbol: string }> = {
  ONLINE: {
    bg: '#10b981',
    border: '#059669',
    label: 'Online',
    symbol: '●',
  },
  OFFLINE: {
    bg: '#ef4444',
    border: '#dc2626',
    label: 'Offline',
    symbol: '■',
  },
  MAINTENANCE: {
    bg: '#f59e0b',
    border: '#d97706',
    label: 'Maintenance',
    symbol: '▲',
  },
  DISABLED: {
    bg: '#6b7280',
    border: '#4b5563',
    label: 'Disabled',
    symbol: '✖',
  },
  UNKNOWN: {
    bg: '#06b6d4',
    border: '#0891b2',
    label: 'Unknown',
    symbol: '◆',
  },
};

export function createCameraIcon(status: CameraStatus, isSelected = false): L.DivIcon {
  const config = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  const size = isSelected ? 38 : 32;
  const shadowColor = isSelected ? 'rgba(59, 130, 246, 0.8)' : 'rgba(0, 0, 0, 0.5)';

  const svgHtml = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 3px 6px ${shadowColor});
      cursor: pointer;
      transition: transform 0.2s ease;
    ">
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Pin Shape -->
        <path d="M18 34C18 34 31 22.5 31 14C31 6.8203 25.1797 1 18 1C10.8203 1 5 6.8203 5 14C5 22.5 18 34 18 34Z" 
              fill="${config.bg}" 
              stroke="${isSelected ? '#ffffff' : config.border}" 
              stroke-width="${isSelected ? 2.5 : 1.5}"/>
        <!-- Inner Camera Glyph -->
        <circle cx="18" cy="14" r="8" fill="#ffffff" />
        <circle cx="18" cy="14" r="4.5" fill="${config.bg}" />
        <circle cx="19.5" cy="12.5" r="1.5" fill="#ffffff" />
      </svg>
      ${
        isSelected
          ? `<div style="
              position: absolute;
              bottom: -6px;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #3b82f6;
              box-shadow: 0 0 8px #3b82f6;
            "></div>`
          : ''
      }
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-camera-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

export function createClusterIcon(count: number): L.DivIcon {
  let size = 36;
  let bgGradient = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';

  if (count > 20) {
    size = 48;
    bgGradient = 'linear-gradient(135deg, #ef4444, #b91c1c)';
  } else if (count > 8) {
    size = 42;
    bgGradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
  }

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${bgGradient};
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: ${size > 40 ? 14 : 12}px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4), 0 0 0 3px rgba(255, 255, 255, 0.3);
      cursor: pointer;
      user-select: none;
      transition: transform 0.15s ease;
    ">
      <span>${count}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-camera-cluster',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
