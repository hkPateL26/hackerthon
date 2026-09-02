import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { cameraService } from '../services/camera.service';
import type {
  Camera,
  District,
  PoliceStation,
  CameraStatus,
  CameraType,
  CreateCameraInput,
} from '../types/camera';
import styles from './CamerasPage.module.css';

export function CamerasPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isSupervisorOrAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  // Camera list state
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Dropdown master data
  const [districts, setDistricts] = useState<District[]>([]);
  const [policeStations, setPoliceStations] = useState<PoliceStation[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [selectedCameraDetails, setSelectedCameraDetails] = useState<Camera | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateCameraInput>({
    cameraCode: '',
    name: '',
    description: '',
    cameraType: 'FIXED',
    vendor: 'Hikvision',
    model: '',
    serialNumber: '',
    ipAddress: '',
    port: 554,
    rtspUrl: '',
    locationName: '',
    districtId: '',
    policeStationId: '',
    latitude: 23.0305,
    longitude: 72.5074,
    status: 'ONLINE',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Load master dropdown data on mount
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [dList, psList] = await Promise.all([
          cameraService.getDistricts(),
          cameraService.getPoliceStations(),
        ]);
        setDistricts(dList);
        setPoliceStations(psList);
      } catch (err: any) {
        console.error('Failed to load districts/police stations', err);
      }
    }
    loadMasterData();
  }, []);

  // Update police stations when district changes in filter
  const filteredFilterPoliceStations = selectedDistrict
    ? policeStations.filter((ps) => ps.districtId === selectedDistrict)
    : policeStations;

  // Update police stations when district changes in form
  const formFilteredPoliceStations = formData.districtId
    ? policeStations.filter((ps) => ps.districtId === formData.districtId)
    : policeStations;

  // Fetch cameras
  const fetchCameras = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await cameraService.getCameras({
        page,
        limit,
        search: search.trim() || undefined,
        districtId: selectedDistrict || undefined,
        policeStationId: selectedStation || undefined,
        status: (selectedStatus as CameraStatus) || undefined,
        cameraType: (selectedType as CameraType) || undefined,
      });
      setCameras(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to fetch camera registry data',
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedDistrict, selectedStation, selectedStatus, selectedType]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // Clear filters
  const handleClearFilters = () => {
    setSearch('');
    setSelectedDistrict('');
    setSelectedStation('');
    setSelectedStatus('');
    setSelectedType('');
    setPage(1);
  };

  // Open create modal
  const handleOpenAddModal = () => {
    setEditingCamera(null);
    setFormData({
      cameraCode: '',
      name: '',
      description: '',
      cameraType: 'FIXED',
      vendor: 'Hikvision',
      model: '',
      serialNumber: '',
      ipAddress: '',
      port: 554,
      rtspUrl: '',
      locationName: '',
      districtId: districts[0]?.id || '',
      policeStationId: '',
      latitude: 23.0305,
      longitude: 72.5074,
      status: 'ONLINE',
      isActive: true,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (camera: Camera) => {
    setEditingCamera(camera);
    setFormData({
      cameraCode: camera.cameraCode,
      name: camera.name,
      description: camera.description || '',
      cameraType: camera.cameraType,
      vendor: camera.vendor || '',
      model: camera.model || '',
      serialNumber: camera.serialNumber || '',
      ipAddress: camera.ipAddress || '',
      port: camera.port || 554,
      rtspUrl: '', // Redacted on client
      locationName: camera.locationName || '',
      districtId: camera.district?.id || '',
      policeStationId: camera.policeStation?.id || '',
      latitude: camera.latitude,
      longitude: camera.longitude,
      status: camera.status,
      isActive: camera.isActive,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.cameraCode.trim()) errors.cameraCode = 'Camera code is required';
    if (!formData.name.trim()) errors.name = 'Camera name is required';
    if (!formData.districtId) errors.districtId = 'District is required';
    if (!formData.policeStationId) errors.policeStationId = 'Police station is required';

    if (formData.latitude === undefined || isNaN(formData.latitude)) {
      errors.latitude = 'Latitude is required';
    } else if (formData.latitude < -90 || formData.latitude > 90) {
      errors.latitude = 'Latitude must be between -90 and 90';
    }

    if (formData.longitude === undefined || isNaN(formData.longitude)) {
      errors.longitude = 'Longitude is required';
    } else if (formData.longitude < -180 || formData.longitude > 180) {
      errors.longitude = 'Longitude must be between -180 and 180';
    }

    if (formData.port !== undefined && (formData.port < 1 || formData.port > 65535)) {
      errors.port = 'Port must be between 1 and 65535';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save / Update Camera
  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormSubmitting(true);
    try {
      if (editingCamera) {
        await cameraService.updateCamera(editingCamera.id, formData);
      } else {
        await cameraService.createCamera(formData);
      }
      setIsAddModalOpen(false);
      fetchCameras();
    } catch (err: any) {
      setFormErrors({
        submit: err.response?.data?.message || 'Failed to save camera',
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Status update
  const handleStatusChange = async (camera: Camera, newStatus: CameraStatus) => {
    try {
      await cameraService.updateStatus(camera.id, newStatus);
      fetchCameras();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update camera status');
    }
  };

  // Toggle active / inactive
  const handleToggleActive = async (camera: Camera) => {
    try {
      if (camera.isActive) {
        await cameraService.deactivateCamera(camera.id);
      } else {
        await cameraService.activateCamera(camera.id);
      }
      fetchCameras();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle camera activation');
    }
  };

  // Soft delete camera
  const handleDeleteCamera = async (camera: Camera) => {
    if (
      window.confirm(
        `Are you sure you want to deactivate and archive camera '${camera.cameraCode}'?`,
      )
    ) {
      try {
        await cameraService.deleteCamera(camera.id);
        fetchCameras();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete camera');
      }
    }
  };

  // Render status badge
  const renderStatusBadge = (status: CameraStatus) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className={`${styles.statusBadge} ${styles.statusOnline}`}>
            <span className={styles.statusDot} /> Online
          </span>
        );
      case 'OFFLINE':
        return (
          <span className={`${styles.statusBadge} ${styles.statusOffline}`}>
            <span className={styles.statusDot} /> Offline
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className={`${styles.statusBadge} ${styles.statusMaintenance}`}>
            <span className={styles.statusDot} /> Maint.
          </span>
        );
      case 'DISABLED':
        return (
          <span className={`${styles.statusBadge} ${styles.statusDisabled}`}>
            <span className={styles.statusDot} /> Disabled
          </span>
        );
      default:
        return <span className={styles.statusBadge}>{status}</span>;
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>CCTV Camera Registry</h1>
          <span className={styles.countBadge} id="camera-total-count">
            {total} {total === 1 ? 'Camera' : 'Cameras'}
          </span>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => fetchCameras()}
            title="Refresh registry"
          >
            🔄 Refresh
          </button>
          {isAdmin && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleOpenAddModal}
              id="add-camera-btn"
            >
              <span>+</span>
              <span>Register Camera</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={styles.toolbarCard}>
        <div className={styles.filterGrid}>
          {/* Search */}
          <div className={styles.searchInputWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by code, name, vendor, location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              id="camera-search-input"
            />
          </div>

          {/* District Filter */}
          <select
            className={styles.selectInput}
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              setSelectedStation('');
              setPage(1);
            }}
            id="filter-district"
          >
            <option value="">All Districts</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Police Station Filter */}
          <select
            className={styles.selectInput}
            value={selectedStation}
            onChange={(e) => {
              setSelectedStation(e.target.value);
              setPage(1);
            }}
            id="filter-police-station"
          >
            <option value="">All Police Stations</option>
            {filteredFilterPoliceStations.map((ps) => (
              <option key={ps.id} value={ps.id}>
                {ps.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className={styles.selectInput}
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            id="filter-status"
          >
            <option value="">All Statuses</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="DISABLED">Disabled</option>
          </select>

          {/* Camera Type Filter */}
          <select
            className={styles.selectInput}
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            id="filter-type"
          >
            <option value="">All Types</option>
            <option value="FIXED">Fixed</option>
            <option value="PTZ">PTZ</option>
            <option value="DOME">Dome</option>
            <option value="BULLET">Bullet</option>
            <option value="BOX">Box</option>
          </select>

          {/* Clear Button */}
          {(search || selectedDistrict || selectedStation || selectedStatus || selectedType) && (
            <button
              type="button"
              className={styles.btnClearFilters}
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.alertError} role="alert">
          <span>⚠️ {error}</span>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingSkeleton}>
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
          </div>
        ) : cameras.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📷</div>
            <div className={styles.emptyText}>No Cameras Found</div>
            <div className={styles.emptySubtext}>
              No CCTV cameras match your current search and filter criteria.
            </div>
            {isAdmin && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleOpenAddModal}
                style={{ marginTop: '10px' }}
              >
                + Register First Camera
              </button>
            )}
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Camera & Location</th>
                  <th>Jurisdiction</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cameras.map((camera) => (
                  <tr key={camera.id}>
                    <td className={styles.cameraCodeCell}>{camera.cameraCode}</td>
                    <td>
                      <div className={styles.cameraNameCell}>
                        <span className={styles.cameraTitle}>{camera.name}</span>
                        <span className={styles.cameraLocation}>
                          📍 {camera.locationName || 'Location not specified'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.jurisdictionCell}>
                        <span className={styles.districtName}>
                          {camera.district?.name || '—'}
                        </span>
                        <span className={styles.psName}>
                          {camera.policeStation?.name || '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.typeBadge}>{camera.cameraType}</span>
                    </td>
                    <td>
                      {isSupervisorOrAdmin ? (
                        <select
                          className={styles.selectInput}
                          style={{ padding: '3px 8px', fontSize: '12px' }}
                          value={camera.status}
                          onChange={(e) =>
                            handleStatusChange(camera, e.target.value as CameraStatus)
                          }
                          aria-label={`Change status for ${camera.cameraCode}`}
                        >
                          <option value="ONLINE">Online</option>
                          <option value="OFFLINE">Offline</option>
                          <option value="MAINTENANCE">Maintenance</option>
                          <option value="DISABLED">Disabled</option>
                        </select>
                      ) : (
                        renderStatusBadge(camera.status)
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          color: camera.isActive ? '#10b981' : '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        {camera.isActive ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => setSelectedCameraDetails(camera)}
                          title="View Technical Details"
                        >
                          👁️ View
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleOpenEditModal(camera)}
                              title="Edit Camera"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleToggleActive(camera)}
                              title={camera.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {camera.isActive ? '⏸️' : '▶️'}
                            </button>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                              onClick={() => handleDeleteCamera(camera)}
                              title="Deactivate and Archive Camera"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && total > 0 && (
          <div className={styles.paginationBar}>
            <div className={styles.pageInfo}>
              Showing {(page - 1) * limit + 1}–
              {Math.min(page * limit, total)} of {total} cameras
            </div>

            <div className={styles.paginationControls}>
              <select
                className={styles.selectInput}
                style={{ padding: '5px 10px', fontSize: '13px' }}
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>

              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>

              <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Camera Modal */}
      {isAddModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsAddModalOpen(false)}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingCamera ? `Edit Camera (${editingCamera.cameraCode})` : 'Register New CCTV Camera'}
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCamera}>
              <div className={styles.modalBody}>
                {formErrors.submit && (
                  <div className={styles.alertError} role="alert">
                    <span>⚠️ {formErrors.submit}</span>
                  </div>
                )}

                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Camera Code *</label>
                    <input
                      type="text"
                      className={`${styles.formInput} ${formErrors.cameraCode ? styles.formInputError : ''}`}
                      placeholder="e.g. CAM-AHM-005"
                      value={formData.cameraCode}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, cameraCode: e.target.value }))
                      }
                      disabled={!!editingCamera}
                    />
                    {formErrors.cameraCode && (
                      <span className={styles.fieldError}>{formErrors.cameraCode}</span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Camera Name *</label>
                    <input
                      type="text"
                      className={`${styles.formInput} ${formErrors.name ? styles.formInputError : ''}`}
                      placeholder="e.g. SGVP Circle North PTZ"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                    {formErrors.name && (
                      <span className={styles.fieldError}>{formErrors.name}</span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Camera Type</label>
                    <select
                      className={styles.selectInput}
                      value={formData.cameraType}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          cameraType: e.target.value as CameraType,
                        }))
                      }
                    >
                      <option value="FIXED">Fixed</option>
                      <option value="PTZ">PTZ</option>
                      <option value="DOME">Dome</option>
                      <option value="BULLET">Bullet</option>
                      <option value="BOX">Box</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Vendor / Brand</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Hikvision, Dahua, Axis, Bosch..."
                      value={formData.vendor || ''}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, vendor: e.target.value }))
                      }
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Model</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. DS-2DF8442IXS"
                      value={formData.model || ''}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, model: e.target.value }))
                      }
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Serial Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. HK20250912005"
                      value={formData.serialNumber || ''}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, serialNumber: e.target.value }))
                      }
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>IP Address</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="192.168.10.50"
                      value={formData.ipAddress || ''}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, ipAddress: e.target.value }))
                      }
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>RTSP Port</label>
                    <input
                      type="number"
                      className={`${styles.formInput} ${formErrors.port ? styles.formInputError : ''}`}
                      placeholder="554"
                      value={formData.port || 554}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          port: parseInt(e.target.value, 10) || 554,
                        }))
                      }
                    />
                    {formErrors.port && (
                      <span className={styles.fieldError}>{formErrors.port}</span>
                    )}
                  </div>

                  <div className={styles.formFieldFull}>
                    <label className={styles.formLabel}>
                      RTSP Stream URL (Credentials masked automatically)
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="rtsp://admin:password@192.168.10.50:554/live"
                      value={formData.rtspUrl || ''}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, rtspUrl: e.target.value }))
                      }
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>District *</label>
                    <select
                      className={`${styles.selectInput} ${formErrors.districtId ? styles.formInputError : ''}`}
                      value={formData.districtId}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          districtId: e.target.value,
                          policeStationId: '',
                        }))
                      }
                    >
                      <option value="">Select District</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.districtId && (
                      <span className={styles.fieldError}>{formErrors.districtId}</span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Police Station *</label>
                    <select
                      className={`${styles.selectInput} ${formErrors.policeStationId ? styles.formInputError : ''}`}
                      value={formData.policeStationId}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          policeStationId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Police Station</option>
                      {formFilteredPoliceStations.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.policeStationId && (
                      <span className={styles.fieldError}>
                        {formErrors.policeStationId}
                      </span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Latitude (-90 to 90) *</label>
                    <input
                      type="number"
                      step="0.0001"
                      className={`${styles.formInput} ${formErrors.latitude ? styles.formInputError : ''}`}
                      placeholder="23.0305"
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          latitude: parseFloat(e.target.value),
                        }))
                      }
                    />
                    {formErrors.latitude && (
                      <span className={styles.fieldError}>{formErrors.latitude}</span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      Longitude (-180 to 180) *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      className={`${styles.formInput} ${formErrors.longitude ? styles.formInputError : ''}`}
                      placeholder="72.5074"
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          longitude: parseFloat(e.target.value),
                        }))
                      }
                    />
                    {formErrors.longitude && (
                      <span className={styles.fieldError}>{formErrors.longitude}</span>
                    )}
                  </div>

                  <div className={styles.formFieldFull}>
                    <label className={styles.formLabel}>Location Description</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Iskcon Cross Roads, Near Flyover Pillar 12"
                      value={formData.locationName || ''}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          locationName: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={formSubmitting}
                  id="save-camera-submit-btn"
                >
                  {formSubmitting
                    ? 'Saving...'
                    : editingCamera
                    ? 'Update Camera'
                    : 'Register Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Technical Details Modal */}
      {selectedCameraDetails && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedCameraDetails(null)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Camera Details: {selectedCameraDetails.cameraCode}
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSelectedCameraDetails(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Camera Name</span>
                  <span className={styles.detailValue}>{selectedCameraDetails.name}</span>
                </div>

                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Camera Type</span>
                  <span className={styles.detailValue}>
                    <span className={styles.typeBadge}>
                      {selectedCameraDetails.cameraType}
                    </span>
                  </span>
                </div>

                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>District</span>
                  <span className={styles.detailValue}>
                    {selectedCameraDetails.district?.name || '—'} (
                    {selectedCameraDetails.district?.code})
                  </span>
                </div>

                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Police Station</span>
                  <span className={styles.detailValue}>
                    {selectedCameraDetails.policeStation?.name || '—'}
                  </span>
                </div>

                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Vendor & Model</span>
                  <span className={styles.detailValue}>
                    {selectedCameraDetails.vendor || 'Unknown'} —{' '}
                    {selectedCameraDetails.model || 'N/A'}
                  </span>
                </div>

                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>IP & Port</span>
                  <span className={styles.detailValue}>
                    {selectedCameraDetails.ipAddress || '—'}:{selectedCameraDetails.port}
                  </span>
                </div>

                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Coordinates (WGS84)</span>
                  <span className={styles.detailValue}>
                    <span className={styles.coordBadge}>
                      Lat: {selectedCameraDetails.latitude.toFixed(5)}, Lon:{' '}
                      {selectedCameraDetails.longitude.toFixed(5)}
                    </span>
                  </span>
                </div>

                <div className={styles.detailCard}>
                  <span className={styles.detailLabel}>Status & Lifecycle</span>
                  <span className={styles.detailValue}>
                    {renderStatusBadge(selectedCameraDetails.status)}{' '}
                    {selectedCameraDetails.isActive ? '(Active)' : '(Inactive)'}
                  </span>
                </div>

                <div className={styles.detailCard} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.detailLabel}>Location Description</span>
                  <span className={styles.detailValue}>
                    📍 {selectedCameraDetails.locationName || 'N/A'}
                  </span>
                </div>

                {selectedCameraDetails.streamUrl && (
                  <div className={styles.detailCard} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>
                      Sanitized RTSP Stream URL
                    </span>
                    <div className={styles.streamUrlBox}>
                      {selectedCameraDetails.streamUrl}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setSelectedCameraDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
