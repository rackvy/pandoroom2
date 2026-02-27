import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import GridColumn from './GridColumn';
import BookingPopover from './BookingPopover';
import QuickBookingModal from './QuickBookingModal';
import { toast } from '../ui/Toast';
import { getTimeSlots, timeToMinutes, minutesToTime, snapToGrid } from './timeUtils';
import { 
  parseTime, 
  formatTime, 
  roundToStep, 
  MIN_RESERVATION_MINUTES, 
  TIME_STEP_MINUTES,
  rangesOverlap,
  normalizeSelection,
  GRID_START_MINUTES,
  GRID_END_MINUTES,
} from '../../utils/time';
import styles from './ScheduleGrid.module.css';
import type { TableZone, Table, Quest, TableReservation, QuestReservation } from '../../api/schedule';

interface ScheduleGridProps {
  zones?: TableZone[];
  tables?: Table[];
  quests?: Quest[];
  reservations: (TableReservation | QuestReservation)[];
  isTable: boolean;
  branchId: string;
  eventDate: string;
  onMove: (id: string, updates: { tableId?: string; questId?: string; startTime: string; endTime: string }) => void;
  onCancel: (id: string) => void;
  onNavigateToBooking: (bookingId: string) => void;
  onQuickBook?: (response: { reservation: TableReservation | QuestReservation }) => void;
}

export default function ScheduleGrid({
  zones,
  tables,
  quests,
  reservations,
  isTable,
  branchId,
  eventDate,
  onMove,
  onCancel,
  onNavigateToBooking,
  onQuickBook,
}: ScheduleGridProps) {
  const [popoverState, setPopoverState] = useState<{
    reservation: TableReservation | QuestReservation;
    position: { x: number; y: number };
  } | null>(null);
  
  // Track hovered cell for highlighting (tableId/questId + time slot)
  const [hoveredCell, setHoveredCell] = useState<{ itemId: string; timeSlot: string } | null>(null);
  
  // Quick booking modal state
  const [quickBookState, setQuickBookState] = useState<{
    isOpen: boolean;
    itemId: string;
    startTime: string;
    defaultDuration: number;
  } | null>(null);

  // Range selection state
  const [selectionState, setSelectionState] = useState<{
    isSelecting: boolean;
    columnId: string | null;
    startMinutes: number;
    endMinutes: number;
    hasOverlap: boolean;
  }>({
    isSelecting: false,
    columnId: null,
    startMinutes: 0,
    endMinutes: 0,
    hasOverlap: false,
  });

  const gridContentRef = useRef<HTMLDivElement>(null);

  const timeSlots = useMemo(() => getTimeSlots(), []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const reservation = active.data.current?.reservation as TableReservation | QuestReservation;
    const dropData = over.data.current as { itemId?: string; timeSlot?: string } | undefined;

    if (!reservation || !dropData?.itemId || !dropData?.timeSlot) return;

    // Calculate new time based on dropped cell
    const snappedMinutes = snapToGrid(timeToMinutes(dropData.timeSlot));
    const newStartTime = minutesToTime(snappedMinutes);

    const duration = timeToMinutes(reservation.endTime) - timeToMinutes(reservation.startTime);
    const newEndTime = minutesToTime(snappedMinutes + duration);

    const updates: { tableId?: string; questId?: string; startTime: string; endTime: string } = {
      startTime: newStartTime,
      endTime: newEndTime,
    };

    if (isTable) {
      updates.tableId = dropData.itemId;
    } else {
      updates.questId = dropData.itemId;
    }

    onMove(reservation.id, updates);
  }, [isTable, onMove]);

  const handleOpenPopover = useCallback((reservation: TableReservation | QuestReservation, rect: DOMRect) => {
    setPopoverState({
      reservation,
      position: { x: rect.right + 10, y: rect.top },
    });
  }, []);

  const handleClosePopover = useCallback(() => {
    setPopoverState(null);
  }, []);

  const handleResize = useCallback((id: string, newStartTime: string, newEndTime: string) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    const updates: { tableId?: string; questId?: string; startTime: string; endTime: string } = {
      startTime: newStartTime,
      endTime: newEndTime,
    };

    if (isTable) {
      updates.tableId = (reservation as TableReservation).tableId;
    } else {
      updates.questId = (reservation as QuestReservation).questId;
    }

    onMove(id, updates);
  }, [reservations, isTable, onMove]);

  // Group tables by zones
  const tablesByZone = useMemo(() => {
    if (!zones || !tables) return [];
    return zones.map(zone => ({
      zone,
      tables: tables.filter(t => t.zoneId === zone.id),
    }));
  }, [zones, tables]);

  // Get reservations for an item
  const getReservationsForItem = useCallback((itemId: string) => {
    return reservations.filter(r => {
      if (isTable) {
        return (r as TableReservation).tableId === itemId;
      }
      return (r as QuestReservation).questId === itemId;
    });
  }, [reservations, isTable]);

  // Check if selection overlaps with existing reservations
  const checkOverlap = useCallback((columnId: string, startMinutes: number, endMinutes: number): boolean => {
    const itemReservations = getReservationsForItem(columnId);
    
    for (const res of itemReservations) {
      const resStart = parseTime(res.startTime);
      const resEnd = parseTime(res.endTime);
      
      if (isTable) {
        // For tables: check overlap including cleaning buffer
        const tableRes = res as TableReservation;
        const blockedEnd = resEnd + (tableRes.cleaningBufferMinutes || 15);
        if (rangesOverlap(startMinutes, endMinutes, resStart, blockedEnd)) {
          return true;
        }
      } else {
        // For quests: check overlap without cleaning buffer
        if (rangesOverlap(startMinutes, endMinutes, resStart, resEnd)) {
          return true;
        }
      }
    }
    
    return false;
  }, [getReservationsForItem, isTable]);

  // Handle cell hover for highlighting
  const handleCellHover = useCallback((itemId: string | null, timeSlot: string | null) => {
    if (itemId && timeSlot) {
      setHoveredCell({ itemId, timeSlot });
    } else {
      setHoveredCell(null);
    }
  }, []);

  // Handle cell click for quick booking
  const handleCellClick = useCallback((itemId: string, timeSlot: string) => {
    // Get default duration
    let defaultDuration = 120; // Default 2 hours for tables
    if (!isTable && quests) {
      const quest = quests.find(q => q.id === itemId);
      if (quest?.durationMinutes) {
        defaultDuration = quest.durationMinutes;
      }
    }
    
    setQuickBookState({
      isOpen: true,
      itemId,
      startTime: timeSlot,
      defaultDuration,
    });
  }, [isTable, quests]);

  const handleCloseQuickBook = useCallback(() => {
    setQuickBookState(null);
  }, []);

  // Range selection handlers
  const handleColumnMouseDown = useCallback((e: React.MouseEvent, columnId: string) => {
    // Only left mouse button
    if (e.button !== 0) return;
    
    // Get grid content element for scroll calculation
    const gridContent = gridContentRef.current;
    if (!gridContent) return;
    
    // Calculate Y position relative to grid content
    const rect = gridContent.getBoundingClientRect();
    const y = e.clientY - rect.top + gridContent.scrollTop;
    
    // Convert to minutes and round to step
    const slotHeight = 30; // 30px per 30 min slot
    const minutesPerSlot = 30;
    const pixelsPerMinute = slotHeight / minutesPerSlot;
    const minutesFromGridStart = y / pixelsPerMinute;
    const roundedMinutes = roundToStep(minutesFromGridStart, TIME_STEP_MINUTES);
    const startMinutes = GRID_START_MINUTES + roundedMinutes;
    
    // Ensure within grid bounds
    if (startMinutes < GRID_START_MINUTES || startMinutes >= GRID_END_MINUTES) return;
    
    // Start selection
    setSelectionState({
      isSelecting: true,
      columnId,
      startMinutes,
      endMinutes: startMinutes + MIN_RESERVATION_MINUTES,
      hasOverlap: false,
    });
  }, []);

  // Handle mouse move during selection
  useEffect(() => {
    if (!selectionState.isSelecting) return;

    const handleMouseMove = (e: MouseEvent) => {
      const gridContent = gridContentRef.current;
      if (!gridContent) return;
      
      const rect = gridContent.getBoundingClientRect();
      const y = e.clientY - rect.top + gridContent.scrollTop;
      
      const slotHeight = 30;
      const minutesPerSlot = 30;
      const pixelsPerMinute = slotHeight / minutesPerSlot;
      const minutesFromGridStart = y / pixelsPerMinute;
      const roundedMinutes = roundToStep(minutesFromGridStart, TIME_STEP_MINUTES);
      let endMinutes = GRID_START_MINUTES + roundedMinutes;
      
      // Clamp to grid bounds
      endMinutes = Math.max(GRID_START_MINUTES, Math.min(endMinutes, GRID_END_MINUTES));
      
      // Normalize selection (ensure min duration)
      const normalized = normalizeSelection(selectionState.startMinutes, endMinutes);
      
      // Check for overlaps
      const hasOverlap = selectionState.columnId 
        ? checkOverlap(selectionState.columnId, normalized.start, normalized.end)
        : false;
      
      setSelectionState(prev => ({
        ...prev,
        endMinutes,
        hasOverlap,
      }));
    };

    const handleMouseUp = () => {
      setSelectionState(prev => {
        if (!prev.isSelecting || !prev.columnId) return prev;
        
        const normalized = normalizeSelection(prev.startMinutes, prev.endMinutes);
        
        // If overlap, show toast and cancel
        if (prev.hasOverlap) {
          // Toast will be shown by the component using this
          return { ...prev, isSelecting: false };
        }
        
        // Open quick booking modal with pre-filled values
        const startTime = formatTime(normalized.start);
        const durationMinutes = normalized.end - normalized.start;
        
        setQuickBookState({
          isOpen: true,
          itemId: prev.columnId,
          startTime,
          defaultDuration: durationMinutes,
        });
        
        return { ...prev, isSelecting: false };
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selectionState.isSelecting, selectionState.columnId, selectionState.startMinutes, checkOverlap]);

  const handleSubmitQuickBook = useCallback(async (data: { clientName: string; clientPhone: string; durationMinutes: number }) => {
    if (!quickBookState) return;

    try {
      // Dynamic import to avoid circular dependency
      const { quickBookTable, quickBookQuest } = await import('../../api/schedule');
      
      let response;
      if (isTable) {
        response = await quickBookTable({
          branchId,
          tableId: quickBookState.itemId,
          eventDate,
          startTime: quickBookState.startTime,
          durationMinutes: data.durationMinutes,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
        });
      } else {
        response = await quickBookQuest({
          branchId,
          questId: quickBookState.itemId,
          eventDate,
          startTime: quickBookState.startTime,
          durationMinutes: data.durationMinutes,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
        });
      }

      // Close modal
      setQuickBookState(null);

      // Open popover for the new reservation
      const newReservation = isTable
        ? {
            id: response.reservation.id,
            bookingId: response.booking.id,
            tableId: response.reservation.tableId!,
            title: data.clientName || 'Новая бронь',
            comment: null,
            status: 'draft' as const,
            eventDate,
            startTime: response.reservation.startTime,
            endTime: response.reservation.endTime,
            cleaningBufferMinutes: response.reservation.cleaningBufferMinutes || 15,
            blockedUntilTime: response.reservation.blockedUntilTime || response.reservation.endTime,
          }
        : {
            id: response.reservation.id,
            bookingId: response.booking.id,
            questId: response.reservation.questId!,
            title: data.clientName || 'Новая бронь',
            animatorName: null,
            comment: null,
            status: 'draft' as const,
            startTime: response.reservation.startTime,
            endTime: response.reservation.endTime,
          };

      setPopoverState({
        reservation: newReservation,
        position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error(error.response.data?.message || 'Слот занят');
      } else {
        toast.error('Ошибка создания брони');
      }
      throw error;
    }
  }, [quickBookState, isTable, branchId, eventDate, onQuickBook]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className={styles.scheduleContainer}>
        {/* Header with zones and table names */}
        <div className={styles.gridHeader}>
          <div className={styles.timeHeader}></div>
          <div className={styles.zoneGroups}>
            {isTable ? (
              // Table grid with zones
              tablesByZone.map(({ zone, tables }) => (
                <div key={zone.id} className={styles.zoneGroup}>
                  <div className={styles.zoneHeader}>{zone.name}</div>
                  <div className={styles.tablesRow}>
                    {tables.map(table => (
                      <div key={table.id} className={styles.tableHeader} title={table.title}>
                        {table.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Quest grid - each quest is its own "zone"
              quests?.map(quest => (
                <div key={quest.id} className={styles.zoneGroup}>
                  <div className={styles.zoneHeader}>{quest.name}</div>
                  <div className={styles.tablesRow}>
                    <div className={styles.tableHeader}>{quest.name}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Grid body with time slots */}
        <div className={styles.gridBody}>
          {/* Time column */}
          <div className={styles.timeColumn}>
            {timeSlots.map(time => (
              <div key={time} className={styles.timeCell}>
                {time}
              </div>
            ))}
          </div>

          {/* Grid content with columns */}
          <div className={styles.gridContent} ref={gridContentRef}>
            {isTable ? (
              // Table columns grouped by zone
              tablesByZone.map(({ zone, tables }) => (
                <div key={zone.id} className={styles.zoneColumns}>
                  {tables.map(table => (
                    <GridColumn
                      key={table.id}
                      item={table}
                      reservations={getReservationsForItem(table.id)}
                      timeSlots={timeSlots}
                      hoveredCell={hoveredCell}
                      onCellHover={handleCellHover}
                      onCellClick={onQuickBook ? handleCellClick : undefined}
                      onOpenPopover={handleOpenPopover}
                      onResize={handleResize}
                      isSelecting={selectionState.isSelecting}
                      selectionColumnId={selectionState.columnId}
                      selectionStartMinutes={selectionState.startMinutes}
                      selectionEndMinutes={selectionState.endMinutes}
                      hasOverlap={selectionState.hasOverlap}
                      onMouseDown={onQuickBook ? handleColumnMouseDown : undefined}
                    />
                  ))}
                </div>
              ))
            ) : (
              // Quest columns
              quests?.map(quest => (
                <div key={quest.id} className={styles.zoneColumns}>
                  <GridColumn
                    item={quest}
                    reservations={getReservationsForItem(quest.id)}
                    timeSlots={timeSlots}
                    hoveredCell={hoveredCell}
                    onCellHover={handleCellHover}
                    onCellClick={onQuickBook ? handleCellClick : undefined}
                    onOpenPopover={handleOpenPopover}
                    onResize={handleResize}
                    isSelecting={selectionState.isSelecting}
                    selectionColumnId={selectionState.columnId}
                    selectionStartMinutes={selectionState.startMinutes}
                    selectionEndMinutes={selectionState.endMinutes}
                    hasOverlap={selectionState.hasOverlap}
                    onMouseDown={onQuickBook ? handleColumnMouseDown : undefined}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {popoverState && (
          <BookingPopover
            reservation={popoverState.reservation}
            position={popoverState.position}
            onClose={handleClosePopover}
            onEdit={onNavigateToBooking}
            onCancel={onCancel}
          />
        )}

        {quickBookState && (
          <QuickBookingModal
            isOpen={quickBookState.isOpen}
            onClose={handleCloseQuickBook}
            onSubmit={handleSubmitQuickBook}
            defaultDuration={quickBookState.defaultDuration}
            title={isTable ? 'Быстрая бронь стола' : 'Быстрая бронь квеста'}
          />
        )}
      </div>
    </DndContext>
  );
}
