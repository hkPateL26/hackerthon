import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Camera, District, PoliceStation } from '../../../types/camera';
import { cameraService } from '../../../services/camera.service';
import styles from './CameraPicker.module.css';

interface CameraPickerProps {
  targetSlotId: string | null;
  assignedCameraIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: (slotId: string, camera: Camera) => void;
}

export const CameraPicker: React.FC<CameraPickerProps> = ({
  targetSlotId,
  assignedCameraIds,
  isOpen,
  onClose,
  onSelectCamera,
}) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [policeStations, setPoliceStations] = useState<PoliceStation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const limit = 8;

  // Filter state
  const [search, setSearch] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load master dropdown data
  useEffect(() => {
    if (!isOpen) return;
    cameraService.getDistricts().then(setDistricts).catch(() => {});
    cameraService.getPoliceStations().then(setPoliceStations).catch(() => {});
  }, [isOpen]);

  // Fetch cameras from backend
  const fetchCameras = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await cameraService.getCameras({
        page,
        limit,
        search: search.trim() || undefined,
        districtId: selectedDistrict || undefined,
        policeStationId: selectedStation || undefined,
        status: (selectedStatus as any) || undefined,
        cameraType: (selectedType as any) || undefined,
      });
      setCameras(response.items);
      setTotal(response.total);
    } catch {
      setCameras([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, selectedDistrict, selectedStation, selectedStatus, selectedType]);

  // Trigger search with debounce
  useEffect(() => {
    if (!isOpen) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchCameras();
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isOpen, fetchCameras]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedDistrict('');
    setSelectedStation('');
    setSelectedStatus('');
    setSelectedType('');
    setPage(1);
  };

  const handleAssign = (camera: Camera) => {
    if (!targetSlotId) return;
    onSelectCamera(targetSlotId, camera);
    onClose();
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return <span className={`${styles.badge} ${styles.badgeOnline}`}>Online</span>;
      case 'OFFLINE':
        return <span className={`${styles.badge} ${styles.badgeOffline}`}>Offline</span>;
      case 'MAINTENANCE':
        return <span className={`${styles.badge} ${styles.badgeMaintenance}`}>Maint</span>;
      default:
        return <span className={styles.badge}>{status}</span>;
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Camera Picker">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>Select Camera for Grid</h2>
            {targetSlotId && <span className={styles.slotTag}>{targetSlotId.toUpperCase()}</span>}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className={styles.filterSection}>
          <div className={styles.searchBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search camera code, name, location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              id="camera-picker-search"
            />
          </div>

          <div className={styles.filterRow}>
            <select
              className={styles.select}
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by District"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              className={styles.select}
              value={selectedStation}
              onChange={(e) => {
                setSelectedStation(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Police Station"
            >
              <option value="">All Police Stations</option>
              {policeStations
                .filter((ps) => !selectedDistrict || ps.districtId === selectedDistrict)
                .map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    {ps.name}
                  </option>
                ))}
            </select>

            <select
              className={styles.select}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Status"
            >
              <option value="">All Statuses</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="DISABLED">Disabled</option>
            </select>

            <select
              className={styles.select}
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Camera Type"
            >
              <option value="">All Types</option>
              <option value="FIXED">Fixed</option>
              <option value="PTZ">PTZ</option>
              <option value="DOME">Dome</option>
              <option value="BULLET">Bullet</option>
              <option value="ANPR">ANPR</option>
            </select>

            {(search || selectedDistrict || selectedStation || selectedStatus || selectedType) && (
              <button type="button" className={styles.clearBtn} onClick={handleClearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Camera List */}
        <div className={styles.listContainer}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <span>Loading cameras...</span>
            </div>
          ) : cameras.length === 0 ? (
            <div className={styles.emptyState}>
              <span>No cameras found matching your criteria.</span>
            </div>
          ) : (
            cameras.map((cam) => {
              const isAlreadyAssigned = assignedCameraIds.includes(cam.id);
              return (
                <div
                  key={cam.id}
                  className={`${styles.cameraCard} ${isAlreadyAssigned ? styles.cardDisabled : ''}`}
                >
                  <div className={styles.cameraInfo}>
                    <div className={styles.topInfo}>
                      <span className={styles.cameraCode}>{cam.cameraCode}</span>
                      <span className={styles.cameraName}>{cam.name}</span>
                      {getStatusBadge(cam.status)}
                      <span className={`${styles.badge} ${styles.badgeType}`}>{cam.cameraType}</span>
                      {!cam.isActive && (
                        <span className={`${styles.badge} ${styles.badgeOffline}`}>Disabled</span>
                      )}
                    </div>
                    <div className={styles.metaInfo}>
                      <span>📍 {cam.locationName || 'N/A'}</span>
                      <span>🏛️ {cam.district?.name || 'N/A'}</span>
                      <span>🚔 {cam.policeStation?.name || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    {isAlreadyAssigned ? (
                      <span className={styles.alreadyBadge}>Already in Grid</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.assignBtn}
                        onClick={() => handleAssign(cam)}
                        id={`assign-cam-${cam.cameraCode}`}
                      >
                        Assign to Slot
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <div className={styles.pagination}>
          <span>
            Showing {cameras.length} of {total} cameras
          </span>
          <div>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span style={{ margin: '0 0.6rem' }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
