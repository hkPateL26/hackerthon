import React, { useState } from 'react';
import type { TrackedObjectItem } from '../types/tracking';
import styles from './ActiveTracksPanel.module.css';

interface ActiveTracksPanelProps {
  tracks: TrackedObjectItem[];
  selectedCameraCode?: string;
  onSelectTrack?: (track: TrackedObjectItem) => void;
}

export const ActiveTracksPanel: React.FC<ActiveTracksPanelProps> = ({
  tracks,
  selectedCameraCode,
  onSelectTrack,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const filteredTracks = tracks.filter((t) => {
    if (filterCategory === 'PERSON') return t.category === 'PERSON';
    if (filterCategory === 'VEHICLE') return t.category === 'VEHICLE';
    return true;
  });

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>
            🎯 Active Tracks {selectedCameraCode ? `(${selectedCameraCode})` : ''}
          </span>
          <span className={styles.countPill}>{filteredTracks.length}</span>
        </div>

        <div className={styles.controls}>
          <select
            className={styles.filterSelect}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter active tracks by category"
          >
            <option value="ALL">All Categories</option>
            <option value="PERSON">Persons Only</option>
            <option value="VEHICLE">Vehicles Only</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {filteredTracks.length === 0 ? (
          <div className={styles.emptyState}>
            No active tracks in the current view. Start camera feeds with AI analytics enabled.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Track ID</th>
                <th>Category</th>
                <th>Class</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Frames</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.map((track) => (
                <tr
                  key={`track-${track.sessionId || 'session'}-${track.trackId}`}
                  className={styles.row}
                  onClick={() => onSelectTrack && onSelectTrack(track)}
                >
                  <td className={styles.trackIdCell}>#{track.trackId}</td>
                  <td>
                    <span
                      className={`${styles.categoryBadge} ${
                        track.category === 'PERSON' ? styles.badgePerson : styles.badgeVehicle
                      }`}
                    >
                      {track.category}
                    </span>
                  </td>
                  <td>{track.detectedClass}</td>
                  <td>
                    {track.confidence !== null
                      ? `${Math.round(track.confidence * 100)}%`
                      : '—'}
                  </td>
                  <td
                    className={
                      track.status === 'ACTIVE'
                        ? styles.statusActive
                        : styles.statusLost
                    }
                  >
                    {track.status}
                  </td>
                  <td>{track.detectionCount}</td>
                  <td>
                    {track.lastSeenAt
                      ? new Date(track.lastSeenAt).toLocaleTimeString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
