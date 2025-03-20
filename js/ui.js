import { state } from './core.js';
import { formatDate, formatTime, formatDuration, getDayName, shouldIncludeDate } from './utils.js';
import { handleDragStart, handleDragOver, handleDragEnd } from './events.js';

export function renderCalendar() {
    const daysGrid = document.getElementById('daysGrid');
    daysGrid.innerHTML = '';
    
    const weekStart = new Date(state.currentDate);
    weekStart.setDate(state.currentDate.getDate() - state.currentDate.getDay());
    
    document.getElementById('weekDisplay').textContent = 
        `${formatDate(weekStart)} - ${formatDate(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}`;
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
        daysGrid.appendChild(createDayColumn(date));
    }
    
    renderEvents();
    updateCurrentTimeLine();
}

function createDayColumn(date) {
    const column = document.createElement('div');
    column.className = 'day-column';
    column.setAttribute('role', 'grid');
    column.setAttribute('aria-label', getDayName(date));
    
    const headerCell = document.createElement('div');
    headerCell.className = 'header-cell';
    headerCell.textContent = formatDate(date);
    headerCell.setAttribute('role', 'columnheader');
    column.appendChild(headerCell);
    
    for (let hour = 0; hour < 24; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.dataset.date = date.toDateString();
        timeSlot.dataset.hour = hour;
        timeSlot.setAttribute('role', 'gridcell');
        timeSlot.setAttribute('tabindex', '0');
        timeSlot.setAttribute('aria-label', `${hour}:00`);
        
        // Add keyboard support
        timeSlot.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'Enter':
                case ' ':
                    handleDragStart(e, date, hour);
                    handleDragEnd(e);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (hour > 0) {
                        column.children[hour].focus();
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (hour < 23) {
                        column.children[hour + 2].focus();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    const prevColumn = column.previousElementSibling;
                    if (prevColumn) {
                        const prevSlot = prevColumn.querySelector(`[data-hour="${hour}"]`);
                        if (prevSlot) prevSlot.focus();
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    const nextColumn = column.nextElementSibling;
                    if (nextColumn) {
                        const nextSlot = nextColumn.querySelector(`[data-hour="${hour}"]`);
                        if (nextSlot) nextSlot.focus();
                    }
                    break;
            }
        });
        
        timeSlot.addEventListener('mousedown', (e) => handleDragStart(e, date, hour));
        timeSlot.addEventListener('mouseover', (e) => handleDragOver(e, date, hour));
        timeSlot.addEventListener('mouseup', handleDragEnd);
        
        column.appendChild(timeSlot);
    }
    
    return column;
}

function renderEvents() {
    document.querySelectorAll('.event').forEach(event => event.remove());
    
    // Group events by date
    for (const dateKey in state.events) {
        const events = state.events[dateKey];
        
        // Sort events by start time
        events.sort((a, b) => {
            const aStart = parseInt(a.startTime.split(':').join(''));
            const bStart = parseInt(b.startTime.split(':').join(''));
            return aStart - bStart;
        });
        
        // Find overlapping groups
        const overlappingGroups = [];
        let currentGroup = [];
        
        events.forEach((event, index) => {
            if (index === 0) {
                currentGroup.push(event);
                return;
            }
            
            const prevEvent = events[index - 1];
            const currentStart = parseInt(event.startTime.split(':').join(''));
            const prevEnd = parseInt(prevEvent.endTime.split(':').join(''));
            
            if (currentStart < prevEnd) {
                currentGroup.push(event);
            } else {
                if (currentGroup.length > 0) {
                    overlappingGroups.push([...currentGroup]);
                }
                currentGroup = [event];
            }
        });
        
        if (currentGroup.length > 0) {
            overlappingGroups.push(currentGroup);
        }
        
        // Render each group
        overlappingGroups.forEach(group => {
            const groupWidth = 100 / group.length;
            
            group.forEach((event, index) => {
                const eventElement = createEventElement(event);
                const startHour = parseInt(event.startTime.split(':')[0]);
                const startMinute = parseInt(event.startTime.split(':')[1]);
                const endHour = parseInt(event.endTime.split(':')[0]);
                const endMinute = parseInt(event.endTime.split(':')[1]);
                
                const timeSlot = document.querySelector(`[data-date="${dateKey}"][data-hour="${startHour}"]`);
                if (timeSlot) {
                    const eventHeight = (endHour - startHour + endMinute/60 - startMinute/60) * 60;
                    const topOffset = (startMinute / 60) * 60;
                    
                    eventElement.style.height = `${eventHeight}px`;
                    eventElement.style.top = `${topOffset}px`;
                    eventElement.style.width = `${groupWidth}%`;
                    eventElement.style.left = `${index * groupWidth}%`;
                    timeSlot.appendChild(eventElement);
                }
            });
        });
    }
}

function createEventElement(event) {
    const eventDiv = document.createElement('div');
    eventDiv.className = `event ${state.activityColors[event.activity]}`;
    eventDiv.setAttribute('role', 'button');
    eventDiv.setAttribute('tabindex', '0');
    eventDiv.setAttribute('aria-label', 
        `${event.activity} from ${formatTime(event.startTime)} to ${formatTime(event.endTime)}` +
        (event.description ? `. ${event.description}` : '')
    );
    
    eventDiv.innerHTML = `
        <div class="event-title">${event.activity}</div>
        <div class="event-time">${formatTime(event.startTime)} - ${formatTime(event.endTime)}</div>
        ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
    `;
    
    // Add keyboard support for events
    eventDiv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            // TODO: Add event editing functionality
            e.preventDefault();
        }
    });
    
    return eventDiv;
}

export function updateActivitySummary() {
    const period = document.getElementById('summaryPeriod').value;
    const activityTimes = {};
    let total = 0;
    
    for (const dateKey in state.events) {
        const date = new Date(dateKey);
        if (shouldIncludeDate(date, period)) {
            state.events[dateKey].forEach(event => {
                const duration = calculateEventDuration(event);
                activityTimes[event.activity] = (activityTimes[event.activity] || 0) + duration;
                total += duration;
            });
        }
    }
    
    updateActivityList(activityTimes);
    updatePieChart(activityTimes, total);
}

function calculateEventDuration(event) {
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);
    return (endHour - startHour) * 60 + (endMinute - startMinute);
}

function updateActivityList(activityTimes) {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';
    
    Object.entries(activityTimes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([activity, minutes]) => {
            const li = document.createElement('li');
            li.className = state.activityColors[activity];
            li.textContent = `${activity}: ${formatDuration(minutes)}`;
            activityList.appendChild(li);
        });
}

function updatePieChart(activityTimes, total) {
    const pieChart = document.getElementById('timeDistribution');
    pieChart.innerHTML = '';
    
    let startAngle = 0;
    Object.entries(activityTimes).forEach(([activity, minutes]) => {
        if (minutes === 0) return;
        
        const percentage = (minutes / total) * 100;
        const angle = percentage * 3.6; // 3.6 = 360/100
        
        const slice = document.createElement('div');
        slice.className = 'pie-slice';
        slice.style.transform = `rotate(${startAngle}deg)`;
        slice.style.backgroundColor = activity === 'Sleep' ? '#90A4AE' : 
                                    activity === 'Work' ? '#4CAF50' : '#FF9800';
        
        const before = document.createElement('style');
        const uniqueClass = `slice-${Math.random().toString(36).substr(2, 9)}`;
        slice.classList.add(uniqueClass);
        
        before.textContent = `
            .${uniqueClass}::before {
                transform: rotate(${angle}deg);
            }
        `;
        
        document.head.appendChild(before);
        pieChart.appendChild(slice);
        
        startAngle += angle;
    });
}

export function updateCurrentTimeLine() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    document.querySelectorAll('.current-time').forEach(line => line.remove());
    
    const todayColumn = document.querySelector(`[data-date="${now.toDateString()}"][data-hour="${currentHour}"]`);
    if (todayColumn) {
        const line = document.createElement('div');
        line.className = 'current-time';
        line.style.top = `${currentMinute}px`;
        todayColumn.appendChild(line);
    }
}

export function updateActivityDatalist() {
    const datalist = document.getElementById('activityTypes');
    datalist.innerHTML = Array.from(state.activities)
        .map(activity => `<option value="${activity}">`)
        .join('');
} 