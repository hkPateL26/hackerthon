-- ============================================================
-- SEED: 002_districts_police_stations_and_cameras
-- Description: Seeds Gujarat police districts, police stations, 14 realistic
--              demo CCTV cameras, and initial camera groups.
--              All UUIDs strictly follow RFC 4122 v4 format (xxxx-xxxx-4xxx-axxx-xxxx).
-- Phase: 3 — Centralized CCTV Camera Registry
-- ============================================================

-- ============================================================
-- 1. SEED DISTRICTS
-- ============================================================
INSERT INTO districts (id, name, code, state) VALUES
('d1111111-0001-4001-a001-000000000001', 'Ahmedabad City', 'AHM', 'Gujarat'),
('d1111111-0002-4001-a001-000000000002', 'Surat City', 'SUR', 'Gujarat'),
('d1111111-0003-4001-a001-000000000003', 'Rajkot City', 'RAJ', 'Gujarat'),
('d1111111-0004-4001-a001-000000000004', 'Vadodara City', 'VAD', 'Gujarat'),
('d1111111-0005-4001-a001-000000000005', 'Gandhinagar', 'GAN', 'Gujarat')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. SEED POLICE STATIONS
-- ============================================================
INSERT INTO police_stations (id, district_id, name, code, contact_number, address) VALUES
-- Ahmedabad
('e1111111-0001-4001-a001-000000000001', 'd1111111-0001-4001-a001-000000000001', 'Satellite Police Station', 'PS-AHM-SAT', '079-26764500', 'Near Shivranjani Cross Roads, Satellite, Ahmedabad'),
('e1111111-0001-4001-a001-000000000002', 'd1111111-0001-4001-a001-000000000001', 'Navrangpura Police Station', 'PS-AHM-NAV', '079-26561200', 'Near Commerce Six Roads, Navrangpura, Ahmedabad'),
-- Surat
('e1111111-0002-4001-a001-000000000001', 'd1111111-0002-4001-a001-000000000002', 'Varachha Police Station', 'PS-SUR-VAR', '0261-2541100', 'Varachha Main Road, Surat'),
('e1111111-0002-4001-a001-000000000002', 'd1111111-0002-4001-a001-000000000002', 'Athwa Lines Police Station', 'PS-SUR-ATH', '0261-2661200', 'Athwa Gate, Ring Road, Surat'),
-- Rajkot
('e1111111-0003-4001-a001-000000000001', 'd1111111-0003-4001-a001-000000000003', 'Pradyuman Nagar Police Station', 'PS-RAJ-PRD', '0281-2441100', 'Near Race Course, Rajkot'),
('e1111111-0003-4001-a001-000000000002', 'd1111111-0003-4001-a001-000000000003', 'Bhaktinagar Police Station', 'PS-RAJ-BHK', '0281-2361200', 'Bhaktinagar Station Road, Rajkot'),
-- Vadodara
('e1111111-0004-4001-a001-000000000001', 'd1111111-0004-4001-a001-000000000004', 'Sayajigunj Police Station', 'PS-VAD-SYJ', '0265-2361100', 'Opposite Railway Station, Sayajigunj, Vadodara'),
('e1111111-0004-4001-a001-000000000002', 'd1111111-0004-4001-a001-000000000004', 'Raopura Police Station', 'PS-VAD-RAO', '0265-2411200', 'Tower Road, Raopura, Vadodara'),
-- Gandhinagar
('e1111111-0005-4001-a001-000000000001', 'd1111111-0005-4001-a001-000000000005', 'Sector 7 Police Station', 'PS-GAN-SEC7', '079-23221100', 'Sector 7 Police Headquarters, Gandhinagar'),
('e1111111-0005-4001-a001-000000000002', 'd1111111-0005-4001-a001-000000000005', 'Infocity Police Station', 'PS-GAN-INFO', '079-23214500', 'Near Infocity Circle, Gandhinagar')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. SEED CAMERAS (14 Realistic Cameras across Gujarat)
-- ============================================================
INSERT INTO cameras (
    id,
    camera_code,
    name,
    description,
    camera_type,
    vendor,
    model,
    serial_number,
    ip_address,
    port,
    rtsp_url,
    location_name,
    district_id,
    police_station_id,
    latitude,
    longitude,
    status,
    is_active,
    installed_at,
    metadata
) VALUES
-- Ahmedabad Cameras
(
    'c1111111-0001-4001-a001-000000000001',
    'CAM-AHM-001',
    'Iskcon Cross Road Pan-Tilt-Zoom North',
    'High definition PTZ camera monitoring SG Highway northbound traffic',
    'PTZ',
    'Hikvision',
    'DS-2DF8442IXS-AELW',
    'HK20250912001',
    '192.168.10.11',
    554,
    'rtsp://admin:SecretPass123@192.168.10.11:554/Streaming/Channels/101',
    'Iskcon Junction, SG Highway',
    'd1111111-0001-4001-a001-000000000001',
    'e1111111-0001-4001-a001-000000000001',
    23.0305,
    72.5074,
    'ONLINE',
    TRUE,
    '2025-01-15T10:00:00Z',
    '{"resolution": "3840x2160", "fps": 30, "night_vision": true, "zoom": "42x"}'::JSONB
),
(
    'c1111111-0001-4001-a001-000000000002',
    'CAM-AHM-002',
    'Shivranjani Cross Road Bullet East',
    'Fixed bullet camera monitoring BRTS corridor entry',
    'BULLET',
    'Dahua',
    'DH-IPC-HFW5842E-ZE',
    'DH20250811002',
    '192.168.10.12',
    554,
    'rtsp://admin:SecretPass123@192.168.10.12:554/cam/realmonitor?channel=1&subtype=0',
    'Shivranjani Cross Roads, Satellite',
    'd1111111-0001-4001-a001-000000000001',
    'e1111111-0001-4001-a001-000000000001',
    23.0242,
    72.5312,
    'ONLINE',
    TRUE,
    '2025-01-15T11:30:00Z',
    '{"resolution": "1920x1080", "fps": 25, "ir_range_meters": 50}'::JSONB
),
(
    'c1111111-0001-4001-a001-000000000003',
    'CAM-AHM-003',
    'Commerce Six Roads Dome South',
    'Vandal-resistant dome camera covering University library circle',
    'DOME',
    'Axis',
    'Q3538-LVE',
    'AX20250720003',
    '192.168.10.13',
    554,
    'rtsp://operator:CamSecure456@192.168.10.13:554/axis-media/media.amp',
    'Commerce Six Roads, Navrangpura',
    'd1111111-0001-4001-a001-000000000001',
    'e1111111-0001-4001-a001-000000000002',
    23.0378,
    72.5532,
    'ONLINE',
    TRUE,
    '2025-02-10T09:00:00Z',
    '{"resolution": "3840x2160", "fps": 30, "vandal_proof": "IK10+"}'::JSONB
),
(
    'c1111111-0001-4001-a001-000000000004',
    'CAM-AHM-004',
    'Pakwan Cross Road ANPR East',
    'Fixed box camera designated for high-speed lane recognition',
    'BOX',
    'CP Plus',
    'CP-UNC-TA41ZL4-MD',
    'CP20250615004',
    '192.168.10.14',
    554,
    'rtsp://admin:CpPlus@999@192.168.10.14:554/live',
    'Pakwan Dining Junction, SG Highway',
    'd1111111-0001-4001-a001-000000000001',
    'e1111111-0001-4001-a001-000000000001',
    23.0442,
    72.5123,
    'MAINTENANCE',
    TRUE,
    '2025-02-15T14:00:00Z',
    '{"resolution": "2560x1440", "fps": 60, "anpr_optimized": true}'::JSONB
),
-- Surat Cameras
(
    'c1111111-0002-4001-a001-000000000001',
    'CAM-SUR-001',
    'Varachha Diamond Market Entrance PTZ',
    'Heavy-duty pan-tilt camera overseeing commercial jewelry district',
    'PTZ',
    'Hikvision',
    'DS-2DE7A432IW-AEB',
    'HK20250501005',
    '192.168.20.11',
    554,
    'rtsp://admin:SuratSecure#1@192.168.20.11:554/live',
    'Mini Bazaar, Varachha',
    'd1111111-0002-4001-a001-000000000002',
    'e1111111-0002-4001-a001-000000000001',
    21.2185,
    72.8532,
    'ONLINE',
    TRUE,
    '2025-03-01T10:00:00Z',
    '{"resolution": "2560x1440", "fps": 30, "zoom": "32x"}'::JSONB
),
(
    'c1111111-0002-4001-a001-000000000002',
    'CAM-SUR-002',
    'Athwa Gate Circle Dome West',
    'Dome surveillance unit near Tapi river bridge approach',
    'DOME',
    'Bosch',
    'FLEXIDOME IP starlight 8000i',
    'BS20250410006',
    '192.168.20.12',
    554,
    'rtsp://service:Bosch1234@192.168.20.12:554/rtsp_tunnel',
    'Athwa Gate Circle, Ring Road',
    'd1111111-0002-4001-a001-000000000002',
    'e1111111-0002-4001-a001-000000000002',
    21.1824,
    72.8089,
    'ONLINE',
    TRUE,
    '2025-03-05T12:00:00Z',
    '{"resolution": "3840x2160", "fps": 30, "starlight_low_light": true}'::JSONB
),
(
    'c1111111-0002-4001-a001-000000000003',
    'CAM-SUR-003',
    'Surat Textile Market Checkpoint Bullet',
    'Perimeter checkpoint camera monitoring cargo gate 3',
    'BULLET',
    'Dahua',
    'DH-IPC-HFW3841T-ZS',
    'DH20250320007',
    '192.168.20.13',
    554,
    'rtsp://admin:Pass@1234@192.168.20.13:554/cam1',
    'Ring Road Textile Market Gate 3',
    'd1111111-0002-4001-a001-000000000002',
    'e1111111-0002-4001-a001-000000000002',
    21.1945,
    72.8367,
    'OFFLINE',
    TRUE,
    '2025-03-10T14:30:00Z',
    '{"resolution": "3840x2160", "fps": 20}'::JSONB
),
-- Rajkot Cameras
(
    'c1111111-0003-4001-a001-000000000001',
    'CAM-RAJ-001',
    'Race Course Ring Road PTZ Central',
    'Central public park circumference monitoring camera',
    'PTZ',
    'Axis',
    'M5525-E PTZ',
    'AX20250218008',
    '192.168.30.11',
    554,
    'rtsp://admin:RajkotPolice2025@192.168.30.11:554/live',
    'Race Course Ground North Gate',
    'd1111111-0003-4001-a001-000000000003',
    'e1111111-0003-4001-a001-000000000001',
    22.3012,
    70.7932,
    'ONLINE',
    TRUE,
    '2025-01-20T08:00:00Z',
    '{"resolution": "1920x1080", "fps": 30, "zoom": "10x"}'::JSONB
),
(
    'c1111111-0003-4001-a001-000000000002',
    'CAM-RAJ-002',
    'Bhaktinagar Railway Station Entry Dome',
    'Station road public plaza surveillance dome',
    'DOME',
    'Hikvision',
    'DS-2CD2186G2-ISU',
    'HK20250110009',
    '192.168.30.12',
    554,
    'rtsp://admin:Pass@9876@192.168.30.12:554/h264',
    'Bhaktinagar Station Circle',
    'd1111111-0003-4001-a001-000000000003',
    'e1111111-0003-4001-a001-000000000002',
    22.2815,
    70.8065,
    'ONLINE',
    TRUE,
    '2025-01-25T11:00:00Z',
    '{"resolution": "3840x2160", "fps": 20}'::JSONB
),
-- Vadodara Cameras
(
    'c1111111-0004-4001-a001-000000000001',
    'CAM-VAD-001',
    'Sayajigunj Central Railway Approach Bullet',
    'High traffic railway station circle bullet camera',
    'BULLET',
    'Dahua',
    'DH-IPC-HFW5442E-ZE',
    'DH20250105010',
    '192.168.40.11',
    554,
    'rtsp://admin:Vadodara#123@192.168.40.11:554/stream',
    'Sayajigunj Circle',
    'd1111111-0004-4001-a001-000000000004',
    'e1111111-0004-4001-a001-000000000001',
    22.3108,
    73.1812,
    'ONLINE',
    TRUE,
    '2025-02-01T09:30:00Z',
    '{"resolution": "2688x1520", "fps": 30}'::JSONB
),
(
    'c1111111-0004-4001-a001-000000000002',
    'CAM-VAD-002',
    'Raopura Tower Square PTZ',
    'Historic clock tower market intersection pan-tilt camera',
    'PTZ',
    'CP Plus',
    'CP-UNP-E3321L20-M',
    'CP20250202011',
    '192.168.40.12',
    554,
    'rtsp://admin:CpPlusVad@192.168.40.12:554/ch0_0.264',
    'Raopura Tower Junction',
    'd1111111-0004-4001-a001-000000000004',
    'e1111111-0004-4001-a001-000000000002',
    22.3025,
    73.2045,
    'ONLINE',
    TRUE,
    '2025-02-05T15:00:00Z',
    '{"resolution": "1920x1080", "fps": 30, "zoom": "33x"}'::JSONB
),
-- Gandhinagar Cameras
(
    'c1111111-0005-4001-a001-000000000001',
    'CAM-GAN-001',
    'Sector 7 Vidhan Sabha Perimeter North PTZ',
    'High security legislative assembly perimeter surveillance camera',
    'PTZ',
    'Bosch',
    'AUTODOME IP 5000i',
    'BS20250101012',
    '192.168.50.11',
    554,
    'rtsp://admin:GandhinagarSecret@192.168.50.11:554/live',
    'Ch-0 Circle, Sector 7',
    'd1111111-0005-4001-a001-000000000005',
    'e1111111-0005-4001-a001-000000000001',
    23.2156,
    72.6369,
    'ONLINE',
    TRUE,
    '2025-01-01T08:00:00Z',
    '{"resolution": "3840x2160", "fps": 30, "zoom": "30x", "tamper_alarm": true}'::JSONB
),
(
    'c1111111-0005-4001-a001-000000000002',
    'CAM-GAN-002',
    'Infocity Tech Park Main Gate Dome',
    'Tech hub primary visitor ingress dome camera',
    'DOME',
    'Hikvision',
    'DS-2CD2786G2-IZS',
    'HK20250102013',
    '192.168.50.12',
    554,
    'rtsp://admin:Infocity@2025@192.168.50.12:554/live',
    'Infocity Main Gate, Gandhinagar',
    'd1111111-0005-4001-a001-000000000005',
    'e1111111-0005-4001-a001-000000000002',
    23.1895,
    72.6285,
    'ONLINE',
    TRUE,
    '2025-01-05T10:00:00Z',
    '{"resolution": "3840x2160", "fps": 30}'::JSONB
),
(
    'c1111111-0005-4001-a001-000000000003',
    'CAM-GAN-003',
    'GH-0 Circle Traffic Observation Fixed',
    'Wide-angle intersection observation camera',
    'FIXED',
    'Axis',
    'P1455-LE',
    'AX20250103014',
    '192.168.50.13',
    554,
    'rtsp://admin:Gh0Pass@192.168.50.13:554/axis-media/media.amp',
    'GH-0 Circle, Gandhinagar',
    'd1111111-0005-4001-a001-000000000005',
    'e1111111-0005-4001-a001-000000000001',
    23.2312,
    72.6512,
    'DISABLED',
    FALSE,
    '2025-01-10T16:00:00Z',
    '{"resolution": "1920x1080", "fps": 30}'::JSONB
)
ON CONFLICT (camera_code) DO NOTHING;

-- ============================================================
-- 4. SEED CAMERA GROUPS
-- ============================================================
INSERT INTO camera_groups (id, name, description, created_by) VALUES
(
    'f1111111-0001-4001-a001-000000000001',
    'SG Highway High-Speed Surveillance Corridor',
    'Coordinated traffic and incident monitoring cameras spanning SG Highway from Iskcon to Pakwan',
    'b1c2d3e4-0001-0001-0001-000000000001'
),
(
    'f1111111-0002-4001-a001-000000000002',
    'Gujarat Capital VIP & Administrative Zone',
    'High security perimeter monitoring for Gandhinagar government secretariat and Infocity',
    'b1c2d3e4-0001-0001-0001-000000000001'
)
ON CONFLICT (name) DO NOTHING;

-- Seed camera group members
INSERT INTO camera_group_members (group_id, camera_id) VALUES
('f1111111-0001-4001-a001-000000000001', 'c1111111-0001-4001-a001-000000000001'),
('f1111111-0001-4001-a001-000000000001', 'c1111111-0001-4001-a001-000000000002'),
('f1111111-0001-4001-a001-000000000001', 'c1111111-0001-4001-a001-000000000004'),
('f1111111-0002-4001-a001-000000000002', 'c1111111-0005-4001-a001-000000000001'),
('f1111111-0002-4001-a001-000000000002', 'c1111111-0005-4001-a001-000000000002'),
('f1111111-0002-4001-a001-000000000002', 'c1111111-0005-4001-a001-000000000003')
ON CONFLICT (group_id, camera_id) DO NOTHING;
