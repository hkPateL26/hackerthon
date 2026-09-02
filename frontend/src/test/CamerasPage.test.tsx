import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CamerasPage } from '../pages/CamerasPage';
import { cameraService } from '../services/camera.service';
import { useAuthStore } from '../store/authStore';
import type { Camera, District, PoliceStation } from '../types/camera';

vi.mock('../services/camera.service');

const mockDistricts: District[] = [
  { id: 'd1', name: 'Ahmedabad City', code: 'AHM' },
  { id: 'd2', name: 'Surat City', code: 'SUR' },
];

const mockPoliceStations: PoliceStation[] = [
  { id: 'p1', districtId: 'd1', name: 'Satellite Police Station', code: 'PS-AHM-SAT' },
];

const mockCameras: Camera[] = [
  {
    id: 'c1',
    cameraCode: 'CAM-AHM-001',
    name: 'Iskcon Cross Road Pan-Tilt-Zoom North',
    description: 'High definition PTZ camera',
    cameraType: 'PTZ',
    vendor: 'Hikvision',
    model: 'DS-2DF8442IXS-AELW',
    serialNumber: 'HK123',
    ipAddress: '192.168.10.11',
    port: 554,
    streamUrl: 'rtsp://***:***@192.168.10.11:554/live',
    locationName: 'Iskcon Junction, SG Highway',
    district: mockDistricts[0],
    policeStation: mockPoliceStations[0],
    latitude: 23.0305,
    longitude: 72.5074,
    status: 'ONLINE',
    isActive: true,
    installedAt: '2025-01-15T10:00:00Z',
    lastSeenAt: '2025-03-01T12:00:00Z',
    metadata: {},
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
];

describe('CamerasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (cameraService.getDistricts as any).mockResolvedValue(mockDistricts);
    (cameraService.getPoliceStations as any).mockResolvedValue(mockPoliceStations);
    (cameraService.getCameras as any).mockResolvedValue({
      items: mockCameras,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  const renderWithAuth = (role: 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' = 'ADMIN') => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'test@police.gujarat.gov.in',
        fullName: 'Test Officer',
        role,
        permissions: [],
        isActive: true,
      },
      accessToken: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    return render(
      <MemoryRouter>
        <CamerasPage />
      </MemoryRouter>,
    );
  };

  it('should render page title and camera items in table', async () => {
    renderWithAuth('ADMIN');

    expect(screen.getByText('CCTV Camera Registry')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument();
      expect(screen.getByText('Iskcon Cross Road Pan-Tilt-Zoom North')).toBeInTheDocument();
      expect(screen.getAllByText('Ahmedabad City').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should display Register Camera button for ADMIN', async () => {
    const { container } = renderWithAuth('ADMIN');

    await waitFor(() => {
      expect(container.querySelector('#add-camera-btn')).toBeInTheDocument();
    });
  });

  it('should NOT display Register Camera or Edit/Delete buttons for OPERATOR', async () => {
    const { container } = renderWithAuth('OPERATOR');

    await waitFor(() => {
      expect(container.querySelector('#add-camera-btn')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Edit Camera')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Deactivate and Archive Camera')).not.toBeInTheDocument();
    });
  });

  it('should open Technical Details modal when clicking View', async () => {
    renderWithAuth('ADMIN');

    await waitFor(() => {
      expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument();
    });

    const viewBtn = screen.getByTitle('View Technical Details');
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getByText('Camera Details: CAM-AHM-001')).toBeInTheDocument();
      expect(screen.getByText('rtsp://***:***@192.168.10.11:554/live')).toBeInTheDocument();
    });
  });

  it('should show empty state when no cameras found', async () => {
    (cameraService.getCameras as any).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    renderWithAuth('ADMIN');

    await waitFor(() => {
      expect(screen.getByText('No Cameras Found')).toBeInTheDocument();
    });
  });

  it('should trigger search query when user types in search box', async () => {
    renderWithAuth('ADMIN');

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by code/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by code/i);
    fireEvent.change(searchInput, { target: { value: 'Iskcon' } });

    await waitFor(() => {
      expect(cameraService.getCameras).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Iskcon' }),
      );
    });
  });

  it('should validate form and prevent submission on empty required fields', async () => {
    const { container } = renderWithAuth('ADMIN');

    await waitFor(() => {
      expect(container.querySelector('#add-camera-btn')).toBeInTheDocument();
    });

    const addBtn = container.querySelector('#add-camera-btn')!;
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Register New CCTV Camera')).toBeInTheDocument();
    });

    const submitBtn = container.querySelector('#save-camera-submit-btn')!;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Camera code is required')).toBeInTheDocument();
      expect(screen.getByText('Camera name is required')).toBeInTheDocument();
    });
  });
});
