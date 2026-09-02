import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MapPage } from '../pages/MapPage';
import { cameraService } from '../services/camera.service';
import { useAuthStore } from '../store/authStore';
import type { District, PoliceStation } from '../types/camera';
import type { CameraGeoJSONFeatureCollection } from '../types/gis';

vi.mock('../services/camera.service');

// Mock Leaflet and React-Leaflet for jsdom environment
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, position, eventHandlers }: any) => (
    <div
      data-testid="map-marker"
      data-position={JSON.stringify(position)}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="map-popup">{children}</div>,
  useMap: () => ({
    getZoom: () => 8,
    getBounds: () => ({
      getWest: () => 68.0,
      getSouth: () => 20.0,
      getEast: () => 75.0,
      getNorth: () => 25.0,
    }),
    on: vi.fn(),
    off: vi.fn(),
    flyTo: vi.fn(),
    flyToBounds: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  }),
}));

const mockDistricts: District[] = [
  { id: 'd1111111-0001-4001-a001-000000000001', name: 'Ahmedabad City', code: 'AHM' },
  { id: 'd1111111-0002-4001-a001-000000000002', name: 'Surat City', code: 'SUR' },
];

const mockPoliceStations: PoliceStation[] = [
  {
    id: 'e1111111-0001-4001-a001-000000000001',
    districtId: 'd1111111-0001-4001-a001-000000000001',
    name: 'Satellite Police Station',
    code: 'PS-AHM-SAT',
  },
];

const mockGeoJSON: CameraGeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [72.5074, 23.0305], // [lon, lat]
      },
      properties: {
        id: 'c1111111-0001-4001-a001-000000000001',
        cameraCode: 'CAM-AHM-001',
        name: 'Iskcon Cross Road Pan-Tilt-Zoom North',
        cameraType: 'PTZ',
        status: 'ONLINE',
        isActive: true,
        district: 'Ahmedabad City',
        policeStation: 'Satellite Police Station',
        locationName: 'Iskcon Junction, SG Highway',
        vendor: 'Hikvision',
        model: 'DS-2DF8442IXS-AELW',
        streamUrl: 'rtsp://***:***@192.168.10.11:554/live',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [72.8532, 21.2185],
      },
      properties: {
        id: 'c1111111-0002-4001-a001-000000000001',
        cameraCode: 'CAM-SUR-001',
        name: 'Varachha Diamond Market Entrance PTZ',
        cameraType: 'PTZ',
        status: 'OFFLINE',
        isActive: true,
        district: 'Surat City',
        policeStation: 'Varachha Police Station',
        locationName: 'Mini Bazaar, Varachha',
        vendor: 'Hikvision',
        model: 'DS-2DE7A432IW-AEB',
        streamUrl: 'rtsp://***:***@192.168.20.11:554/live',
      },
    },
  ],
};

describe('MapPage — GIS Camera Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (cameraService.getDistricts as any).mockResolvedValue(mockDistricts);
    (cameraService.getPoliceStations as any).mockResolvedValue(mockPoliceStations);
    (cameraService.getGeoJSON as any).mockResolvedValue(mockGeoJSON);

    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'admin@police.gujarat.gov.in',
        fullName: 'Admin Officer',
        role: 'ADMIN',
        permissions: [],
        isActive: true,
      },
      accessToken: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  const renderMapPage = () => {
    return render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>,
    );
  };

  it('should render GIS header title and total cameras badge', async () => {
    renderMapPage();

    expect(screen.getByText('GIS Camera Mapping')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('2 Cameras Active')).toBeInTheDocument();
    });
  });

  it('should render filter toolbar with search, district, police station, status, and type options', async () => {
    renderMapPage();

    expect(screen.getByPlaceholderText(/search code, name, vendor, location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by district/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by police station/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by camera type/i)).toBeInTheDocument();
  });

  it('should load and display status legend with counts', async () => {
    renderMapPage();

    await waitFor(() => {
      expect(screen.getByText('Camera Status')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  it('should trigger search query when user types in search input', async () => {
    renderMapPage();

    const searchInput = screen.getByPlaceholderText(/search code, name, vendor, location/i);
    fireEvent.change(searchInput, { target: { value: 'Iskcon' } });

    await waitFor(() => {
      expect(cameraService.getGeoJSON).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Iskcon' }),
      );
    });
  });

  it('should trigger district filtering when selecting a district', async () => {
    renderMapPage();

    await waitFor(() => {
      expect(screen.getByText('Ahmedabad City')).toBeInTheDocument();
    });

    const districtSelect = screen.getByLabelText(/filter by district/i);
    fireEvent.change(districtSelect, {
      target: { value: 'd1111111-0001-4001-a001-000000000001' },
    });

    await waitFor(() => {
      expect(cameraService.getGeoJSON).toHaveBeenCalledWith(
        expect.objectContaining({
          districtId: 'd1111111-0001-4001-a001-000000000001',
        }),
      );
    });
  });

  it('should render empty state message when no cameras match query', async () => {
    (cameraService.getGeoJSON as any).mockResolvedValueOnce({
      type: 'FeatureCollection',
      features: [],
    });

    renderMapPage();

    await waitFor(() => {
      expect(screen.getByText('No Cameras Found in View')).toBeInTheDocument();
    });
  });

  it('should render error alert with retry button when API fails', async () => {
    (cameraService.getGeoJSON as any).mockRejectedValueOnce(
      new Error('Network error loading GeoJSON'),
    );

    renderMapPage();

    await waitFor(() => {
      expect(screen.getByText('Network error loading GeoJSON')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
