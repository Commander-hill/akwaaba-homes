export type PropertyCategory = 'Apartment' | 'Studio' | 'House' | 'Hostel';

export interface RoomOptionConfig {
  value: string;
  label: string;
  description: string;
  defaultBeds: number;
}

export interface PropertyTypeConfig {
  value: PropertyCategory;
  label: string;
  badge: string;
  description: string;
  defaultTitlePlaceholder: string;
  targetAudienceOptions: { value: string; label: string }[];
  billingPeriodOptions: { value: string; label: string }[];
  defaultBillingPeriod: string;
  unitLabel: string;
  unitHelpText: string;
  roomTypeOptions: RoomOptionConfig[];
  showGenderWing: boolean;
  blockNameLabel: string;
  blockNamePlaceholder: string;
  gateLockOptions: { value: string; label: string }[];
  defaultGateLock: string;
  visitorPolicyOptions: { value: string; label: string }[];
  defaultVisitorPolicy: string;
  quietHoursOptions: { value: string; label: string }[];
  defaultQuietHours: string;
  recommendedAmenities: string[];
}

export const PROPERTY_TYPE_CONFIGS: Record<PropertyCategory, PropertyTypeConfig> = {
  Apartment: {
    value: 'Apartment',
    label: 'Residential Apartment',
    badge: 'Apartment',
    description: 'Self-contained flats, multi-bedroom family or executive apartments with private living areas.',
    defaultTitlePlaceholder: 'e.g. Ridge View Executive 2-Bedroom Apartment',
    targetAudienceOptions: [
      { value: 'Open to All', label: 'Open to All' },
      { value: 'Families', label: 'Families & Couples' },
      { value: 'Working Professionals', label: 'Working Professionals & Expats' },
      { value: 'Postgraduate Only', label: 'Postgraduates & Mature Students' },
    ],
    billingPeriodOptions: [
      { value: 'Monthly', label: 'Monthly Rent' },
      { value: 'Annual', label: 'Annual / Yearly (12 Months Advance)' },
      { value: 'Quarterly', label: 'Quarterly Advance' },
    ],
    defaultBillingPeriod: 'Monthly',
    unitLabel: 'Apartment Configurations & Rates',
    unitHelpText: 'Define apartment bedroom configurations, flat/floor references, and tenancy rates.',
    showGenderWing: false,
    blockNameLabel: 'Flat / Unit No. or Floor',
    blockNamePlaceholder: 'e.g. Flat 3B or 2nd Floor',
    roomTypeOptions: [
      { value: '1 Bedroom Apartment', label: '1-Bedroom Apartment (Standard / Hall + Bed)', description: 'Private hall, kitchen & bedroom', defaultBeds: 1 },
      { value: '2 Bedroom Apartment', label: '2-Bedroom Apartment (En-Suite)', description: 'Master bedroom + second bedroom', defaultBeds: 2 },
      { value: '3 Bedroom Apartment', label: '3-Bedroom Apartment', description: 'Spacious flat for family or executive living', defaultBeds: 3 },
      { value: '4+ Bedroom Apartment', label: '4+ Bedroom Luxury Penthouse', description: 'Large layout / penthouse level', defaultBeds: 4 },
    ],
    gateLockOptions: [
      { value: 'No Curfew / 24/7 Access', label: '24/7 Unrestricted Gate Access' },
      { value: 'Security Gate Open with Keycard/Remote', label: 'Security Gate with Remote / Keycard' },
      { value: 'Gate closed 11:00 PM (Intercom/Security guard on duty)', label: 'Gate manned by 24/7 Security' },
    ],
    defaultGateLock: 'No Curfew / 24/7 Access',
    visitorPolicyOptions: [
      { value: 'Open / Standard Residential Guests', label: 'Standard Residential (Guests welcome)' },
      { value: 'Day visitors allowed until 10 PM', label: 'Day visitors until 10:00 PM' },
      { value: 'Overnight visitors permitted with notice', label: 'Overnight guests permitted' },
    ],
    defaultVisitorPolicy: 'Open / Standard Residential Guests',
    quietHoursOptions: [
      { value: 'From 10:00 PM', label: 'Quiet hours from 10:00 PM' },
      { value: 'From 11:00 PM', label: 'Quiet hours from 11:00 PM' },
      { value: 'Standard Residential Courtesy', label: 'Standard Residential Courtesy' },
    ],
    defaultQuietHours: 'From 10:00 PM',
    recommendedAmenities: [
      'Standby Generator',
      '24/7 Water (Borehole / Polytank)',
      'Air Conditioning (AC)',
      'Prepaid Electricity Meter',
      'Dedicated Garage Parking',
      'Paved Compound Parking',
      'Fitted Kitchen / Kitchenette',
      'Water Heater',
    ],
  },

  Studio: {
    value: 'Studio',
    label: 'Executive Studio / Self-Contained',
    badge: 'Studio',
    description: 'Compact, private single-unit living space with integrated kitchenette and private en-suite bathroom.',
    defaultTitlePlaceholder: 'e.g. Airport Residential Modern Executive Studio',
    targetAudienceOptions: [
      { value: 'Working Professionals', label: 'Working Professionals' },
      { value: 'Open to All', label: 'Open to All' },
      { value: 'Postgraduate Only', label: 'Postgraduate Students' },
      { value: 'Short-Term Vacationers', label: 'Digital Nomads & Short-Stay' },
    ],
    billingPeriodOptions: [
      { value: 'Monthly', label: 'Monthly Rent' },
      { value: 'Annual', label: 'Annual (12 Months Advance)' },
      { value: 'Quarterly', label: 'Quarterly Advance' },
      { value: 'Nightly', label: 'Nightly / Short-Stay' },
    ],
    defaultBillingPeriod: 'Monthly',
    unitLabel: 'Studio Unit Configurations',
    unitHelpText: 'Configure studio unit count, layout styles, and rental rates.',
    showGenderWing: false,
    blockNameLabel: 'Studio Unit / Suite No.',
    blockNamePlaceholder: 'e.g. Suite 101 or Unit A',
    roomTypeOptions: [
      { value: '1 in a room (Studio)', label: 'Standard Executive Studio', description: 'Full private self-contained studio', defaultBeds: 1 },
      { value: 'Deluxe Studio', label: 'Deluxe Studio with Balcony', description: 'Larger floor plan with private balcony', defaultBeds: 1 },
      { value: 'Furnished Serviced Studio', label: 'Serviced Studio (Turnkey Furnished)', description: 'Fully fitted with daily/weekly cleaning', defaultBeds: 1 },
    ],
    gateLockOptions: [
      { value: 'No Curfew / 24/7 Access', label: '24/7 Unrestricted Gate Access' },
      { value: 'Smart Keycard / Biometric Gate', label: 'Smart Keycard / Biometric Access' },
    ],
    defaultGateLock: 'No Curfew / 24/7 Access',
    visitorPolicyOptions: [
      { value: 'Open / Standard Residential Guests', label: 'Standard Residential (Guests welcome)' },
      { value: 'Day visitors allowed until 10 PM', label: 'Day visitors until 10:00 PM' },
      { value: 'Overnight visitors permitted with notice', label: 'Overnight guests permitted' },
    ],
    defaultVisitorPolicy: 'Open / Standard Residential Guests',
    quietHoursOptions: [
      { value: 'From 10:00 PM', label: 'Quiet hours from 10:00 PM' },
      { value: 'Standard Residential Courtesy', label: 'Standard Residential Courtesy' },
    ],
    defaultQuietHours: 'From 10:00 PM',
    recommendedAmenities: [
      'Standby Generator',
      'Air Conditioning (AC)',
      'High-Speed Fiber WiFi',
      'Water Heater',
      'Prepaid Electricity Meter',
      'Fitted Kitchen / Kitchenette',
    ],
  },

  House: {
    value: 'House',
    label: 'Detached House / Townhouse',
    badge: 'House / Townhouse',
    description: 'Whole residential house, standalone compound villa, or gated community townhouse.',
    defaultTitlePlaceholder: 'e.g. East Legon 4-Bedroom Gated Villa with Boys Quarters',
    targetAudienceOptions: [
      { value: 'Families', label: 'Families' },
      { value: 'Working Professionals', label: 'Executives & Corporate Tenancies' },
      { value: 'Open to All', label: 'Open to All' },
    ],
    billingPeriodOptions: [
      { value: 'Annual', label: 'Annual (1–2 Years Advance per Ghana Rent Norms)' },
      { value: 'Monthly', label: 'Monthly Rent' },
      { value: 'Quarterly', label: 'Quarterly' },
    ],
    defaultBillingPeriod: 'Annual',
    unitLabel: 'House Layout & Rates',
    unitHelpText: 'Specify entire house bedroom configuration, staff quarters, and comprehensive lease rate.',
    showGenderWing: false,
    blockNameLabel: 'House / Plot / Villa Reference',
    blockNamePlaceholder: 'e.g. Main Villa + 1-Bed BQ',
    roomTypeOptions: [
      { value: '2 Bedroom House', label: '2-Bedroom Standalone House', description: 'Detached house with private compound', defaultBeds: 2 },
      { value: '3 Bedroom House', label: '3-Bedroom Townhouse / House', description: 'Standard residential family house', defaultBeds: 3 },
      { value: '4 Bedroom House', label: '4-Bedroom Detached Villa', description: 'Executive home with ample compound', defaultBeds: 4 },
      { value: '5+ Bedroom Luxury Villa', label: '5+ Bedroom Mansion / Luxury Villa', description: 'Large estate with pool/BQ', defaultBeds: 5 },
    ],
    gateLockOptions: [
      { value: 'No Curfew / Private Automated Gate', label: 'Private Automated Remote Gate (24/7 Access)' },
      { value: 'Gated Community Security Controlled', label: 'Gated Estate Security Access (24/7)' },
      { value: 'Manual Compound Gate', label: 'Private Compound Manual Gate' },
    ],
    defaultGateLock: 'No Curfew / Private Automated Gate',
    visitorPolicyOptions: [
      { value: 'Unrestricted / Private Household', label: 'Unrestricted (Private Household)' },
      { value: 'Open / Standard Residential Guests', label: 'Standard Residential' },
    ],
    defaultVisitorPolicy: 'Unrestricted / Private Household',
    quietHoursOptions: [
      { value: 'Standard Residential Courtesy', label: 'Standard Residential Courtesy' },
      { value: 'From 10:00 PM', label: 'Estate quiet hours from 10:00 PM' },
    ],
    defaultQuietHours: 'Standard Residential Courtesy',
    recommendedAmenities: [
      'Standby Generator',
      'Solar Inverter / Backup',
      '24/7 Water (Borehole / Polytank)',
      'Electric Wall Fence',
      'Dedicated Garage Parking',
      'Courtyard / Garden',
      'Swimming Pool',
    ],
  },

  Hostel: {
    value: 'Hostel',
    label: 'Student Hostel / Hall Residence',
    badge: 'Student Hostel',
    description: 'Shared student accommodation, campus hostels, and multi-bed hall residences with wings and wardens.',
    defaultTitlePlaceholder: 'e.g. Evandy Hostel - Premium Block B',
    targetAudienceOptions: [
      { value: 'Students Only', label: 'Students Only (Undergraduate)' },
      { value: 'Postgraduate Only', label: 'Postgraduate Students Only' },
      { value: 'Open to All', label: 'Open to All Students & Interns' },
    ],
    billingPeriodOptions: [
      { value: 'Academic Year', label: 'Academic Year (2 Semesters)' },
      { value: 'Semester', label: 'Per Semester' },
      { value: 'Monthly', label: 'Monthly' },
    ],
    defaultBillingPeriod: 'Academic Year',
    unitLabel: 'Hostel Wings & Bed Tiers (Per Resident)',
    unitHelpText: 'Configure student room sharing tiers, gender-segregated wings/blocks, and rates per resident.',
    showGenderWing: true,
    blockNameLabel: 'Block / Wing Name',
    blockNamePlaceholder: 'e.g. Block A or Female Wing',
    roomTypeOptions: [
      { value: '1 in a room', label: '1 in a room (Single / Executive)', description: 'Private room with single occupancy', defaultBeds: 1 },
      { value: '2 in a room', label: '2 in a room (Double)', description: '2 beds per room shared by 2 students', defaultBeds: 2 },
      { value: '3 in a room', label: '3 in a room (Triple)', description: '3 beds per room shared by 3 students', defaultBeds: 3 },
      { value: '4 in a room', label: '4 in a room (Quad)', description: '4 beds per room shared by 4 students', defaultBeds: 4 },
    ],
    gateLockOptions: [
      { value: 'Gate locks at 10:00 PM', label: 'Gate locks at 10:00 PM (Strict Curfew)' },
      { value: 'Gate locks at 10:30 PM', label: 'Gate locks at 10:30 PM' },
      { value: 'Gate locks at 11:00 PM', label: 'Gate locks at 11:00 PM' },
      { value: 'Gate locks at 12:00 Midnight', label: 'Gate locks at 12:00 Midnight' },
      { value: 'No Curfew / 24/7 Access', label: '24/7 Gate Access (Biometric / Porter on duty)' },
    ],
    defaultGateLock: 'Gate locks at 10:00 PM',
    visitorPolicyOptions: [
      { value: 'Day visitors allowed until 8 PM', label: 'Day visitors allowed until 8:00 PM' },
      { value: 'Visitors allowed in lounge only', label: 'Visitors allowed in study lounge / lobby only' },
      { value: 'Strictly No Opposite-Gender Guests in Rooms', label: 'No opposite-gender guests inside rooms' },
      { value: 'Overnight visitors allowed with notice', label: 'Overnight visitors permitted with warden notice' },
    ],
    defaultVisitorPolicy: 'Day visitors allowed until 8 PM',
    quietHoursOptions: [
      { value: 'From 10:00 PM', label: 'Quiet study hours from 10:00 PM' },
      { value: 'From 9:00 PM', label: 'Strict quiet hours from 9:00 PM' },
      { value: '24/7 Study Atmosphere', label: '24/7 Quiet Study Atmosphere (Exam periods)' },
    ],
    defaultQuietHours: 'From 10:00 PM',
    recommendedAmenities: [
      'High-Speed Fiber WiFi',
      'Study Desk & Chair',
      'Dedicated Study Lounge',
      'Standby Generator',
      '24/7 Water (Borehole / Polytank)',
      'Free Campus Shuttle Service',
      'CCTV Surveillance Cameras',
      '24/7 Security Guard',
    ],
  },
};

export function resolvePropertyCategory(typeString?: string): PropertyCategory {
  if (!typeString) return 'Apartment';
  const norm = typeString.toLowerCase().trim();
  if (norm.includes('hostel') || norm.includes('hall') || norm.includes('residence') || norm.includes('campus')) {
    return 'Hostel';
  }
  if (norm.includes('studio') || norm.includes('self-contain')) {
    return 'Studio';
  }
  if (norm.includes('house') || norm.includes('townhouse') || norm.includes('villa') || norm.includes('mansion') || norm.includes('homestay') || norm.includes('guest')) {
    return 'House';
  }
  return 'Apartment';
}

export function isHostelProperty(typeString?: string): boolean {
  return resolvePropertyCategory(typeString) === 'Hostel';
}

/**
 * Formats a unit/room label so Apartments, Studios, and Houses never display
 * hostel-specific strings like "1 in a room" or "Bed 1".
 */
export function formatBookingUnitLabel(
  propertyType?: string,
  roomType?: string,
  blockName?: string | null
): string {
  const category = resolvePropertyCategory(propertyType);
  const raw = (roomType || '').trim();
  const lower = raw.toLowerCase();
  const prefix = blockName ? `${blockName} · ` : '';

  if (category === 'Hostel') {
    return `${prefix}${raw || 'Standard Room'}`;
  }

  // Normalize legacy "N in a room" strings for non-hostel properties
  if (lower.includes('in a room') || lower === 'single' || lower === 'double') {
    const countMatch = lower.match(/\d+/);
    const beds = countMatch ? parseInt(countMatch[0], 10) : 1;
    if (category === 'Studio') return `${prefix}Executive Studio`;
    if (category === 'House') return `${prefix}${beds}-Bedroom House`;
    return `${prefix}${beds}-Bedroom Apartment`;
  }

  if (raw) {
    return `${prefix}${raw}`;
  }

  if (category === 'Studio') return `${prefix}Executive Studio`;
  if (category === 'House') return `${prefix}Entire House`;
  return `${prefix}Self-Contained Apartment`;
}
