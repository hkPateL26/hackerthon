import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cameraService } from '../services/camera.service';
import type { District, PoliceStation } from '../types/camera';
import type {
  CameraGeoJSONFeatureCollection,
  CameraGeoJSONProperties,
  GISFilterState,
} from '../types/gis';
import { MapFilterToolbar } from '../modules/gis/components/MapFilterToolbar';
import { CameraMap } from '../modules/gis/components/CameraMap';
import styles from './MapPage.module.css';

const initialFilters: GISFilterState = {
  search: '',
  districtId: '',
  policeStationId: '',
  status: '',
  cameraType: '',
  isActive: true,
};

export const MapPage: React.FC = () => {
  const [filters, setFilters] = useState<GISFilterState>(initialFilters);
  const [geoData, setGeoData] = useState<CameraGeoJSONFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });
  const [districts, setDistricts] = useState<District[]>([]);
  const [policeStations, setPoliceStations] = useState<PoliceStation[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraGeoJSONProperties | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Load Master Districts & Police Stations
  useEffect(() => {
    let mounted = true;
    Promise.all([cameraService.getDistricts(), cameraService.getPoliceStations()])
      .then(([distList, psList]) => {
        if (mounted) {
          setDistricts(distList);
          setPoliceStations(psList);
        }
      })
      .catch((err) => {
        console.error('Failed to load GIS master data:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Fetch GeoJSON from backend based on filters
  const fetchCamerasGeoJSON = useCallback(
    async (activeFilters: GISFilterState) => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await cameraService.getGeoJSON({
          search: activeFilters.search ? activeFilters.search.trim() : undefined,
          districtId: activeFilters.districtId || undefined,
          policeStationId: activeFilters.policeStationId || undefined,
          status: (activeFilters.status as any) || undefined,
          cameraType: (activeFilters.cameraType as any) || undefined,
          isActive: activeFilters.isActive,
        });

        // Runtime GeoJSON verification
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          setGeoData(data);
          if (
            !activeFilters.search &&
            !activeFilters.districtId &&
            !activeFilters.policeStationId &&
            !activeFilters.status &&
            !activeFilters.cameraType
          ) {
            setTotalCount(data.features.length);
          }
        } else {
          setGeoData({ type: 'FeatureCollection', features: [] });
        }
      } catch (err: any) {
        console.error('Error loading camera GeoJSON:', err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Failed to load camera geographic data from server',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // 3. Debounce filter changes (especially for search typing)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchCamerasGeoJSON(filters);
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters, fetchCamerasGeoJSON]);

  const handleFilterChange = (newFilters: Partial<GISFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  const handleRefresh = () => {
    fetchCamerasGeoJSON(filters);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>GIS Camera Mapping</h1>
          <span className={styles.countBadge} id="gis-header-badge">
            {isLoading ? '...' : `${geoData.features.length} Cameras Active`}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>{error}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <MapFilterToolbar
        filters={filters}
        districts={districts}
        policeStations={policeStations}
        matchingCount={geoData.features.length}
        totalCount={totalCount || geoData.features.length}
        isLoading={isLoading}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onRefresh={handleRefresh}
      />

      {/* Interactive Map */}
      <CameraMap
        features={geoData.features}
        selectedCamera={selectedCamera}
        isLoading={isLoading}
        onSelectCamera={setSelectedCamera}
      />
    </div>
  );
};
