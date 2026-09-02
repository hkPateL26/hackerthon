import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analytics.service';
import type { DetectionEvent, DetectedCategory } from '../types/analytics';
import styles from './RecentDetectionsDrawer.module.css';

interface RecentDetectionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCameraId?: string | null;
}

export const RecentDetectionsDrawer: React.FC<RecentDetectionsDrawerProps> = ({
  isOpen,
  onClose,
  selectedCameraId,
}) => {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [filterCategory, setFilterCategory] = useState<DetectedCategory | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const res = await analyticsService.getEvents({
        cameraId: selectedCameraId || undefined,
        category: filterCategory === 'ALL' ? undefined : filterCategory,
        limit: 30,
      });
      setEvents(res.items || []);
    } catch {
      // Keep existing list on failure
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
      const interval = setInterval(fetchEvents, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, selectedCameraId, filterCategory]);

  if (!isOpen) return null;

  return (
    <aside className={styles.drawer} id="detections-drawer">
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span>🚨</span> Live Detection Feed
        </h3>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close feed"
        >
          ✕
        </button>
      </div>

      <div className={styles.filterBar}>
        <button
          type="button"
          className={`${styles.filterBtn} ${
            filterCategory === 'ALL' ? styles.filterBtnActive : ''
          }`}
          onClick={() => setFilterCategory('ALL')}
        >
          All
        </button>
        <button
          type="button"
          className={`${styles.filterBtn} ${
            filterCategory === 'PERSON' ? styles.filterBtnActive : ''
          }`}
          onClick={() => setFilterCategory('PERSON')}
        >
          🚶 Person
        </button>
        <button
          type="button"
          className={`${styles.filterBtn} ${
            filterCategory === 'VEHICLE' ? styles.filterBtnActive : ''
          }`}
          onClick={() => setFilterCategory('VEHICLE')}
        >
          🚗 Vehicle
        </button>
      </div>

      <div className={styles.list} id="detections-list">
        {events.length === 0 ? (
          <div className={styles.emptyState}>
            {isLoading ? 'Scanning for detections...' : 'No detections recorded yet.'}
          </div>
        ) : (
          events.map((event) => {
            const isPerson = event.detectedCategory === 'PERSON';
            const icon = isPerson ? '🚶' : '🚗';
            const timeStr = new Date(event.occurredAt).toLocaleTimeString();

            return (
              <div
                key={event.id}
                className={styles.card}
                data-testid={`detection-card-${event.id}`}
                id={`detection-card-${event.id}`}
              >
                <div className={styles.cardHeader}>
                  <span
                    className={`${styles.categoryTag} ${
                      isPerson ? styles.tagPerson : styles.tagVehicle
                    }`}
                  >
                    <span>{icon}</span> {event.detectedCategory} ({event.detectedClass})
                  </span>
                  <span className={styles.confidence}>
                    {Math.round(event.confidence * 100)}%
                  </span>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.cameraInfo}>
                    {event.cameraCode || 'Camera'}
                  </span>
                  <span>{timeStr}</span>
                </div>

                {event.snapshotUrl && (
                  <div
                    className={styles.thumbnailContainer}
                    onClick={() => setSelectedSnapshot(event.snapshotUrl)}
                    title="Click to view full snapshot"
                  >
                    <img
                      src={event.snapshotUrl}
                      alt={`${event.detectedCategory} snapshot`}
                      className={styles.thumbnail}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Full-size snapshot modal preview */}
      {selectedSnapshot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setSelectedSnapshot(null)}
        >
          <img
            src={selectedSnapshot}
            alt="Full detection snapshot"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: 8,
              border: '2px solid #3b82f6',
            }}
          />
        </div>
      )}
    </aside>
  );
};
