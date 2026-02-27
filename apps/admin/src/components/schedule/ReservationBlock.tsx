import { useState, useRef, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { timeToMinutes, minutesToTime, snapToGrid, TIME_STEP_MINUTES } from './timeUtils';
import styles from './ScheduleGrid.module.css';
import type { TableReservation, QuestReservation } from '../../api/schedule';

interface ReservationBlockProps {
  reservation: TableReservation | QuestReservation;
  slotHeight: number;
  slotCount: number;
  onOpenPopover: (reservation: TableReservation | QuestReservation, rect: DOMRect) => void;
  onResize: (id: string, newStartTime: string, newEndTime: string) => void;
}

export default function ReservationBlock({ 
  reservation, 
  slotHeight,
  slotCount,
  onOpenPopover, 
  onResize 
}: ReservationBlockProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [, setResizeType] = useState<'top' | 'bottom' | null>(null);
  const [ghostSlotCount, setGhostSlotCount] = useState<number | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startSlotCountRef = useRef(0);
  const ghostSlotCountRef = useRef<number | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: reservation.id,
    data: { reservation },
    disabled: isResizing,
  });

  // Calculate height based on slot count
  const displaySlotCount = ghostSlotCount ?? slotCount;
  const displayHeight = displaySlotCount * slotHeight;

  const handleResizeStart = useCallback((e: React.MouseEvent, type: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    // Prevent drag from starting
    e.persist?.();
    setIsResizing(true);
    setResizeType(type);
    startYRef.current = e.clientY;
    startSlotCountRef.current = slotCount;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startYRef.current;
      const deltaSlots = Math.round(deltaY / slotHeight);

      let newSlotCount = startSlotCountRef.current;

      if (type === 'top') {
        newSlotCount = startSlotCountRef.current - deltaSlots;
        // Minimum 2 slots (1 hour)
        if (newSlotCount < 2) {
          newSlotCount = 2;
        }
      } else {
        newSlotCount = startSlotCountRef.current + deltaSlots;
        if (newSlotCount < 2) {
          newSlotCount = 2;
        }
      }

      setGhostSlotCount(newSlotCount);
      ghostSlotCountRef.current = newSlotCount;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeType(null);

      const finalGhostSlotCount = ghostSlotCountRef.current;
      if (finalGhostSlotCount !== null && finalGhostSlotCount !== slotCount) {
        const startMinutes = timeToMinutes(reservation.startTime);
        const durationMinutes = finalGhostSlotCount * TIME_STEP_MINUTES;
        
        let newStartTime = reservation.startTime;
        let newEndTime = minutesToTime(startMinutes + durationMinutes);

        if (type === 'top') {
          // When resizing from top, adjust start time
          const newStartMinutes = startMinutes + (slotCount - finalGhostSlotCount) * TIME_STEP_MINUTES;
          newStartTime = minutesToTime(snapToGrid(newStartMinutes));
        }

        if (newStartTime !== reservation.startTime || newEndTime !== reservation.endTime) {
          onResize(reservation.id, newStartTime, newEndTime);
        }
      }

      setGhostSlotCount(null);
      ghostSlotCountRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [slotCount, slotHeight, reservation, onResize, ghostSlotCount]);

  const handleClick = (_e: React.MouseEvent) => {
    if (isResizing || isDragging) return;
    if (blockRef.current) {
      onOpenPopover(reservation, blockRef.current.getBoundingClientRect());
    }
  };

  const style: React.CSSProperties = {
    height: displayHeight,
    // Only apply drag transform when not resizing
    transform: (!isResizing && transform) ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: (isDragging || isResizing) ? 100 : 5,
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
      data-reservation-start={reservation.startTime}
      data-reservation-end={reservation.endTime}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      {/* Resize handle top */}
      <div
        className={`${styles.resizeHandle} ${styles.resizeHandleTop}`}
        onMouseDown={(e) => handleResizeStart(e, 'top')}
      />

      {/* Content */}
      <div className={styles.reservationTitle}>{reservation.title || 'Бронь'}</div>
      <div className={styles.reservationTime}>
        {reservation.startTime} - {reservation.endTime}
      </div>

      {/* Resize handle bottom */}
      <div
        className={`${styles.resizeHandle} ${styles.resizeHandleBottom}`}
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />
    </div>
  );
}
