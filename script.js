let currentDate = new Date();
let selectedSlot = null;
let events = {};
let isDragging = false;
let dragStart = null;
let dragEnd = null;
let activities = new Set(['Sleep', 'Work']);
let activityColors = {
    'Sleep': 'sleep',
    'Work': 'work'
};
let colorIndex = 1;

// Preset schedules
let defaultSchedules = {
    sleep: {
        start: '23:00',
        end: '07:00'
    },
    work: {
        start: '09:00',
        end: '17:00'
    }
};

// Day-specific overrides
let scheduleOverrides = {};

// DOM Elements
const daysGrid = document.getElementById('daysGrid');
const weekDisplay = document.getElementById('weekDisplay');
const modal = document.getElementById('eventModal');
const closeBtn = document.querySelector('.close');
const eventForm = document.getElementById('eventForm');
const activityList = document.getElementById('activityList');
const totalTime = document.getElementById('totalTime');
const summaryPeriod = document.getElementById('summaryPeriod');
const activityTypes = document.getElementById('activityTypes');
const dayOverrides = document.getElementById('dayOverrides');

// Sleep schedule elements
const defaultSleepStart = document.getElementById('defaultSleepStart');
const defaultSleepEnd = document.getElementById('defaultSleepEnd');
const applySleepAll = document.getElementById('applySleepAll');

// Work schedule elements
const defaultWorkStart = document.getElementById('defaultWorkStart');
const defaultWorkEnd = document.getElementById('defaultWorkEnd');
const applyWorkAll = document.getElementById('applyWorkAll');

// Event Listeners for Presets
document.querySelectorAll('.toggle-custom').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const targetId = toggle.dataset.target;
        const customSection = document.getElementById(targetId);
        customSection.classList.toggle('visible');
    });
});

document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const container = e.target.closest('.day-checkbox');
        if (e.target.checked) {
            container.classList.add('selected');
        } else {
            container.classList.remove('selected');
        }
    });
});

// Sleep schedule event listeners
defaultSleepStart.addEventListener('change', updateDefaultSleep);
defaultSleepEnd.addEventListener('change', updateDefaultSleep);

applySleepAll.addEventListener('click', () => {
    applyPresetToAll('Sleep');
});

document.getElementById('applySleepWeekdays').addEventListener('click', () => {
    applyPresetToWeekdays('Sleep');
});

// Work schedule event listeners
defaultWorkStart.addEventListener('change', updateDefaultWork);
defaultWorkEnd.addEventListener('change', updateDefaultWork);

applyWorkAll.addEventListener('click', () => {
    applyPresetToAll('Work');
});

document.getElementById('applyWorkWeekdays').addEventListener('click', () => {
    applyPresetToWeekdays('Work');
});

function updateDefaultSleep() {
    defaultSchedules.sleep = {
        start: defaultSleepStart.value,
        end: defaultSleepEnd.value
    };
    updateCustomDayInputs('sleep', defaultSleepStart.value, defaultSleepEnd.value);
    renderCalendar();
}

function updateDefaultWork() {
    defaultSchedules.work = {
        start: defaultWorkStart.value,
        end: defaultWorkEnd.value
    };
    updateCustomDayInputs('work', defaultWorkStart.value, defaultWorkEnd.value);
    renderCalendar();
}

function updateCustomDayInputs(type, startTime, endTime) {
    document.querySelectorAll(`.day-checkbox input[data-type="${type}"]`).forEach(input => {
        const timeInputs = input.closest('.day-checkbox').querySelectorAll('input[type="time"]');
        timeInputs[0].value = startTime;
        timeInputs[1].value = endTime;
    });
}

function applyPresetToAll(type) {
    const schedule = type === 'Sleep' ? defaultSchedules.sleep : defaultSchedules.work;
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let i = 0; i < 7; i++) {
        applyScheduleToDay(new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000), type, schedule);
    }
    
    renderCalendar();
    updateActivitySummary();
}

function applyPresetToWeekdays(type) {
    const schedule = type === 'Sleep' ? defaultSchedules.sleep : defaultSchedules.work;
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
        if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
            applyScheduleToDay(date, type, schedule);
        }
    }
    
    renderCalendar();
    updateActivitySummary();
}

function applyScheduleToDay(date, type, schedule) {
    const dateKey = date.toDateString();
    
    if (!events[dateKey]) {
        events[dateKey] = [];
    }
    
    // Remove existing events of the same type
    events[dateKey] = events[dateKey].filter(event => event.activity !== type);
    
    // Add new preset event
    events[dateKey].push({
        activity: type,
        startTime: schedule.start,
        endTime: schedule.end,
        description: `Default ${type.toLowerCase()} schedule`
    });
}

// Add event listeners for custom day inputs
document.querySelectorAll('.day-checkbox input[type="time"]').forEach(input => {
    input.addEventListener('change', (e) => {
        const checkbox = e.target.closest('.day-checkbox').querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            const type = e.target.dataset.type;
            const day = parseInt(checkbox.dataset.day);
            const timeInputs = e.target.closest('.custom-time-inputs').querySelectorAll('input[type="time"]');
            const startTime = timeInputs[0].value;
            const endTime = timeInputs[1].value;
            
            applyCustomSchedule(type, day, startTime, endTime);
        }
    });
});

function applyCustomSchedule(type, day, startTime, endTime) {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const targetDate = new Date(weekStart.getTime() + day * 24 * 60 * 60 * 1000);
    
    applyScheduleToDay(targetDate, type.charAt(0).toUpperCase() + type.slice(1), {
        start: startTime,
        end: endTime
    });
    
    renderCalendar();
    updateActivitySummary();
}

// Original event listeners
document.getElementById('prevWeek').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 7);
    renderCalendar();
    updateActivitySummary();
});

document.getElementById('nextWeek').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 7);
    renderCalendar();
    updateActivitySummary();
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

summaryPeriod.addEventListener('change', updateActivitySummary);

eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const activity = document.getElementById('activityType').value;
    const startTime = document.getElementById('eventStartTime').value;
    const endTime = document.getElementById('eventEndTime').value;
    const description = document.getElementById('eventDescription').value;
    
    if (!activityColors[activity] && activity !== 'Sleep' && activity !== 'Work') {
        activityColors[activity] = `activity-color-${colorIndex}`;
        colorIndex = (colorIndex % 8) + 1;
        activities.add(activity);
        updateActivityDatalist();
    }
    
    const dateKey = selectedSlot.date.toDateString();
    if (!events[dateKey]) {
        events[dateKey] = [];
    }
    
    // Remove existing events of the same type if it's Sleep or Work
    if (activity === 'Sleep' || activity === 'Work') {
        events[dateKey] = events[dateKey].filter(event => event.activity !== activity);
    }
    
    events[dateKey].push({
        activity,
        startTime,
        endTime,
        description
    });
    
    modal.style.display = 'none';
    eventForm.reset();
    renderCalendar();
    updateActivitySummary();
});

function renderCalendar() {
    daysGrid.innerHTML = '';
    
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekDisplay.textContent = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    
    // Render day overrides
    renderDayOverrides(weekStart);
    
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        const dayColumn = createDayColumn(currentDay);
        daysGrid.appendChild(dayColumn);
    }
    
    renderEvents();
    updateCurrentTimeLine();
}

function renderDayOverrides(weekStart) {
    dayOverrides.innerHTML = '';
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateKey = date.toDateString();
        
        const dayOverride = document.createElement('div');
        dayOverride.className = 'day-override';
        dayOverride.innerHTML = `
            <h5>${getDayName(date.getDay())}</h5>
            <div class="time-preset">
                <label>Sleep:</label>
                <div class="time-inputs">
                    <input type="time" data-type="sleep" data-date="${dateKey}" value="${defaultSchedules.sleep.start}">
                    <span>to</span>
                    <input type="time" data-type="sleep" data-date="${dateKey}" value="${defaultSchedules.sleep.end}">
                </div>
            </div>
            <div class="time-preset">
                <label>Work:</label>
                <div class="time-inputs">
                    <input type="time" data-type="work" data-date="${dateKey}" value="${defaultSchedules.work.start}">
                    <span>to</span>
                    <input type="time" data-type="work" data-date="${dateKey}" value="${defaultSchedules.work.end}">
                </div>
            </div>
        `;
        
        // Add event listeners to the time inputs
        dayOverride.querySelectorAll('input[type="time"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const type = e.target.dataset.type;
                const date = e.target.dataset.date;
                const isStart = e.target.nextElementSibling !== null;
                
                if (!scheduleOverrides[date]) {
                    scheduleOverrides[date] = {
                        sleep: { ...defaultSchedules.sleep },
                        work: { ...defaultSchedules.work }
                    };
                }
                
                if (isStart) {
                    scheduleOverrides[date][type].start = e.target.value;
                } else {
                    scheduleOverrides[date][type].end = e.target.value;
                }
                
                applyOverride(date, type === 'sleep' ? 'Sleep' : 'Work');
            });
        });
        
        dayOverrides.appendChild(dayOverride);
    }
}

function applyOverride(dateKey, type) {
    if (!events[dateKey]) {
        events[dateKey] = [];
    }
    
    // Remove existing events of the same type
    events[dateKey] = events[dateKey].filter(event => event.activity !== type);
    
    // Add new event with override schedule
    const schedule = scheduleOverrides[dateKey][type.toLowerCase()];
    events[dateKey].push({
        activity: type,
        startTime: schedule.start,
        endTime: schedule.end,
        description: `Custom ${type.toLowerCase()} schedule`
    });
    
    renderCalendar();
    updateActivitySummary();
}

function createDayColumn(date) {
    const column = document.createElement('div');
    column.className = 'day-column';
    
    const header = document.createElement('div');
    header.className = 'day-header';
    if (date.toDateString() === new Date().toDateString()) {
        header.classList.add('today');
    }
    header.textContent = `${getDayName(date.getDay())} ${date.getDate()}`;
    column.appendChild(header);
    
    for (let hour = 0; hour < 24; hour++) {
        const slot = document.createElement('div');
        slot.className = 'hour-slot';
        slot.dataset.hour = hour;
        
        // Add drag event listeners
        slot.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStart = {
                date: date,
                hour: hour,
                y: e.clientY
            };
            
            // Create temporary drag element
            const dragElement = document.createElement('div');
            dragElement.className = 'event dragging';
            dragElement.style.top = `${hour * 60 + 50}px`;
            dragElement.style.height = '60px';
            column.appendChild(dragElement);
        });
        
        column.appendChild(slot);
    }
    
    return column;
}

// Add mouse move and up listeners to the document
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const currentColumn = e.target.closest('.day-column');
    if (!currentColumn) return;
    
    const dragElement = currentColumn.querySelector('.dragging');
    if (!dragElement) return;
    
    const rect = currentColumn.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor((y - 50) / 60);
    const minutes = Math.floor(((y - 50) % 60) / 15) * 15;
    
    if (hour >= 0 && hour < 24) {
        dragEnd = {
            hour: hour,
            minutes: minutes
        };
        
        const startY = (dragStart.hour * 60 + 50);
        const height = y - startY;
        
        if (height > 0) {
            dragElement.style.height = `${height}px`;
        }
    }
});

document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    
    if (dragStart && dragEnd) {
        selectedSlot = {
            date: dragStart.date,
            hour: dragStart.hour
        };
        
        const startTime = `${dragStart.hour.toString().padStart(2, '0')}:00`;
        const endTime = `${dragEnd.hour.toString().padStart(2, '0')}:${dragEnd.minutes.toString().padStart(2, '0')}`;
        
        document.getElementById('eventStartTime').value = startTime;
        document.getElementById('eventEndTime').value = endTime;
        modal.style.display = 'block';
    }
    
    // Remove temporary drag element
    document.querySelectorAll('.dragging').forEach(el => el.remove());
    dragStart = null;
    dragEnd = null;
});

function renderEvents() {
    document.querySelectorAll('.event').forEach(el => el.remove());
    
    const columns = document.querySelectorAll('.day-column');
    columns.forEach((column, index) => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - date.getDay() + index);
        const dateKey = date.toDateString();
        
        if (events[dateKey]) {
            events[dateKey].forEach(event => {
                const eventElement = createEventElement(event);
                const [startHour, startMinute] = event.startTime.split(':').map(Number);
                const [endHour, endMinute] = event.endTime.split(':').map(Number);
                
                const top = (startHour * 60 + startMinute) + 50;
                const height = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute));
                
                eventElement.style.top = `${top}px`;
                eventElement.style.height = `${height}px`;
                eventElement.classList.add(activityColors[event.activity]);
                
                column.appendChild(eventElement);
            });
        }
    });
}

function createEventElement(event) {
    const element = document.createElement('div');
    element.className = 'event';
    element.innerHTML = `
        <strong>${event.activity}</strong><br>
        ${formatTime(event.startTime)} - ${formatTime(event.endTime)}
    `;
    return element;
}

function updateActivitySummary() {
    const period = summaryPeriod.value;
    const activityTimes = {
        Sleep: 0,
        Work: 0,
        Other: 0
    };
    let totalMinutes = 0;
    
    // Calculate time for each activity
    Object.entries(events).forEach(([dateKey, dayEvents]) => {
        const eventDate = new Date(dateKey);
        
        if (shouldIncludeDate(eventDate, period)) {
            dayEvents.forEach(event => {
                const [startHour, startMinute] = event.startTime.split(':').map(Number);
                const [endHour, endMinute] = event.endTime.split(':').map(Number);
                const duration = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute));
                
                if (event.activity === 'Sleep') {
                    activityTimes.Sleep += duration;
                } else if (event.activity === 'Work') {
                    activityTimes.Work += duration;
                } else {
                    activityTimes.Other += duration;
                }
                
                totalMinutes += duration;
            });
        }
    });
    
    // Update averages
    const numDays = period === 'week' ? 7 : (period === 'month' ? 30 : Object.keys(events).length);
    document.getElementById('avgSleep').textContent = formatDuration(activityTimes.Sleep / numDays);
    document.getElementById('avgWork').textContent = formatDuration(activityTimes.Work / numDays);
    document.getElementById('avgOther').textContent = formatDuration(activityTimes.Other / numDays);
    
    // Update the activity list
    activityList.innerHTML = Object.entries(activityTimes)
        .filter(([, minutes]) => minutes > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([activity, minutes]) => `
            <div class="activity-item">
                <div class="activity-name">${activity}</div>
                <div class="activity-time">${formatDuration(minutes)}</div>
            </div>
        `).join('');
    
    // Update total time
    totalTime.textContent = formatDuration(totalMinutes);
    
    // Update pie chart
    updatePieChart(activityTimes, totalMinutes);
}

function updatePieChart(activityTimes, total) {
    const pieChart = document.getElementById('timeDistribution');
    pieChart.innerHTML = '';
    
    let startAngle = 0;
    Object.entries(activityTimes).forEach(([activity, minutes]) => {
        if (minutes === 0) return;
        
        const percentage = (minutes / total) * 100;
        const endAngle = startAngle + (percentage * 3.6); // 3.6 = 360/100
        
        const slice = document.createElement('div');
        slice.style.position = 'absolute';
        slice.style.width = '100%';
        slice.style.height = '100%';
        slice.style.clip = `rect(0, 100px, 200px, 0)`;
        slice.style.transform = `rotate(${startAngle}deg)`;
        slice.style.borderRadius = '50%';
        slice.style.background = activity === 'Sleep' ? '#90A4AE' : 
                               activity === 'Work' ? '#4CAF50' : '#FF9800';
        
        pieChart.appendChild(slice);
        startAngle = endAngle;
    });
}

function shouldIncludeDate(date, period) {
    const now = new Date();
    switch (period) {
        case 'week':
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            return date >= weekStart && date < weekEnd;
        case 'month':
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        case 'all':
            return true;
    }
}

function updateActivityDatalist() {
    activityTypes.innerHTML = Array.from(activities)
        .map(activity => `<option value="${activity}">`)
        .join('');
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function getDayName(dayIndex) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
}

// Initialize
renderCalendar();
updateActivitySummary();

// Update current time line every minute
setInterval(updateCurrentTimeLine, 60000);

function updateCurrentTimeLine() {
    // Remove existing time lines
    document.querySelectorAll('.current-time-line').forEach(el => el.remove());
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const columns = document.querySelectorAll('.day-column');
    const todayColumn = columns[currentDay];
    
    if (todayColumn) {
        const line = document.createElement('div');
        line.className = 'current-time-line';
        line.style.top = `${currentHour * 60 + currentMinute + 50}px`; // 50px offset for header
        todayColumn.appendChild(line);
    }
} 