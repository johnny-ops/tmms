// ============================================================
// SHARED TYPES — Transport and Mobility Management System
// ============================================================

// ------ Enums ------
export type UserRole = 'SUPER_ADMIN';

export type VehicleStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'FOR_INSPECTION'
  | 'UNDER_REVIEW';

export type FranchiseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'RENEWAL_PENDING';

export type TicketStatus =
  | 'ISSUED'
  | 'UNDER_REVIEW'
  | 'CONTESTED'
  | 'CONFIRMED'
  | 'SETTLED'
  | 'UNPAID'
  | 'CANCELLED';

export type InspectionResult = 'PASSED' | 'FAILED' | 'FOR_REINSPECTION';

export type RegistrationStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'SUSPENDED';

export type ParkingSlotStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE';

export type AIVerificationStatus =
  | 'AI_SUGGESTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ESCALATED';

// ------ User / Auth ------
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

// ------ Vehicle ------
export interface VehicleType {
  id: string;
  name: string;
  description?: string;
}

export interface Operator {
  id: string;
  full_name: string;
  contact_number: string;
  email?: string;
  address: string;
  organization?: string;
  license_number?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_expiry: string;
  contact_number: string;
  operator_id?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  body_number?: string;
  vehicle_type_id: string;
  vehicle_type?: VehicleType;
  make: string;
  model: string;
  year: number;
  color: string;
  engine_number?: string;
  chassis_number?: string;
  capacity: number;
  fuel_type: string;
  registration_number?: string;
  registration_expiry?: string;
  status: VehicleStatus;
  operator_id?: string;
  operator?: Operator;
  driver_id?: string;
  driver?: Driver;
  franchise_id?: string;
  route_id?: string;
  terminal_id?: string;
  created_at: string;
  updated_at: string;
}

// ------ Franchise ------
export interface Franchise {
  id: string;
  franchise_number: string;
  operator_id: string;
  operator?: Operator;
  application_date: string;
  approval_date?: string;
  validity_start?: string;
  validity_end?: string;
  status: FranchiseStatus;
  route_id?: string;
  authorized_capacity?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ------ Routes & Terminals ------
export interface Route {
  id: string;
  route_code: string;
  name: string;
  origin: string;
  destination: string;
  distance_km?: number;
  is_active: boolean;
  created_at: string;
}

export interface Terminal {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  current_occupancy: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  created_at: string;
}

// ------ Violations / Tickets ------
export interface ViolationType {
  id: string;
  code: string;
  name: string;
  description?: string;
  penalty_amount: number;
  is_active: boolean;
}

export interface TrafficTicket {
  id: string;
  ticket_number: string;
  vehicle_id?: string;
  vehicle?: Vehicle;
  plate_number: string;
  driver_id?: string;
  driver?: Driver;
  operator_id?: string;
  violation_type_id: string;
  violation_type?: ViolationType;
  location: string;
  latitude?: number;
  longitude?: number;
  incident_date: string;
  incident_time: string;
  enforcer_id: string;
  enforcer?: UserProfile;
  penalty_amount: number;
  status: TicketStatus;
  payment_status: 'UNPAID' | 'PAID' | 'WAIVED';
  ai_detection_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ------ Inspections ------
export interface Inspection {
  id: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  inspector_id: string;
  inspector?: UserProfile;
  scheduled_date: string;
  inspection_date?: string;
  result?: InspectionResult;
  overall_remarks?: string;
  certificate_number?: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  category: string;
  item_name: string;
  status: 'PASS' | 'FAIL' | 'NA';
  remarks?: string;
}

// ------ Parking ------
export interface ParkingArea {
  id: string;
  name: string;
  location: string;
  total_slots: number;
  vehicle_type_id?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface ParkingSlot {
  id: string;
  parking_area_id: string;
  slot_number: string;
  slot_status: ParkingSlotStatus;
  current_session_id?: string;
  created_at: string;
}

export interface ParkingSession {
  id: string;
  parking_slot_id: string;
  vehicle_id?: string;
  plate_number: string;
  entry_time: string;
  exit_time?: string;
  duration_minutes?: number;
  fee_amount?: number;
  recorded_by: string;
  created_at: string;
}

// ------ AI ------
export interface AIModel {
  id: string;
  name: string;
  version: string;
  model_type: 'VEHICLE_DETECTION' | 'PLATE_OCR' | 'VIOLATION_DETECTION' | 'FORECASTING';
  status: 'ACTIVE' | 'INACTIVE' | 'TESTING';
  confidence_threshold: number;
  description?: string;
  created_at: string;
  deployed_at?: string;
}

export interface AIDetection {
  id: string;
  timestamp: string;
  camera_source?: string;
  image_url?: string;
  model_id?: string;
  model_version?: string;
  detected_vehicle_type?: string;
  vehicle_confidence?: number;
  plate_text_raw?: string;
  plate_text_normalized?: string;
  ocr_confidence?: number;
  matched_vehicle_id?: string;
  matched_vehicle?: Vehicle;
  processing_time_ms?: number;
  created_at: string;
}

export interface AIViolationCandidate {
  id: string;
  detection_id: string;
  detection?: AIDetection;
  rule_triggered: string;
  ai_confidence: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  evidence_url?: string;
  verification_status: AIVerificationStatus;
  verifier_id?: string;
  verifier?: UserProfile;
  verified_at?: string;
  ticket_id?: string;
  notes?: string;
  created_at: string;
}

// ------ Forecasting ------
export interface Forecast {
  id: string;
  model_name: string;
  model_version: string;
  forecast_period: string;
  terminal_id?: string;
  route_id?: string;
  predicted_value: number;
  actual_value?: number;
  mae?: number;
  rmse?: number;
  created_at: string;
}

// ------ Notifications ------
export interface AppNotification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  related_entity?: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
}

// ------ Audit ------
export interface AuditLog {
  id: string;
  user_id: string;
  user?: UserProfile;
  action: string;
  module: string;
  entity: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// ------ API Response ------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ------ Dashboard ------
export interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  inactiveVehicles: number;
  expiredFranchises: number;
  franchisesExpiringSoon: number;
  vehiclesDueForInspection: number;
  failedInspections: number;
  pendingViolations: number;
  todayViolations: number;
  activeTerminals: number;
  occupiedParkingSlots: number;
  availableParkingSlots: number;
  aiDetectionsToday: number;
  aiCandidatesPendingVerification: number;
  unreadNotifications: number;
}
