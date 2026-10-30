import { useState, useRef, useCallback, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { parseTime, formatTime, TIME_STEP_MINUTES, MIN_RESERVATION_MINUTES, GRID_START_MINUTES, GRID_END_MINUTES } from '../../utils/time';
import styles from './ScheduleGrid.module.css';
import type { TableReservation, QuestReservation } from '../../api/schedule';

interface ReservationBlockProps {
  reservation: TableReservation | QuestReservation;
  slotHeight: number;
  onOpenPopover: (reservation: TableReservation | QuestReservation, rect: DOMRect) => void;
  onResize: (id: string, newStartTime: string, newEndTime: string) => void | Promise<void>;
}

type TimeRange = { start: number; end: number };
type ResizeGesture = {
  pointerId: number;
  handle: HTMLDivElement;
  edge: 'top' | 'bottom';
  startY: number;
  scrollContainer: HTMLElement | null;
  scrollTop: number;
  initial: TimeRange;
  range: TimeRange;
};

export default function ReservationBlock({ reservation, slotHeight, onOpenPopover, onResize }: ReservationBlockProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<TimeRange | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<ResizeGesture | null>(null);
  const savingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const start = parseTime(reservation.startTime);
  const end = parseTime(reservation.endTime);
  const pixelsPerMinute = slotHeight / TIME_STEP_MINUTES;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: reservation.id,
    data: { reservation },
    disabled: isResizing || isSaving,
  });

  const releaseGesture = useCallback(() => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (gesture?.handle.hasPointerCapture(gesture.pointerId)) {
      gesture.handle.releasePointerCapture(gesture.pointerId);
    }
  }, []);

  const cancelResize = useCallback(() => {
    if (!gestureRef.current) return;
    releaseGesture();
    setIsResizing(false);
    setPreview(null);
  }, [releaseGesture]);

  useEffect(() => releaseGesture, [releaseGesture]);

  useEffect(() => {
    if (!isResizing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelResize();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', cancelResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', cancelResize);
    };
  }, [isResizing, cancelResize]);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>, edge: 'top' | 'bottom') => {
    event.stopPropagation();
    event.preventDefault();
    if (event.button !== 0 || !event.isPrimary || savingRef.current || gestureRef.current) return;
    suppressClickRef.current = true;
    const scrollContainer = blockRef.current?.closest<HTMLElement>(`.${styles.gridBody}`) ?? null;
    const initial = { start, end };
    gestureRef.current = {
      pointerId: event.pointerId,
      handle: event.currentTarget,
      edge,
      startY: event.clientY,
      scrollContainer,
      scrollTop: scrollContainer?.scrollTop ?? 0,
      initial,
      range: initial,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreview(initial);
    setIsResizing(true);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    event.stopPropagation();
    const deltaY = event.clientY - gesture.startY + (gesture.scrollContainer?.scrollTop ?? 0) - gesture.scrollTop;
    const deltaMinutes = Math.round(deltaY / slotHeight) * TIME_STEP_MINUTES;
    const range = gesture.edge === 'top'
      ? { start: Math.max(GRID_START_MINUTES, Math.min(gesture.initial.start + deltaMinutes, gesture.initial.end - MIN_RESERVATION_MINUTES)), end: gesture.initial.end }
      : { start: gesture.initial.start, end: Math.min(GRID_END_MINUTES, Math.max(gesture.initial.end + deltaMinutes, gesture.initial.start + MIN_RESERVATION_MINUTES)) };
    if (range.start !== gesture.range.start || range.end !== gesture.range.end) {
      gesture.range = range;
      setPreview(range);
    }
  };

  const handleResizeEnd = async (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    event.stopPropagation();
    handleResizeMove(event);
    const { range, initial } = gesture;
    releaseGesture();
    setIsResizing(false);
    if (range.start === initial.start && range.end === initial.end) {
      setPreview(null);
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    try {
      await onResize(reservation.id, formatTime(range.start), formatTime(range.end));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
      setPreview(null);
    }
  };

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (suppressClickRef.current || isResizing || isSaving || isDragging) return;
    if (blockRef.current) onOpenPopover(reservation, blockRef.current.getBoundingClientRect());
  };

  const display = preview ?? { start, end };
  const style: React.CSSProperties = {
    top: (display.start - start) * pixelsPerMinute,
    height: (display.end - display.start) * pixelsPerMinute,
    transform: (!isResizing && !isSaving && transform) ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: (isDragging || isResizing || isSaving) ? 100 : 5,
    cursor: isSaving ? 'wait' : undefined,
  };

  const handleEvents = {
    onPointerMove: handleResizeMove,
    onPointerUp: handleResizeEnd,
    onPointerCancel: cancelResize,
    onLostPointerCapture: cancelResize,
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        (blockRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className={`${styles.reservationBlock} ${styles[reservation.status]} ${isDragging ? styles.dragging : ''}`}
      style={style}
      data-reservation-id={reservation.id}
      data-reservation-start={formatTime(display.start)}
      data-reservation-end={formatTime(display.end)}
      {...attributes}
      {...listeners}
      aria-busy={isSaving}
      onPointerDown={(event) => {
        suppressClickRef.current = false;
        listeners?.onPointerDown?.(event);
      }}
      onClick={handleClick}
    >
      <div
        className={`${styles.resizeHandle} ${styles.resizeHandleTop}`}
        title="Изменить начало брони"
        onPointerDown={(event) => handleResizeStart(event, 'top')}
        {...handleEvents}
      />
      <div className={styles.reservationTitle}>{reservation.title || 'Бронь'}</div>
      <div className={styles.reservationTime}>
        {formatTime(display.start)} - {formatTime(display.end)}
      </div>
      <div
        className={`${styles.resizeHandle} ${styles.resizeHandleBottom}`}
        title="Изменить конец брони"
        onPointerDown={(event) => handleResizeStart(event, 'bottom')}
        {...handleEvents}
      />
    </div>
  );
}
