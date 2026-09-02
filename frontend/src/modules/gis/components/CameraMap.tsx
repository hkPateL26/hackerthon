import React, { useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import type { CameraGeoJSONFeature, CameraGeoJSONProperties } from '../../../types/gis';
import type { CameraStatus } from '../../../types/camera';
import { CameraClusterLayer } from './CameraClusterLayer';
import { MapLegend } from './MapLegend';
import { MapControls, GUJARAT_DEFAULT_CENTER, GUJARAT_DEFAULT_ZOOM } from './MapControls';
import { CameraDetailDrawer } from './CameraDetailDrawer';
import styles from './CameraMap.module.css';

interface CameraMapProps {
  features: CameraGeoJSONFeature[];
  selectedCamera: CameraGeoJSONProperties | null;
  isLoading: boolean;
  onSelectCamera: (camera: CameraGeoJSONProperties | null) => void;
}

export const CameraMap: React.FC<CameraMapProps> = ({
  features,
  selectedCamera,
  isLoading,
  onSelectCamera,
}) => {
  // Compute status counts for legend
  const statusCounts = useMemo(() => {
    const counts: Record<CameraStatus, number> = {
      ONLINE: 0,
      OFFLINE: 0,
      MAINTENANCE: 0,
      DISABLED: 0,
      UNKNOWN: 0,
    };

    for (const f of features) {
      const status = f.properties.status || 'UNKNOWN';
      counts[status] = (counts[status] || 0) + 1;
    }

    return counts;
  }, [features]);

  return (
    <div className={styles.mapContainerWrapper} aria-label="Gujarat Police CCTV Interactive Map">
      {/* Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span>Synchronizing GIS camera telemetry...</span>
        </div>
      )}

      {/* Empty State Overlay */}
      {!isLoading && features.length === 0 && (
        <div className={styles.emptyOverlay}>
          <div className={styles.emptyCard}>
            <span className={styles.emptyIcon}>📍</span>
            <h3>No Cameras Found in View</h3>
            <p>No CCTV cameras match your current filters or bounding area.</p>
          </div>
        </div>
      )}

      <MapContainer
        center={GUJARAT_DEFAULT_CENTER}
        zoom={GUJARAT_DEFAULT_ZOOM}
        zoomControl={false}
        className={styles.leafletMap}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Custom Supercluster Marker Layer */}
        <CameraClusterLayer
          features={features}
          selectedCameraId={selectedCamera?.id}
          onSelectCamera={(cam) => onSelectCamera(cam)}
        />

        {/* Floating Custom Navigation Controls */}
        <div className={styles.topRightControls}>
          <MapControls features={features} />
        </div>

        {/* Floating Status Legend */}
        <div className={styles.bottomLeftLegend}>
          <MapLegend statusCounts={statusCounts} totalCount={features.length} />
        </div>
      </MapContainer>

      {/* Detail Slide Drawer */}
      <CameraDetailDrawer
        camera={selectedCamera}
        onClose={() => onSelectCamera(null)}
      />
    </div>
  );
};
