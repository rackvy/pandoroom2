// Time constants
export const START_HOUR = 9;
export const START_MINUTE = 30;
export const END_HOUR = 24;
export const PIXELS_PER_MINUTE = 2;
export const TIME_STEP_MINUTES = 30;
export const MIN_RESERVATION_MINUTES = 60;
export const CLEANING_BUFFER_MINUTES = 15;

// Calculate total minutes from start of day to grid start
export const GRID_START_MINUTES = START_HOUR * 60 + START_MINUTE;

// Calculate total minutes in grid
export const GRID_END_MINUTES = END_HOUR * 60;
export const TOTAL_GRID_MINUTES = GRID_END_MINUTES - GRID_START_MINUTES;

// Calculate grid height in pixels
export const GRID_HEIGHT_PX = TOTAL_GRID_MINUTES * PIXELS_PER_MINUTE;

/**
 * Convert time string "HH:MM" to minutes from grid start
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes - GRID_START_MINUTES;
}

/**
 * Convert minutes from grid start to time string "HH:MM"
 */
export function minutesToTime(minutes: number): string {
  const totalMinutes = minutes + GRID_START_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format time for display (e.g., "09:30")
 */
export function formatTime(time: string): string {
  return time;
}

/**
 * Snap minutes to nearest grid step (30 min)
 */
export function snapToGrid(minutes: number): number {
  return Math.round(minutes / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
}

/**
 * Calculate duration between two time strings
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime) + GRID_START_MINUTES;
  const end = timeToMinutes(endTime) + GRID_START_MINUTES;
  return end - start;
}

/**
 * Get all time slots for the grid
 */
export function getTimeSlots(): string[] {
  const slots: string[] = [];
  for (let m = GRID_START_MINUTES; m <= GRID_END_MINUTES; m += TIME_STEP_MINUTES) {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
  }
  return slots;
}

/**
 * Parse time string to get position in pixels
 */
export function timeToPosition(time: string): number {
  return timeToMinutes(time) * PIXELS_PER_MINUTE;
}

/**
 * Convert pixel position to time string
 */
export function positionToTime(position: number): string {
  const minutes = position / PIXELS_PER_MINUTE;
  const snapped = snapToGrid(minutes);
  return minutesToTime(snapped);
}

/**
 * Format date for API (YYYY-MM-DD) in local timezone
 */
export function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date string
 */
export function getTodayString(): string {
  return formatDateForApi(new Date());
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date for display
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });
}

/**
 * Add minutes to a time string "HH:MM"
 */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

/**
 * Parse time string to minutes from midnight
 */
export function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Round minutes to nearest step
 */
export function roundToStep(minutes: number, step: number = 30): number {
  return Math.round(minutes / step) * step;
}

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
export function parseDateFromString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date in local timezone (not UTC)
  const date = new Date(year, month - 1, day);
  return date;
}
