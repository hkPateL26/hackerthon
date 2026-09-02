import React from 'react';
import type { District, PoliceStation } from '../../../types/camera';
import type { GISFilterState } from '../../../types/gis';
import styles from './MapFilterToolbar.module.css';

interface MapFilterToolbarProps {
  filters: GISFilterState;
  districts: District[];
  policeStations: PoliceStation[];
  matchingCount: number;
  totalCount: number;
  isLoading: boolean;
  onFilterChange: (newFilters: Partial<GISFilterState>) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
}

export const MapFilterToolbar: React.FC<MapFilterToolbarProps> = ({
  filters,
  districts,
  policeStations,
  matchingCount,
  totalCount,
  isLoading,
  onFilterChange,
  onClearFilters,
  onRefresh,
}) => {
  const filteredPoliceStations = filters.districtId
    ? policeStations.filter((ps) => ps.districtId === filters.districtId)
    : policeStations;

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.districtId) ||
    Boolean(filters.policeStationId) ||
    Boolean(filters.status) ||
    Boolean(filters.cameraType) ||
    filters.isActive !== undefined;

  return (
    <div className={styles.toolbarCard} aria-label="Map Filtering Toolbar">
      <div className={styles.filterGrid}>
        {/* Search Input */}
        <div className={styles.searchInputWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            🔍
          </span>
          <input
            id="map-camera-search-input"
            type="text"
            className={styles.searchInput}
            placeholder="Search code, name, vendor, location..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            aria-label="Search cameras on map"
          />
          {filters.search && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => onFilterChange({ search: '' })}
              aria-label="Clear search text"
            >
              ✕
            </button>
          )}
        </div>

        {/* District Filter */}
        <select
          id="map-filter-district"
          className={styles.selectInput}
          value={filters.districtId}
          onChange={(e) => {
            onFilterChange({
              districtId: e.target.value,
              policeStationId: '', // Reset police station when district changes
            });
          }}
          aria-label="Filter by district"
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
          id="map-filter-police-station"
          className={styles.selectInput}
          value={filters.policeStationId}
          onChange={(e) => onFilterChange({ policeStationId: e.target.value })}
          aria-label="Filter by police station"
          disabled={filteredPoliceStations.length === 0}
        >
          <option value="">All Police Stations</option>
          {filteredPoliceStations.map((ps) => (
            <option key={ps.id} value={ps.id}>
              {ps.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          id="map-filter-status"
          className={styles.selectInput}
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="ONLINE">● Online</option>
          <option value="OFFLINE">■ Offline</option>
          <option value="MAINTENANCE">▲ Maintenance</option>
          <option value="DISABLED">✖ Disabled</option>
        </select>

        {/* Camera Type Filter */}
        <select
          id="map-filter-type"
          className={styles.selectInput}
          value={filters.cameraType}
          onChange={(e) => onFilterChange({ cameraType: e.target.value })}
          aria-label="Filter by camera type"
        >
          <option value="">All Types</option>
          <option value="FIXED">Fixed</option>
          <option value="PTZ">PTZ</option>
          <option value="DOME">Dome</option>
          <option value="BULLET">Bullet</option>
          <option value="BOX">Box</option>
        </select>
      </div>

      {/* Toolbar Actions & Matching Count */}
      <div className={styles.toolbarFooter}>
        <div className={styles.counterArea}>
          <span className={styles.countBadge} id="map-cameras-count-badge">
            {isLoading ? 'Loading...' : `${matchingCount} / ${totalCount} Cameras on Map`}
          </span>
          {hasActiveFilters && (
            <span className={styles.activeFilterPill}>Filters Active</span>
          )}
        </div>

        <div className={styles.actionButtons}>
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={onClearFilters}
              id="map-clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={onRefresh}
            title="Refresh map cameras from API"
            aria-label="Refresh map"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
