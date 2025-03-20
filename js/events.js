import { state } from './core.js';
import { updateActivityDatalist, renderCalendar, updateActivitySummary } from './ui.js';

// Validate time format
function isValidTimeFormat(timeStr) {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
}

// Validate time range
function isValidTimeRange(startTime, endTime) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    
    return end > start;
}

// Check for event overlap
function hasOverlap(date, startTime, endTime, excludeEventId = null) {
    const dateKey = date.toDateString();
    const events = state.events[dateKey] || [];
    
    const [newStartHour, newStartMinute] = startTime.split(':').map(Number);
    const [newEndHour, newEndMinute] = endTime.split(':').map(Number);
    const newStart = newStartHour * 60 + newStartMinute;
    const newEnd = newEndHour * 60 + newEndMinute;
    
    return events.some(event => {
        if (event.id === excludeEventId) return false;
        
        const [eventStartHour, eventStartMinute] = event.startTime.split(':').map(Number);
        const [eventEndHour, eventEndMinute] = event.endTime.split(':').map(Number);
        const eventStart = eventStartHour * 60 + eventStartMinute;
        const eventEnd = eventEndHour * 60 + eventEndMinute;
        
        return (newStart < eventEnd && newEnd > eventStart);
    });
}

function handleEventSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const activity = formData.get('activity');
        const startTime = formData.get('startTime');
        const endTime = formData.get('endTime');
        const description = formData.get('description');
        const date = new Date(formData.get('date'));
        
        // Validate inputs
        if (!activity) {
            throw new Error('Activity is required');
        }
        
        if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
            throw new Error('Invalid time format. Please use HH:MM format.');
        }
        
        if (!isValidTimeRange(startTime, endTime)) {
            throw new Error('End time must be after start time');
        }
        
        if (hasOverlap(date, startTime, endTime)) {
            throw new Error('This time slot overlaps with an existing event');
        }
        
        // Add activity to available activities if new
        if (!state.activities.has(activity)) {
            state.activities.add(activity);
            state.activityColors[activity] = `color-${state.colorIndex++}`;
            updateActivityDatalist();
        }
        
        // Create event
        const dateKey = date.toDateString();
        if (!state.events[dateKey]) {
            state.events[dateKey] = [];
        }
        
        const event = {
            id: Date.now().toString(),
            activity,
            startTime,
            endTime,
            description
        };
        
        state.events[dateKey].push(event);
        
        // Update UI
        renderCalendar();
        updateActivitySummary();
        
        // Close modal
        document.getElementById('eventModal').style.display = 'none';
        e.target.reset();
        
    } catch (error) {
        alert(error.message);
    }
}

function handleDragStart(e, date, hour) {
    state.isDragging = true;
    state.dragStart = { date, hour };
    e.currentTarget.classList.add('dragging');
}

function handleDragOver(e, date, hour) {
    e.preventDefault();
    if (state.isDragging) {
        state.dragEnd = { date, hour };
        highlightDragSelection();
    }
}

function handleDragEnd() {
    if (state.isDragging && state.dragStart && state.dragEnd) {
        state.selectedSlot = {
            date: state.dragStart.date,
            startHour: Math.min(state.dragStart.hour, state.dragEnd.hour),
            endHour: Math.max(state.dragStart.hour, state.dragEnd.hour) + 1
        };
        
        document.getElementById('eventStartTime').value = 
            `${String(state.selectedSlot.startHour).padStart(2, '0')}:00`;
        document.getElementById('eventEndTime').value = 
            `${String(state.selectedSlot.endHour).padStart(2, '0')}:00`;
        document.getElementById('eventModal').style.display = 'block';
    }
    
    state.isDragging = false;
    state.dragStart = null;
    state.dragEnd = null;
    clearDragSelection();
}

function highlightDragSelection() {
    clearDragSelection();
    if (!state.dragStart || !state.dragEnd) return;
    
    const startHour = Math.min(state.dragStart.hour, state.dragEnd.hour);
    const endHour = Math.max(state.dragStart.hour, state.dragEnd.hour);
    
    for (let hour = startHour; hour <= endHour; hour++) {
        const cell = document.querySelector(
            `[data-date="${state.dragStart.date.toDateString()}"][data-hour="${hour}"]`
        );
        if (cell) {
            cell.classList.add('dragging');
        }
    }
}

function clearDragSelection() {
    document.querySelectorAll('.time-slot.dragging').forEach(cell => {
        cell.classList.remove('dragging');
    });
}

// Export event handling functions
export {
    handleEventSubmit,
    handleDragStart,
    handleDragOver,
    handleDragEnd
}; 