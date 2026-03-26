export const LIVE_LOCATION_STALE_MINUTES = 10;

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function assertValidCoordinates(latitude: number, longitude: number): void {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    throw new Error('Invalid coordinates.');
  }
}

export function isLocationFresh(
  updatedAt: string,
  staleMinutes = LIVE_LOCATION_STALE_MINUTES,
): boolean {
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  return ageMs >= 0 && ageMs <= staleMinutes * 60 * 1000;
}
