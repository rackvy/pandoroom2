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
 * Parse time string to minutes from midnight
 */
export function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes from midnight to time string "HH:MM"
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Snap minutes to nearest grid step (30 min)
 */
export function snapToGrid(minutes: number): number {
  return Math.round(minutes / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
}

/**
 * Round minutes to nearest step
 */
export function roundToStep(minutes: number, step: number = TIME_STEP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

/**
 * Add minutes to a time string "HH:MM"
 */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const totalMinutes = parseTime(timeStr) + minutes;
  return formatTime(totalMinutes);
}

/**
 * Calculate duration between two time strings
 */
export function calculateDuration(startTime: string, endTime: string): number {
  return parseTime(endTime) - parseTime(startTime);
}

/**
 * Get all time slots for the grid
 */
export function getTimeSlots(): string[] {
  const slots: string[] = [];
  for (let m = GRID_START_MINUTES; m <= GRID_END_MINUTES; m += TIME_STEP_MINUTES) {
    slots.push(formatTime(m));
  }
  return slots;
}

/**
 * Convert pixel position to minutes from grid start
 */
export function pixelsToMinutes(pixels: number): number {
  return pixels / PIXELS_PER_MINUTE;
}

/**
 * Convert minutes from grid start to pixel position
 */
export function minutesToPixels(minutes: number): number {
  return minutes * PIXELS_PER_MINUTE;
}

/**
 * Convert Y position to time string
 * @param y - Y position in pixels (relative to grid content)
 * @param scrollTop - Current scroll position
 */
export function yPositionToTime(y: number, scrollTop: number = 0): string {
  const adjustedY = y + scrollTop;
  const minutesFromStart = pixelsToMinutes(adjustedY);
  const snappedMinutes = snapToGrid(minutesFromStart);
  return minutesToTime(Math.max(0, snappedMinutes));
}

/**
 * Convert time string to Y position
 */
export function timeToYPosition(time: string): number {
  const minutes = timeToMinutes(time);
  return minutesToPixels(minutes);
}

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
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
 * Check if two time ranges overlap
 * @param start1 - Start time in minutes
 * @param end1 - End time in minutes
 * @param start2 - Start time in minutes
 * @param end2 - End time in minutes
 */
export function rangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Normalize selection range (ensure start <= end and minimum duration)
 */
export function normalizeSelection(
  startMinutes: number,
  endMinutes: number,
  minDuration: number = MIN_RESERVATION_MINUTES
): { start: number; end: number } {
  let start = Math.min(startMinutes, endMinutes);
  let end = Math.max(startMinutes, endMinutes);
  
  // Ensure minimum duration
  if (end - start < minDuration) {
    end = start + minDuration;
  }
  
  return { start, end };
}
