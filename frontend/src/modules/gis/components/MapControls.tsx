import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CameraGeoJSONFeature } from '../../../types/gis';
import styles from './MapControls.module.css';

interface MapControlsProps {
  features: CameraGeoJSONFeature[];
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

export const GUJARAT_DEFAULT_CENTER: [number, number] = [22.8, 71.8];
export const GUJARAT_DEFAULT_ZOOM = 7.5;

export const MapControls: React.FC<MapControlsProps> = ({
  features,
  defaultCenter = GUJARAT_DEFAULT_CENTER,
  defaultZoom = GUJARAT_DEFAULT_ZOOM,
}) => {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleResetToGujarat = () => {
    map.flyTo(defaultCenter, defaultZoom, { duration: 0.6 });
  };

  const handleFitToCameras = () => {
    if (features.length === 0) {
      handleResetToGujarat();
      return;
    }

    const latLngs = features.map(
      (f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number],
    );
    const bounds = L.latLngBounds(latLngs);
    map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 0.6 });
  };

  return (
    <div className={styles.controlsWrapper} aria-label="Map Navigation Controls">
      <div className={styles.buttonGroup}>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom in on map"
        >
          +
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom out on map"
        >
          −
        </button>
      </div>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleFitToCameras}
          title="Fit view to all filtered cameras"
          aria-label="Fit map to cameras"
          id="map-fit-cameras-btn"
        >
          <span>🎯</span> Fit Cameras
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleResetToGujarat}
          title="Reset map view to Gujarat state"
          aria-label="Reset map to Gujarat"
          id="map-reset-gujarat-btn"
        >
          <span>🏛️</span> Gujarat View
        </button>
      </div>
    </div>
  );
};
