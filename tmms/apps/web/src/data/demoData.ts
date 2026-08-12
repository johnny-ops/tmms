// Demo data for development — clearly marked as DEMO DATA
// NEVER present these as real LGU records

import type {
  Vehicle, Operator, Driver, Franchise, Route, Terminal,
  TrafficTicket, ViolationType, Inspection, ParkingArea,
  ParkingSlot, ParkingSlotStatus, ParkingSession, AIDetection, AIViolationCandidate,
  DashboardStats, Forecast, AppNotification, AuditLog, AIModel, UserProfile
} from '@/types';

export const DEMO_OPERATORS: Operator[] = [
  { id: 'op-001', full_name: 'Juan dela Cruz', contact_number: '09171234567', email: 'juan@example.com', address: 'Brgy. Poblacion, Lipa City, Batangas', organization: 'Dela Cruz Transport Coop', status: 'ACTIVE', created_at: '2024-01-15T08:00:00Z' },
  { id: 'op-002', full_name: 'Maria Santos', contact_number: '09282345678', email: 'maria@example.com', address: 'Brgy. Sabang, Lipa City, Batangas', organization: 'Santos Jeepney Operators Assoc.', status: 'ACTIVE', created_at: '2024-02-10T08:00:00Z' },
  { id: 'op-003', full_name: 'Pedro Reyes', contact_number: '09393456789', email: 'pedro@example.com', address: 'Brgy. Tambo, Lipa City, Batangas', status: 'ACTIVE', created_at: '2024-03-05T08:00:00Z' },
  { id: 'op-004', full_name: 'Ana Bautista', contact_number: '09504567890', email: 'ana@example.com', address: 'Brgy. Marawoy, Lipa City, Batangas', organization: 'Bautista Tricycle Operators', status: 'INACTIVE', created_at: '2023-11-20T08:00:00Z' },
];

export const DEMO_DRIVERS: Driver[] = [
  { id: 'drv-001', full_name: 'Carlos Mendoza', license_number: 'N01-23-456789', license_expiry: '2026-12-31', contact_number: '09155678901', operator_id: 'op-001', status: 'ACTIVE', created_at: '2024-01-20T08:00:00Z' },
  { id: 'drv-002', full_name: 'Roberto Garcia', license_number: 'N02-23-567890', license_expiry: '2025-09-15', contact_number: '09166789012', operator_id: 'op-001', status: 'ACTIVE', created_at: '2024-02-01T08:00:00Z' },
  { id: 'drv-003', full_name: 'Ernesto Lopez', license_number: 'N03-22-678901', license_expiry: '2024-10-01', contact_number: '09177890123', operator_id: 'op-002', status: 'ACTIVE', created_at: '2024-03-10T08:00:00Z' },
  { id: 'drv-004', full_name: 'Josefina Villanueva', license_number: 'N04-23-789012', license_expiry: '2027-03-20', contact_number: '09188901234', operator_id: 'op-003', status: 'ACTIVE', created_at: '2024-04-05T08:00:00Z' },
];

export const DEMO_ROUTES: Route[] = [
  { id: 'rt-001', route_code: 'R-01', name: 'Lipa City - San Jose', origin: 'Lipa City Hall', destination: 'San Jose', distance_km: 12.5, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'rt-002', route_code: 'R-02', name: 'Lipa City - Malvar', origin: 'Lipa City Hall', destination: 'Malvar', distance_km: 8.2, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'rt-003', route_code: 'R-03', name: 'Lipa City - Batangas City', origin: 'Lipa Terminal', destination: 'Batangas City Bus Terminal', distance_km: 25.0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'rt-004', route_code: 'R-04', name: 'Lipa City - Ibaan', origin: 'Lipa City Hall', destination: 'Ibaan Public Market', distance_km: 15.3, is_active: false, created_at: '2024-01-01T00:00:00Z' },
];

export const DEMO_VEHICLES: Vehicle[] = [
  { id: 'veh-001', plate_number: 'ABC1234', body_number: 'J-0001', vehicle_type_id: 'vt-001', make: 'Sarao', model: 'Jeepney', year: 2019, color: 'Multicolor', capacity: 20, fuel_type: 'Diesel', registration_number: 'LTO-2024-001', registration_expiry: '2025-12-31', status: 'ACTIVE', operator_id: 'op-001', driver_id: 'drv-001', franchise_id: 'fr-001', route_id: 'rt-001', created_at: '2024-01-25T08:00:00Z', updated_at: '2024-06-01T08:00:00Z' },
  { id: 'veh-002', plate_number: 'DEF5678', body_number: 'J-0002', vehicle_type_id: 'vt-001', make: 'Sarao', model: 'Jeepney', year: 2021, color: 'Yellow/Red', capacity: 20, fuel_type: 'Diesel', registration_number: 'LTO-2024-002', registration_expiry: '2026-03-15', status: 'ACTIVE', operator_id: 'op-001', driver_id: 'drv-002', franchise_id: 'fr-002', route_id: 'rt-01', created_at: '2024-02-05T08:00:00Z', updated_at: '2024-06-01T08:00:00Z' },
  { id: 'veh-003', plate_number: 'GHI9012', body_number: 'T-0001', vehicle_type_id: 'vt-002', make: 'Honda', model: 'XRM125', year: 2020, color: 'Blue/White', capacity: 3, fuel_type: 'Gasoline', registration_number: 'LTO-2024-003', registration_expiry: '2024-08-30', status: 'FOR_INSPECTION', operator_id: 'op-002', driver_id: 'drv-003', route_id: 'rt-002', created_at: '2024-03-15T08:00:00Z', updated_at: '2024-07-10T08:00:00Z' },
  { id: 'veh-004', plate_number: 'JKL3456', body_number: 'B-0001', vehicle_type_id: 'vt-003', make: 'Isuzu', model: 'Crosswind Bus', year: 2018, color: 'White/Blue', capacity: 45, fuel_type: 'Diesel', registration_number: 'LTO-2024-004', registration_expiry: '2025-06-30', status: 'ACTIVE', operator_id: 'op-003', driver_id: 'drv-004', franchise_id: 'fr-003', route_id: 'rt-003', created_at: '2024-04-10T08:00:00Z', updated_at: '2024-06-15T08:00:00Z' },
  { id: 'veh-005', plate_number: 'MNO7890', body_number: 'J-0003', vehicle_type_id: 'vt-001', make: 'Francisco Motors', model: 'Jeepney', year: 2017, color: 'Green/White', capacity: 20, fuel_type: 'Diesel', status: 'SUSPENDED', operator_id: 'op-004', route_id: 'rt-001', created_at: '2023-11-25T08:00:00Z', updated_at: '2024-05-20T08:00:00Z' },
  { id: 'veh-006', plate_number: 'PQR1111', body_number: 'J-0004', vehicle_type_id: 'vt-001', make: 'Sarao', model: 'Jeepney', year: 2022, color: 'Red/Yellow', capacity: 20, fuel_type: 'Diesel', registration_expiry: '2025-11-20', status: 'ACTIVE', operator_id: 'op-002', created_at: '2024-05-01T08:00:00Z', updated_at: '2024-07-01T08:00:00Z' },
];

export const DEMO_FRANCHISES: Franchise[] = [
  { id: 'fr-001', franchise_number: 'FRNCH-2024-001', operator_id: 'op-001', application_date: '2024-01-10', approval_date: '2024-01-25', validity_start: '2024-02-01', validity_end: '2025-02-01', status: 'ACTIVE', route_id: 'rt-001', authorized_capacity: 20, created_at: '2024-01-10T08:00:00Z', updated_at: '2024-01-25T08:00:00Z' },
  { id: 'fr-002', franchise_number: 'FRNCH-2024-002', operator_id: 'op-001', application_date: '2024-02-01', approval_date: '2024-02-15', validity_start: '2024-02-20', validity_end: '2025-02-20', status: 'ACTIVE', route_id: 'rt-001', authorized_capacity: 20, created_at: '2024-02-01T08:00:00Z', updated_at: '2024-02-15T08:00:00Z' },
  { id: 'fr-003', franchise_number: 'FRNCH-2024-003', operator_id: 'op-003', application_date: '2024-04-05', approval_date: '2024-04-18', validity_start: '2024-04-20', validity_end: '2026-08-20', status: 'EXPIRING', route_id: 'rt-003', authorized_capacity: 45, created_at: '2024-04-05T08:00:00Z', updated_at: '2024-04-18T08:00:00Z' },
  { id: 'fr-004', franchise_number: 'FRNCH-2023-045', operator_id: 'op-004', application_date: '2023-11-01', validity_start: '2023-12-01', validity_end: '2024-12-01', status: 'EXPIRED', route_id: 'rt-002', authorized_capacity: 20, created_at: '2023-11-01T08:00:00Z', updated_at: '2024-01-01T08:00:00Z' },
  { id: 'fr-005', franchise_number: 'FRNCH-2024-010', operator_id: 'op-002', application_date: '2024-07-01', status: 'PENDING', route_id: 'rt-002', authorized_capacity: 20, created_at: '2024-07-01T08:00:00Z', updated_at: '2024-07-01T08:00:00Z' },
];

export const DEMO_VIOLATION_TYPES: ViolationType[] = [
  { id: 'vt-v01', code: 'VT-001', name: 'Illegal Parking', description: 'Parking in a no-parking zone', penalty_amount: 500, is_active: true },
  { id: 'vt-v02', code: 'VT-002', name: 'Loading/Unloading Violation', description: 'Loading or unloading passengers in prohibited areas', penalty_amount: 300, is_active: true },
  { id: 'vt-v03', code: 'VT-003', name: 'Overloading', description: 'Carrying passengers beyond authorized capacity', penalty_amount: 1000, is_active: true },
  { id: 'vt-v04', code: 'VT-004', name: 'Expired Registration', description: 'Operating with expired vehicle registration', penalty_amount: 2000, is_active: true },
  { id: 'vt-v05', code: 'VT-005', name: 'Expired Franchise', description: 'Operating with expired franchise', penalty_amount: 3000, is_active: true },
  { id: 'vt-v06', code: 'VT-006', name: 'Wrong Route', description: 'Operating outside authorized route', penalty_amount: 500, is_active: true },
  { id: 'vt-v07', code: 'VT-007', name: 'No Plate Display', description: 'Plate number not properly displayed', penalty_amount: 400, is_active: true },
  { id: 'vt-v08', code: 'VT-008', name: 'Prohibited Lane', description: 'Using a lane prohibited for PUVs', penalty_amount: 500, is_active: true },
];

export const DEMO_TICKETS: TrafficTicket[] = [
  { id: 'tkt-001', ticket_number: 'TKT-2024-0001', vehicle_id: 'veh-001', plate_number: 'ABC1234', driver_id: 'drv-001', violation_type_id: 'vt-v02', location: 'Mabini St., Lipa City', incident_date: '2024-07-15', incident_time: '09:30', enforcer_id: 'user-enforcer-01', penalty_amount: 300, status: 'SETTLED', payment_status: 'PAID', created_at: '2024-07-15T09:35:00Z', updated_at: '2024-07-20T10:00:00Z' },
  { id: 'tkt-002', ticket_number: 'TKT-2024-0002', vehicle_id: 'veh-003', plate_number: 'GHI9012', driver_id: 'drv-003', violation_type_id: 'vt-v01', location: 'C.M. Recto Ave., Lipa City', incident_date: '2024-07-28', incident_time: '14:15', enforcer_id: 'user-enforcer-01', penalty_amount: 500, status: 'UNPAID', payment_status: 'UNPAID', created_at: '2024-07-28T14:20:00Z', updated_at: '2024-07-28T14:20:00Z' },
  { id: 'tkt-003', ticket_number: 'TKT-2024-0003', plate_number: 'MNO7890', violation_type_id: 'vt-v05', location: 'J.P. Laurel Hwy., Lipa City', incident_date: '2024-08-01', incident_time: '11:00', enforcer_id: 'user-enforcer-01', penalty_amount: 3000, status: 'CONFIRMED', payment_status: 'UNPAID', notes: 'Franchise expired for 3 months', created_at: '2024-08-01T11:05:00Z', updated_at: '2024-08-01T11:05:00Z' },
  { id: 'tkt-004', ticket_number: 'TKT-2024-0004', plate_number: 'XYZ9999', violation_type_id: 'vt-v07', location: 'Brgy. Marawoy, Lipa City', incident_date: '2024-08-05', incident_time: '16:45', enforcer_id: 'user-enforcer-01', penalty_amount: 400, status: 'ISSUED', payment_status: 'UNPAID', created_at: '2024-08-05T16:50:00Z', updated_at: '2024-08-05T16:50:00Z' },
  { id: 'tkt-005', ticket_number: 'TKT-2024-0005', vehicle_id: 'veh-002', plate_number: 'DEF5678', violation_type_id: 'vt-v08', location: 'Ayala Malls Lipa, Lipa City', incident_date: '2024-08-07', incident_time: '13:20', enforcer_id: 'user-enforcer-01', penalty_amount: 500, status: 'CONTESTED', payment_status: 'UNPAID', notes: 'Driver contesting the location marking', created_at: '2024-08-07T13:25:00Z', updated_at: '2024-08-07T14:00:00Z' },
];

export const DEMO_INSPECTIONS: Inspection[] = [
  { id: 'ins-001', vehicle_id: 'veh-001', inspector_id: 'user-inspector-01', scheduled_date: '2024-07-10', inspection_date: '2024-07-10', result: 'PASSED', overall_remarks: 'All systems in good condition. Vehicle ready for operation.', certificate_number: 'CERT-2024-001', created_at: '2024-07-05T08:00:00Z', updated_at: '2024-07-10T16:00:00Z' },
  { id: 'ins-002', vehicle_id: 'veh-003', inspector_id: 'user-inspector-01', scheduled_date: '2024-07-20', inspection_date: '2024-07-20', result: 'FAILED', overall_remarks: 'Brakes need replacement. Tires worn below minimum tread depth.', created_at: '2024-07-15T08:00:00Z', updated_at: '2024-07-20T15:00:00Z' },
  { id: 'ins-003', vehicle_id: 'veh-004', inspector_id: 'user-inspector-01', scheduled_date: '2024-08-15', created_at: '2024-08-01T08:00:00Z', updated_at: '2024-08-01T08:00:00Z' },
  { id: 'ins-004', vehicle_id: 'veh-002', inspector_id: 'user-inspector-01', scheduled_date: '2024-08-12', inspection_date: '2024-08-12', result: 'FOR_REINSPECTION', overall_remarks: 'Windshield crack detected. Must be replaced before re-inspection.', created_at: '2024-08-05T08:00:00Z', updated_at: '2024-08-12T14:00:00Z' },
];

export const DEMO_TERMINALS: Terminal[] = [
  { id: 'tm-001', name: 'Lipa City Central Terminal', location: 'Mabini St., Lipa City, Batangas', latitude: 13.9411, longitude: 121.1637, capacity: 50, current_occupancy: 32, status: 'ACTIVE', created_at: '2023-01-01T00:00:00Z' },
  { id: 'tm-002', name: 'San Jose Terminal', location: 'San Jose, Batangas', latitude: 13.8742, longitude: 121.0823, capacity: 20, current_occupancy: 8, status: 'ACTIVE', created_at: '2023-01-01T00:00:00Z' },
  { id: 'tm-003', name: 'Malvar Terminal', location: 'Malvar, Batangas', latitude: 14.0445, longitude: 121.1612, capacity: 15, current_occupancy: 0, status: 'INACTIVE', created_at: '2023-06-01T00:00:00Z' },
];

export const DEMO_PARKING_AREAS: ParkingArea[] = [
  { id: 'pa-001', name: 'City Hall Parking Area', location: 'City Hall Compound, Lipa City', total_slots: 40, status: 'ACTIVE', created_at: '2023-01-01T00:00:00Z' },
  { id: 'pa-002', name: 'Central Terminal Parking', location: 'Mabini St., Lipa City', total_slots: 20, status: 'ACTIVE', created_at: '2023-01-01T00:00:00Z' },
];

export const DEMO_PARKING_SLOTS: ParkingSlot[] = Array.from({ length: 40 }, (_, i) => ({
  id: `ps-${String(i + 1).padStart(3, '0')}`,
  parking_area_id: i < 20 ? 'pa-001' : 'pa-002',
  slot_number: `S-${String(i + 1).padStart(2, '0')}`,
  slot_status: (i < 14 ? 'OCCUPIED' : i < 16 ? 'RESERVED' : i === 17 ? 'OUT_OF_SERVICE' : 'AVAILABLE') as ParkingSlotStatus,
  created_at: '2023-01-01T00:00:00Z',
}));

export const DEMO_AI_MODELS: AIModel[] = [
  { id: 'aim-001', name: 'Vehicle Detection Model', version: 'v1.0', model_type: 'VEHICLE_DETECTION', status: 'ACTIVE', confidence_threshold: 0.7, description: 'YOLOv8n fine-tuned for Philippine PUV categories', created_at: '2024-01-01T00:00:00Z', deployed_at: '2024-02-01T00:00:00Z' },
  { id: 'aim-002', name: 'License Plate OCR', version: 'v1.0', model_type: 'PLATE_OCR', status: 'ACTIVE', confidence_threshold: 0.75, description: 'PaddleOCR with Philippine plate normalization', created_at: '2024-01-01T00:00:00Z', deployed_at: '2024-02-01T00:00:00Z' },
  { id: 'aim-003', name: 'Violation Detection Model', version: 'v0.5', model_type: 'VIOLATION_DETECTION', status: 'TESTING', confidence_threshold: 0.8, description: 'Spatial rule-based + YOLO tracking (beta)', created_at: '2024-05-01T00:00:00Z' },
  { id: 'aim-004', name: 'Demand Forecasting', version: 'v1.0', model_type: 'FORECASTING', status: 'ACTIVE', confidence_threshold: 0, description: 'XGBoost time-series forecasting model', created_at: '2024-03-01T00:00:00Z', deployed_at: '2024-04-01T00:00:00Z' },
];

export const DEMO_AI_DETECTIONS: AIDetection[] = [
  { id: 'aid-001', timestamp: '2024-08-09T08:32:11Z', camera_source: 'CAM-01 (City Hall)', model_version: 'v1.0', detected_vehicle_type: 'jeepney', vehicle_confidence: 0.94, plate_text_raw: 'ABC 1234', plate_text_normalized: 'ABC1234', ocr_confidence: 0.91, matched_vehicle_id: 'veh-001', processing_time_ms: 145, created_at: '2024-08-09T08:32:11Z' },
  { id: 'aid-002', timestamp: '2024-08-09T09:15:47Z', camera_source: 'CAM-02 (Mabini St.)', model_version: 'v1.0', detected_vehicle_type: 'tricycle', vehicle_confidence: 0.87, plate_text_raw: 'GHI 9012', plate_text_normalized: 'GHI9012', ocr_confidence: 0.83, matched_vehicle_id: 'veh-003', processing_time_ms: 192, created_at: '2024-08-09T09:15:47Z' },
  { id: 'aid-003', timestamp: '2024-08-09T10:05:22Z', camera_source: 'CAM-01 (City Hall)', model_version: 'v1.0', detected_vehicle_type: 'jeepney', vehicle_confidence: 0.91, plate_text_raw: 'XY Z 999', plate_text_normalized: 'XYZ999', ocr_confidence: 0.72, processing_time_ms: 160, created_at: '2024-08-09T10:05:22Z' },
];

export const DEMO_AI_VIOLATION_CANDIDATES: AIViolationCandidate[] = [
  { id: 'aivc-001', detection_id: 'aid-002', rule_triggered: 'Illegal Parking (No-Parking Zone)', ai_confidence: 0.88, location: 'Mabini St. cor. J.P. Laurel Hwy.', latitude: 13.9415, longitude: 121.1641, verification_status: 'AI_SUGGESTED', created_at: '2024-08-09T09:16:00Z' },
  { id: 'aivc-002', detection_id: 'aid-003', rule_triggered: 'Loading/Unloading Zone Violation', ai_confidence: 0.76, location: 'C.M. Recto Ave.', verification_status: 'AI_SUGGESTED', created_at: '2024-08-09T10:06:00Z' },
];

export const DEMO_FORECASTS: Forecast[] = [
  { id: 'fc-001', model_name: 'Demand Forecasting', model_version: 'v1.0', forecast_period: '2024-08-10', terminal_id: 'tm-001', predicted_value: 285, created_at: '2024-08-09T23:00:00Z' },
  { id: 'fc-002', model_name: 'Demand Forecasting', model_version: 'v1.0', forecast_period: '2024-08-11', terminal_id: 'tm-001', predicted_value: 210, created_at: '2024-08-09T23:00:00Z' },
  { id: 'fc-003', model_name: 'Demand Forecasting', model_version: 'v1.0', forecast_period: '2024-08-12', terminal_id: 'tm-001', predicted_value: 320, created_at: '2024-08-09T23:00:00Z' },
];

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  { id: 'notif-001', recipient_id: 'user-001', type: 'FRANCHISE_EXPIRING', title: 'Franchise Expiring Soon', message: 'Franchise FRNCH-2024-003 expires in 11 days.', related_entity: 'franchise', related_id: 'fr-003', is_read: false, created_at: '2024-08-09T08:00:00Z' },
  { id: 'notif-002', recipient_id: 'user-001', type: 'AI_CANDIDATE', title: 'AI Violation Candidate Awaiting Verification', message: '2 new AI-detected violation candidates require human verification.', related_entity: 'ai_violation', is_read: false, created_at: '2024-08-09T10:06:00Z' },
  { id: 'notif-003', recipient_id: 'user-001', type: 'INSPECTION_DUE', title: 'Vehicle Inspection Due', message: 'Vehicle GHI9012 is due for re-inspection.', related_entity: 'vehicle', related_id: 'veh-003', is_read: true, created_at: '2024-08-07T08:00:00Z' },
  { id: 'notif-004', recipient_id: 'user-001', type: 'TICKET_UNPAID', title: 'Unpaid Ticket Alert', message: 'Ticket TKT-2024-0003 (₱3,000.00) remains unpaid for 8 days.', related_entity: 'ticket', related_id: 'tkt-003', is_read: false, created_at: '2024-08-09T06:00:00Z' },
];

export const DEMO_DASHBOARD_STATS: DashboardStats = {
  totalVehicles: 6,
  activeVehicles: 4,
  inactiveVehicles: 1,
  expiredFranchises: 1,
  franchisesExpiringSoon: 1,
  vehiclesDueForInspection: 2,
  failedInspections: 1,
  pendingViolations: 3,
  todayViolations: 1,
  activeTerminals: 2,
  occupiedParkingSlots: 14,
  availableParkingSlots: 24,
  aiDetectionsToday: 34,
  aiCandidatesPendingVerification: 2,
  unreadNotifications: 3,
};

// Monthly violations for chart (demo)
export const DEMO_MONTHLY_VIOLATIONS = [
  { month: 'Jan', count: 12 },
  { month: 'Feb', count: 18 },
  { month: 'Mar', count: 15 },
  { month: 'Apr', count: 22 },
  { month: 'May', count: 19 },
  { month: 'Jun', count: 28 },
  { month: 'Jul', count: 24 },
  { month: 'Aug', count: 9 },
];

// Route demand data (demo)
export const DEMO_ROUTE_DEMAND = [
  { route: 'R-01', trips: 145, passengers: 2350 },
  { route: 'R-02', trips: 98, passengers: 1640 },
  { route: 'R-03', trips: 56, passengers: 2100 },
];

// Parking utilization by hour (demo)
export const DEMO_PARKING_HOURLY = [
  { hour: '6AM', utilized: 15 },
  { hour: '7AM', utilized: 28 },
  { hour: '8AM', utilized: 36 },
  { hour: '9AM', utilized: 32 },
  { hour: '10AM', utilized: 25 },
  { hour: '11AM', utilized: 30 },
  { hour: '12PM', utilized: 38 },
  { hour: '1PM', utilized: 35 },
  { hour: '2PM', utilized: 22 },
  { hour: '3PM', utilized: 18 },
  { hour: '4PM', utilized: 14 },
  { hour: '5PM', utilized: 12 },
];
