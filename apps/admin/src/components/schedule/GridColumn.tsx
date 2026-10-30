import { useDroppable } from '@dnd-kit/core';
import ReservationBlock from './ReservationBlock';
import SelectionOverlay from './SelectionOverlay';
import { timeToMinutes } from './timeUtils';
import { parseTime } from '../../utils/time';
import styles from './ScheduleGrid.module.css';
import type { Table, Quest, TableReservation, QuestReservation } from '../../api/schedule';

interface GridColumnProps {
  item: Table | Quest;
  reservations: (TableReservation | QuestReservation)[];
  timeSlots: string[];
  onCellClick?: (itemId: string, timeSlot: string) => void;
  onOpenPopover: (reservation: TableReservation | QuestReservation, rect: DOMRect) => void;
  onResize: (id: string, newStartTime: string, newEndTime: string) => void | Promise<void>;
  // Range selection props
  isSelecting?: boolean;
  selectionColumnId?: string | null;
  selectionStartMinutes?: number;
  selectionEndMinutes?: number;
  hasOverlap?: boolean;
  onMouseDown?: (e: React.MouseEvent, itemId: string) => void;
}

function DroppableCell({ timeSlot, itemId, hasReservation, onCellClick, children }: {
  timeSlot: string;
  itemId: string;
  hasReservation: boolean;
  onCellClick?: () => void;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${itemId}-${timeSlot}`,
    data: { itemId, timeSlot },
    disabled: hasReservation,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.gridCell} ${!hasReservation && onCellClick ? styles.clickableCell : ''} ${isOver ? styles.dragOver : ''}`}
      onClick={onCellClick}
    >
      {children}
    </div>
  );
}

interface ReservationWithPosition {
  reservation: TableReservation | QuestReservation;
  startSlotIndex: number;
  endSlotIndex: number;
}

export default function GridColumn({ 
  item, 
  reservations, 
  timeSlots,
  onCellClick,
  onOpenPopover, 
  onResize,
  isSelecting,
  selectionColumnId,
  selectionStartMinutes,
  selectionEndMinutes,
  hasOverlap,
  onMouseDown,
}: GridColumnProps) {

  // Calculate which reservations occupy which time slots
  const reservationsWithPositions: ReservationWithPosition[] = reservations.map(reservation => {
    const startMinutes = timeToMinutes(reservation.startTime);
    const endMinutes = timeToMinutes(reservation.endTime);
    
    // Find the slot index for start and end times
    const startSlotIndex = timeSlots.findIndex(slot => {
      const slotMinutes = timeToMinutes(slot);
      return slotMinutes >= startMinutes;
    });
    
    const endSlotIndex = timeSlots.findIndex(slot => {
      const slotMinutes = timeToMinutes(slot);
      return slotMinutes >= endMinutes;
    });
    
    return {
      reservation,
      startSlotIndex: startSlotIndex === -1 ? 0 : startSlotIndex,
      endSlotIndex: endSlotIndex === -1 ? timeSlots.length : endSlotIndex,
    };
  });

  // Check if a time slot has a reservation
  const getReservationForSlot = (slotIndex: number): ReservationWithPosition | undefined => {
    return reservationsWithPositions.find(r => 
      slotIndex >= r.startSlotIndex && slotIndex < r.endSlotIndex
    );
  };

  const isFirstSlotOfReservation = (slotIndex: number, reservationPos: ReservationWithPosition): boolean => {
    return slotIndex === reservationPos.startSlotIndex;
  };

  // Calculate selection overlay position if this column is being selected
  const showSelection = isSelecting && selectionColumnId === item.id && 
    selectionStartMinutes !== undefined && selectionEndMinutes !== undefined;
  
  const selectionRect = showSelection ? (() => {
    const start = Math.min(selectionStartMinutes, selectionEndMinutes);
    const end = Math.max(selectionStartMinutes, selectionEndMinutes);
    const topPx = start - parseTime(timeSlots[0]);
    const heightPx = end - start;
    return { topPx, heightPx, startMinutes: start, endMinutes: end };
  })() : null;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if clicking on a reservation block
    const target = e.target as HTMLElement;
    const isReservationClick = target.closest('[data-reservation-id]') !== null;
    
    if (!isReservationClick && onMouseDown) {
      onMouseDown(e, item.id);
    }
  };

  return (
    <div 
      className={styles.tableColumn}
      onMouseDown={handleMouseDown}
    >
      {timeSlots.map((timeSlot, index) => {
        const reservationPos = getReservationForSlot(index);
        const hasReservation = reservationPos && isFirstSlotOfReservation(index, reservationPos);
        
        return (
          <DroppableCell
            key={timeSlot}
            timeSlot={timeSlot}
            itemId={item.id}
            hasReservation={!!hasReservation}
            onCellClick={!hasReservation && onCellClick ? () => onCellClick(item.id, timeSlot) : undefined}
          >
            {hasReservation && (
              <ReservationBlock
                reservation={reservationPos.reservation}
                slotHeight={30}
                onOpenPopover={onOpenPopover}
                onResize={onResize}
              />
            )}
          </DroppableCell>
        );
      })}
      
      {/* Selection overlay */}
      {selectionRect && (
        <SelectionOverlay
          topPx={selectionRect.topPx}
          heightPx={selectionRect.heightPx}
          hasOverlap={hasOverlap || false}
          startMinutes={selectionRect.startMinutes}
          endMinutes={selectionRect.endMinutes}
        />
      )}
    </div>
  );
}
