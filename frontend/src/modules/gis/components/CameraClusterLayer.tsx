import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useMap, Marker, Popup } from 'react-leaflet';
import Supercluster from 'supercluster';
import type { CameraGeoJSONFeature, CameraGeoJSONProperties } from '../../../types/gis';
import { createCameraIcon, createClusterIcon, STATUS_COLORS } from '../utils/markerIcons';
import styles from './CameraClusterLayer.module.css';

interface CameraClusterLayerProps {
  features: CameraGeoJSONFeature[];
  selectedCameraId?: string;
  onSelectCamera: (camera: CameraGeoJSONProperties) => void;
}

export const CameraClusterLayer: React.FC<CameraClusterLayerProps> = ({
  features,
  selectedCameraId,
  onSelectCamera,
}) => {
  const map = useMap();
  const [zoom, setZoom] = useState(() => Math.round(map.getZoom()));
  const [bounds, setBounds] = useState<[number, number, number, number]>(() => {
    const b = map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  });

  // 1. Initialize Supercluster index
  const superclusterIndex = useMemo(() => {
    const index = new Supercluster<CameraGeoJSONProperties>({
      radius: 50,
      maxZoom: 16,
      minPoints: 2,
    });

    index.load(features as any);
    return index;
  }, [features]);

  // 2. Update bounds & zoom on map move
  const updateMapState = useCallback(() => {
    const b = map.getBounds();
    setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    setZoom(Math.round(map.getZoom()));
  }, [map]);

  useEffect(() => {
    map.on('moveend', updateMapState);
    map.on('zoomend', updateMapState);
    return () => {
      map.off('moveend', updateMapState);
      map.off('zoomend', updateMapState);
    };
  }, [map, updateMapState]);

  // 3. Compute active clusters & single points in current viewport
  const clusters = useMemo(() => {
    try {
      return superclusterIndex.getClusters(bounds, zoom);
    } catch {
      return [];
    }
  }, [superclusterIndex, bounds, zoom]);

  // 4. Handle cluster click (zoom in to expand)
  const handleClusterClick = (clusterId: number, coordinates: [number, number]) => {
    const [lng, lat] = coordinates;
    const expansionZoom = Math.min(
      superclusterIndex.getClusterExpansionZoom(clusterId),
      18,
    );
    map.flyTo([lat, lng], expansionZoom, { duration: 0.5 });
  };

  return (
    <>
      {clusters.map((cluster) => {
        const [lng, lat] = cluster.geometry.coordinates;
        const rawProps = cluster.properties as any;
        const isCluster = Boolean(rawProps?.cluster);

        if (isCluster) {
          const clusterId = rawProps.cluster_id as number;
          const pointCount = rawProps.point_count as number;

          return (
            <Marker
              key={`cluster-${clusterId}-${lng}-${lat}`}
              position={[lat, lng]}
              icon={createClusterIcon(pointCount)}
              eventHandlers={{
                click: () => handleClusterClick(clusterId, [lng, lat]),
              }}
            />
          );
        }

        // Single Camera Point
        const properties = cluster.properties as unknown as CameraGeoJSONProperties;
        const isSelected = properties.id === selectedCameraId;
        const statusConfig = STATUS_COLORS[properties.status] || STATUS_COLORS.UNKNOWN;

        return (
          <Marker
            key={`cam-${properties.id}`}
            position={[lat, lng]}
            icon={createCameraIcon(properties.status, isSelected)}
            eventHandlers={{
              click: () => onSelectCamera(properties),
            }}
          >
            <Popup className={styles.popupWrapper}>
              <div className={styles.popupCard}>
                <div className={styles.popupHeader}>
                  <span className={styles.popupCode}>{properties.cameraCode}</span>
                  <span
                    className={styles.statusBadge}
                    style={{
                      backgroundColor: `${statusConfig.bg}22`,
                      color: statusConfig.bg,
                      borderColor: `${statusConfig.bg}66`,
                    }}
                  >
                    {statusConfig.symbol} {statusConfig.label}
                  </span>
                </div>

                <h4 className={styles.popupTitle}>{properties.name}</h4>

                <div className={styles.popupDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>📍 Location:</span>
                    <span className={styles.detailVal}>{properties.locationName || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>🏢 Jurisdiction:</span>
                    <span className={styles.detailVal}>
                      {properties.district} • {properties.policeStation}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>📹 Hardware:</span>
                    <span className={styles.detailVal}>
                      {properties.cameraType} {properties.vendor ? `(${properties.vendor})` : ''}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>🌐 Coordinates:</span>
                    <span className={styles.coordsVal}>
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className={styles.popupFooter}>
                  <button
                    type="button"
                    className={styles.inspectBtn}
                    onClick={() => onSelectCamera(properties)}
                  >
                    🔍 Inspect Details
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
