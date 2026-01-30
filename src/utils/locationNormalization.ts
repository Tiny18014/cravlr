/**
 * Location normalization utilities
 * Ensures consistent formatting and validation of location data
 */

/**
 * Normalize a location string by:
 * - Trimming whitespace
 * - Removing trailing commas
 * - Converting to title case
 * - Removing extra spaces
 */
export const normalizeLocationString = (str: string | null | undefined): string => {
  if (!str) return '';
  
  return str
    .trim()
    // Remove trailing commas and spaces
    .replace(/[,\s]+$/, '')
    // Remove leading commas and spaces
    .replace(/^[,\s]+/, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Title case
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Handle special cases like "NC", "USA", "UK"
      if (word.length <= 2 && word === word.toUpperCase()) {
        return word;
      }
      // Handle hyphenated words like "Dhangadhi-Sub-Metropolitan"
      if (word.includes('-')) {
        return word.split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Normalize city and state together
 */
export const normalizeLocation = (city: string, state: string): { city: string; state: string } => {
  return {
    city: normalizeLocationString(city),
    state: normalizeLocationString(state),
  };
};

/**
 * Validate that a location has valid coordinates
 */
export const hasValidCoordinates = (lat: number | null | undefined, lng: number | null | undefined): boolean => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  // Valid latitude range: -90 to 90
  // Valid longitude range: -180 to 180
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Format a location display string
 */
export const formatLocationDisplay = (
  city: string | null | undefined,
  state: string | null | undefined,
  country?: string | null
): string => {
  const parts = [city, state, country].filter(Boolean).map(part => normalizeLocationString(part!));
  return parts.join(', ');
};

/**
 * Check if two locations are approximately the same
 * (within ~1km of each other)
 */
export const areLocationsNear = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  thresholdKm: number = 1
): boolean => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= thresholdKm;
};

/**
 * Calculate distance between two coordinates in kilometers
 */
export const calculateDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
