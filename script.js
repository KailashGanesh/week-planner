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
        start: '22:00',
        end: '06:00'
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

document.getElementById('applySleepWeekends').addEventListener('click', () => {
    applyPresetToWeekends('Sleep');
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

document.getElementById('applyWorkWeekends').addEventListener('click', () => {
    applyPresetToWeekends('Work');
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
    
    // Clear all events of this type for the entire week first
    for (let i = 0; i < 8; i++) { // Check 8 days to handle cross-midnight events
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateKey = date.toDateString();
        
        if (!events[dateKey]) {
            events[dateKey] = [];
        }
        events[dateKey] = events[dateKey].filter(event => event.activity !== type);
    }
    
    // Handle the overflow from previous Saturday into Sunday morning
    const [startHour, startMinute] = schedule.start.split(':').map(Number);
    const [endHour, endMinute] = schedule.end.split(':').map(Number);
    
    if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
        const sundayKey = weekStart.toDateString();
        if (!events[sundayKey]) {
            events[sundayKey] = [];
        }
        // Add the midnight to end time event for Sunday morning
        events[sundayKey].push({
            activity: type,
            startTime: '00:00',
            endTime: schedule.end,
            description: `${type.toLowerCase()} schedule`
        });
    }
    
    // Now apply the schedule to each day
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        
        // For events that cross midnight
        const dateKey = date.toDateString();
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        const nextDateKey = nextDate.toDateString();
        
        if (!events[dateKey]) {
            events[dateKey] = [];
        }
        
        if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
            // Event crosses midnight
            // Add event for current day (from start time to midnight)
            events[dateKey].push({
                activity: type,
                startTime: schedule.start,
                endTime: '24:00',
                description: `${type.toLowerCase()} schedule`
            });
            
            // Add event for next day (from midnight to end time)
            if (!events[nextDateKey]) {
                events[nextDateKey] = [];
            }
            events[nextDateKey].push({
                activity: type,
                startTime: '00:00',
                endTime: schedule.end,
                description: `${type.toLowerCase()} schedule`
            });
        } else {
            // Regular event within same day
            events[dateKey].push({
                activity: type,
                startTime: schedule.start,
                endTime: schedule.end,
                description: `${type.toLowerCase()} schedule`
            });
        }
    }
    
    // Handle the case for events crossing into the next Sunday
    const lastDay = new Date(weekStart);
    lastDay.setDate(weekStart.getDate() + 6); // Saturday
    
    if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
        const nextSunday = new Date(lastDay);
        nextSunday.setDate(lastDay.getDate() + 1);
        const nextSundayKey = nextSunday.toDateString();
        
        if (!events[nextSundayKey]) {
            events[nextSundayKey] = [];
        }
        
        // Add the midnight to end time event for next Sunday
        events[nextSundayKey].push({
            activity: type,
            startTime: '00:00',
            endTime: schedule.end,
            description: `${type.toLowerCase()} schedule`
        });
    }
    
    renderCalendar();
    updateActivitySummary();
    saveToLocalStorage();
}

function applyPresetToWeekdays(type) {
    const schedule = type === 'Sleep' ? defaultSchedules.sleep : defaultSchedules.work;
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    // Clear all events of this type for the entire week first
    for (let i = 0; i < 8; i++) { // Check 8 days to handle cross-midnight events
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateKey = date.toDateString();
        
        if (!events[dateKey]) {
            events[dateKey] = [];
        }
        events[dateKey] = events[dateKey].filter(event => event.activity !== type);
    }
    
    // Now apply the schedule to weekdays (and Sundays for Sleep)
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dayOfWeek = date.getDay();
        
        // For Sleep: Apply to all days except Saturday
        // For Work: Apply to Monday through Friday only
        if ((type === 'Sleep' && dayOfWeek !== 6) || (type === 'Work' && dayOfWeek > 0 && dayOfWeek < 6)) {
            const [startHour, startMinute] = schedule.start.split(':').map(Number);
            const [endHour, endMinute] = schedule.end.split(':').map(Number);
            
            const dateKey = date.toDateString();
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);
            const nextDateKey = nextDate.toDateString();
            
            if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
                // Event crosses midnight
                events[dateKey].push({
                    activity: type,
                    startTime: schedule.start,
                    endTime: '24:00',
                    description: `${type.toLowerCase()} schedule`
                });
                
                if (!events[nextDateKey]) {
                    events[nextDateKey] = [];
                }
                events[nextDateKey].push({
                    activity: type,
                    startTime: '00:00',
                    endTime: schedule.end,
                    description: `${type.toLowerCase()} schedule`
                });
            } else {
                events[dateKey].push({
                    activity: type,
                    startTime: schedule.start,
                    endTime: schedule.end,
                    description: `${type.toLowerCase()} schedule`
                });
            }
        }
    }
    
    renderCalendar();
    updateActivitySummary();
    saveToLocalStorage();
}

function applyPresetToWeekends(type) {
    const schedule = type === 'Sleep' ? defaultSchedules.sleep : defaultSchedules.work;
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    // Clear all events of this type for the entire week first
    for (let i = 0; i < 8; i++) { // Check 8 days to handle cross-midnight events
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateKey = date.toDateString();
        
        if (!events[dateKey]) {
            events[dateKey] = [];
        }
        events[dateKey] = events[dateKey].filter(event => event.activity !== type);
    }
    
    // Now apply the schedule to weekends
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        
        if (date.getDay() === 0 || date.getDay() === 6) { // Only weekends
            const [startHour, startMinute] = schedule.start.split(':').map(Number);
            const [endHour, endMinute] = schedule.end.split(':').map(Number);
            
            const dateKey = date.toDateString();
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);
            const nextDateKey = nextDate.toDateString();
            
            if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
                // Event crosses midnight
                events[dateKey].push({
                    activity: type,
                    startTime: schedule.start,
                    endTime: '24:00',
                    description: `${type.toLowerCase()} schedule`
                });
                
                if (!events[nextDateKey]) {
                    events[nextDateKey] = [];
                }
                events[nextDateKey].push({
                    activity: type,
                    startTime: '00:00',
                    endTime: schedule.end,
                    description: `${type.toLowerCase()} schedule`
                });
            } else {
                events[dateKey].push({
                    activity: type,
                    startTime: schedule.start,
                    endTime: schedule.end,
                    description: `${type.toLowerCase()} schedule`
                });
            }
        }
    }
    
    renderCalendar();
    updateActivitySummary();
    saveToLocalStorage();
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

// At the top of the file, add these variables
const eventSubmitBtn = document.getElementById('eventSubmit');
const deleteEventBtn = document.getElementById('deleteEventBtn');

// Update the modal buttons
document.getElementById('eventModal').querySelector('.modal-content').innerHTML = `
    <span class="close">&times;</span>
    <h3 id="modalTitle">Add Activity</h3>
    <form id="eventForm">
        <div class="form-group">
            <label for="activityType">Activity Type</label>
            <input type="text" id="activityType" list="activityTypes" placeholder="Type or select activity" required>
            <datalist id="activityTypes">
                <!-- Will be populated with existing activities -->
            </datalist>
        </div>
        <div class="form-group">
            <label>Time</label>
            <div class="time-inputs">
                <input type="time" id="eventStartTime" required>
                <span>to</span>
                <input type="time" id="eventEndTime" required>
            </div>
        </div>
        <div class="form-group">
            <label for="eventDescription">Notes (optional)</label>
            <textarea id="eventDescription" placeholder="Add any additional notes"></textarea>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="repeatEvent"> Repeat this event
            </label>
            <div id="repeatOptions" style="display: none; margin-top: 10px;">
                <select id="repeatFrequency">
                    <option value="daily">Every Day</option>
                    <option value="weekdays">Weekdays (Mon-Fri)</option>
                    <option value="weekends">Weekends (Sat-Sun)</option>
                    <option value="weekly">Every Week</option>
                    <option value="monthly">Every Month</option>
                </select>
            </div>
        </div>
        <div class="button-group">
            <button type="submit" id="eventSubmit">Add Event</button>
        </div>
    </form>
    <div class="button-group delete-buttons" id="deleteButtons" style="display: none;">
        <button id="deleteEventBtn" style="background-color: #ff4444; color: white;">Delete This Event</button>
        <button id="deleteSeriesBtn" style="background-color: #ff4444; color: white;">Delete All Repeating Events</button>
    </div>
`;

// Add styles for the modal and buttons
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .modal-content {
            background-color: white;
            margin: 5% auto;
            padding: 25px;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            position: relative;
            max-height: 90vh;
            overflow-y: auto;
        }

        .button-group {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .button-group button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .button-group button:hover {
            opacity: 0.9;
        }
        
        #eventSubmit {
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
        }
        
        .delete-buttons {
            border-top: 1px solid #eee;
            padding-top: 15px;
            margin-top: 15px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        }

        .time-inputs {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .time-inputs input {
            flex: 1;
        }

        #eventForm input,
        #eventForm select,
        #eventForm textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        #eventForm textarea {
            min-height: 80px;
            resize: vertical;
        }

        #repeatOptions {
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #eee;
            border-radius: 4px;
            background-color: #f9f9f9;
        }
    </style>
`);

// Re-attach event listeners after updating modal content
document.getElementById('repeatEvent').addEventListener('change', function() {
    document.getElementById('repeatOptions').style.display = this.checked ? 'block' : 'none';
});

// Add back the event form submission handler
document.getElementById('eventForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const activity = document.getElementById('activityType').value;
    const startTime = document.getElementById('eventStartTime').value;
    const endTime = document.getElementById('eventEndTime').value;
    const description = document.getElementById('eventDescription').value;
    const repeatEnabled = document.getElementById('repeatEvent').checked;
    const repeatFrequency = document.getElementById('repeatFrequency').value;
    
    if (!activityColors[activity] && activity !== 'Sleep' && activity !== 'Work') {
        activityColors[activity] = `activity-color-${colorIndex}`;
        colorIndex = (colorIndex % 8) + 1;
        activities.add(activity);
        updateActivityDatalist();
    }
    
    // Function to add event to a specific date
    const addEventToDate = (date) => {
        const dateKey = date.toDateString();
        if (!events[dateKey]) {
            events[dateKey] = [];
        }
        
        // Remove existing events of the same type if it's Sleep or Work
        if (activity === 'Sleep' || activity === 'Work') {
            events[dateKey] = events[dateKey].filter(event => event.activity !== activity);
        }
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        // Generate a unique ID for this event series
        const eventSeriesId = repeatEnabled ? Date.now().toString() : null;
        
        if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
            // Event crosses midnight
            events[dateKey].push({
                activity,
                startTime,
                endTime: '24:00',
                description,
                eventSeriesId,
                repeatFrequency: repeatEnabled ? repeatFrequency : null
            });
            
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);
            const nextDateKey = nextDate.toDateString();
            
            if (!events[nextDateKey]) {
                events[nextDateKey] = [];
            }
            
            events[nextDateKey].push({
                activity,
                startTime: '00:00',
                endTime,
                description,
                eventSeriesId,
                repeatFrequency: repeatEnabled ? repeatFrequency : null
            });
        } else {
            // Regular event within same day
            events[dateKey].push({
                activity,
                startTime,
                endTime,
                description,
                eventSeriesId,
                repeatFrequency: repeatEnabled ? repeatFrequency : null
            });
        }
    };
    
    if (repeatEnabled) {
        const startDate = new Date(selectedSlot.date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30); // Repeat for 30 days by default
        
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            switch (repeatFrequency) {
                case 'daily':
                    addEventToDate(currentDate);
                    break;
                case 'weekdays':
                    if (isWeekday) {
                        addEventToDate(currentDate);
                    }
                    break;
                case 'weekends':
                    if (isWeekend) {
                        addEventToDate(currentDate);
                    }
                    break;
                case 'weekly':
                    if (dayOfWeek === startDate.getDay()) {
                        addEventToDate(currentDate);
                    }
                    break;
                case 'monthly':
                    if (currentDate.getDate() === startDate.getDate()) {
                        addEventToDate(currentDate);
                    }
                    break;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    } else {
        addEventToDate(selectedSlot.date);
    }
    
    modal.style.display = 'none';
    resetForm();
    renderCalendar();
    updateActivitySummary();
    saveToLocalStorage();
});

document.getElementById('deleteEventBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to delete this event?')) {
        deleteEvent(false);
    }
});

document.getElementById('deleteSeriesBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to delete all instances of this repeating event?')) {
        deleteEvent(true);
    }
});

document.querySelector('.close').addEventListener('click', () => {
    modal.style.display = 'none';
    resetForm();
});

function renderCalendar() {
    daysGrid.innerHTML = '';
    
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekDisplay.textContent = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    
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
        
        // Check for events that end on this day (crossed from previous day)
        const prevDate = new Date(date);
        prevDate.setDate(date.getDate() - 1);
        const prevDateKey = prevDate.toDateString();
        
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
        ${event.repeatFrequency ? `<br><small>(${formatRepeatFrequency(event.repeatFrequency)})</small>` : ''}
    `;
    
    // Add click handler for editing
    element.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering new event creation
        
        // Find the date of this event by traversing up to the day-column
        const column = element.closest('.day-column');
        const columnIndex = Array.from(column.parentElement.children).indexOf(column);
        const date = new Date(currentDate);
        date.setDate(date.getDate() - date.getDay() + columnIndex);
        
        selectedSlot = {
            date: date,
            existingEvent: event
        };
        
        // Update modal title
        document.getElementById('modalTitle').textContent = 'Edit Activity';
        
        // Show edit modal
        document.getElementById('activityType').value = event.activity;
        document.getElementById('eventStartTime').value = event.startTime;
        document.getElementById('eventEndTime').value = event.endTime;
        document.getElementById('eventDescription').value = event.description || '';
        
        // Show delete buttons
        const deleteButtons = document.getElementById('deleteButtons');
        deleteButtons.style.display = 'flex';
        
        // Show/hide series delete button based on whether it's a repeating event
        document.getElementById('deleteSeriesBtn').style.display = event.eventSeriesId ? 'block' : 'none';
        
        // Update submit button text
        document.getElementById('eventSubmit').textContent = 'Update Event';
        
        modal.style.display = 'block';
    });
    
    return element;
}

let pieChart = null; // Store chart instance

function updatePieChart(activityTimes, totalMinutes) {
    const ctx = document.getElementById('timeDistribution').getContext('2d');
    
    // Calculate total minutes in a week (7 days * 24 hours * 60 minutes)
    const totalWeekMinutes = 7 * 24 * 60;
    
    // Calculate unaccounted time
    const unaccountedMinutes = totalWeekMinutes - totalMinutes;
    
    // Add unaccounted time to the data
    const data = {
        labels: [...Object.keys(activityTimes), 'Unaccounted'],
        datasets: [{
            data: [...Object.values(activityTimes), unaccountedMinutes],
            backgroundColor: [
                ...Object.keys(activityTimes).map(activity => {
                    if (activity === 'Sleep') return '#90A4AE';
                    if (activity === 'Work') return '#4CAF50';
                    return `#${Math.floor(Math.random()*16777215).toString(16)}`;
                }),
                '#E0E0E0' // Gray color for unaccounted time
            ],
            borderWidth: 1
        }]
    };

    // Destroy existing chart if it exists
    if (pieChart) {
        pieChart.destroy();
    }

    // Create new chart
    pieChart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const hours = Math.floor(value / 60);
                            const minutes = value % 60;
                            const percentage = ((value / totalWeekMinutes) * 100).toFixed(1);
                            return `${hours}h ${minutes}m (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateActivitySummary() {
    const activityTimes = {};
    let totalMinutes = 0;
    
    // Initialize activity times for all activities
    activities.forEach(activity => {
        activityTimes[activity] = 0;
    });
    
    // Calculate time for each activity
    Object.entries(events).forEach(([dateKey, dayEvents]) => {
        const eventDate = new Date(dateKey);
        
        if (shouldIncludeDate(eventDate, 'week')) {
            dayEvents.forEach(event => {
                const [startHour, startMinute] = event.startTime.split(':').map(Number);
                const [endHour, endMinute] = event.endTime.split(':').map(Number);
                const duration = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute));
                
                if (!activityTimes[event.activity]) {
                    activityTimes[event.activity] = 0;
                }
                activityTimes[event.activity] += duration;
                totalMinutes += duration;
            });
        }
    });
    
    // Update the activity list with weekly totals
    activityList.innerHTML = Object.entries(activityTimes)
        .filter(([, minutes]) => minutes > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([activity, minutes]) => `
            <div class="activity-item">
                <div class="activity-name">${activity}</div>
                <div class="activity-time">${formatDuration(minutes)} per week</div>
            </div>
        `).join('');
    
    // Update total time
    totalTime.textContent = formatDuration(totalMinutes);
    
    // Update pie chart
    updatePieChart(activityTimes, totalMinutes);
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

// Update the resetForm function
function resetForm() {
    eventForm.reset();
    document.getElementById('modalTitle').textContent = 'Add Activity';
    document.getElementById('deleteButtons').style.display = 'none';
    document.getElementById('eventSubmit').textContent = 'Add Event';
    document.getElementById('repeatOptions').style.display = 'none';
    document.getElementById('repeatFrequency').value = 'daily';
    selectedSlot.existingEvent = null;
}

// Update the delete event handler
function deleteEvent(deleteAll = false) {
    if (!selectedSlot || !selectedSlot.existingEvent) return;
    
    const event = selectedSlot.existingEvent;
    
    if (deleteAll && event.eventSeriesId) {
        // Delete all events in the series
        Object.keys(events).forEach(dateKey => {
            events[dateKey] = events[dateKey].filter(e => e.eventSeriesId !== event.eventSeriesId);
        });
    } else {
        // Delete single event
        const dateKey = selectedSlot.date.toDateString();
        events[dateKey] = events[dateKey].filter(e => e !== event);
        
        // If it's a cross-midnight event, also remove from next day
        const [startHour, startMinute] = event.startTime.split(':').map(Number);
        const [endHour, endMinute] = event.endTime.split(':').map(Number);
        
        if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
            const nextDate = new Date(selectedSlot.date);
            nextDate.setDate(selectedSlot.date.getDate() + 1);
            const nextDateKey = nextDate.toDateString();
            
            if (events[nextDateKey]) {
                events[nextDateKey] = events[nextDateKey].filter(e =>
                    !(e.eventSeriesId === event.eventSeriesId &&
                      e.startTime === '00:00' &&
                      e.endTime === event.endTime)
                );
            }
        }
    }
    
    modal.style.display = 'none';
    eventForm.reset();
    if (deleteEventBtn) deleteEventBtn.style.display = 'none';
    if (deleteSeriesBtn) deleteSeriesBtn.style.display = 'none';
    if (eventSubmitBtn) eventSubmitBtn.textContent = 'Add Event';
    selectedSlot.existingEvent = null;
    renderCalendar();
    updateActivitySummary();
    saveToLocalStorage();
}

// Add styles for the button group
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .button-group {
            display: flex;
            gap: 10px;
        }
        
        .button-group button {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .button-group button:hover {
            opacity: 0.9;
        }
    </style>
`);

// Add these functions at the top of the file after the variable declarations
function saveToLocalStorage() {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
    localStorage.setItem('calendarActivities', JSON.stringify(Array.from(activities)));
    localStorage.setItem('calendarActivityColors', JSON.stringify(activityColors));
}

function loadFromLocalStorage() {
    const savedEvents = localStorage.getItem('calendarEvents');
    const savedActivities = localStorage.getItem('calendarActivities');
    const savedActivityColors = localStorage.getItem('calendarActivityColors');
    
    if (savedEvents) {
        events = JSON.parse(savedEvents);
    }
    if (savedActivities) {
        activities = new Set(JSON.parse(savedActivities));
    }
    if (savedActivityColors) {
        activityColors = JSON.parse(savedActivityColors);
    }
    
    renderCalendar();
    updateActivitySummary();
    updateActivityDatalist();
}

function clearStorage() {
    if (confirm('Are you sure you want to clear all calendar data? This cannot be undone.')) {
        localStorage.removeItem('calendarEvents');
        localStorage.removeItem('calendarActivities');
        localStorage.removeItem('calendarActivityColors');
        events = {};
        activities = new Set(['Sleep', 'Work']);
        activityColors = {
            'Sleep': 'sleep',
            'Work': 'work'
        };
        colorIndex = 1;
        renderCalendar();
        updateActivitySummary();
        updateActivityDatalist();
    }
}

// Add the clear button to the page
function addClearButton() {
    // First, try to find the controls container
    let controlsContainer = document.querySelector('.controls');
    
    // If it doesn't exist, create it
    if (!controlsContainer) {
        controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls';
        // Add it near the week display
        const weekDisplayContainer = document.getElementById('weekDisplay').parentElement;
        weekDisplayContainer.appendChild(controlsContainer);
    }
    
    // Create the clear button
    const clearButton = document.createElement('button');
    clearButton.id = 'clearStorageBtn';
    clearButton.textContent = 'Clear Calendar';
    clearButton.style.backgroundColor = '#ff4444';
    clearButton.style.color = 'white';
    clearButton.style.marginLeft = '10px';
    
    // Add click handler
    clearButton.addEventListener('click', clearStorage);
    
    // Add the button to the controls
    controlsContainer.appendChild(clearButton);
}

// Initialize storage and UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    addClearButton();
});

// Add styles for repeat options
document.head.insertAdjacentHTML('beforeend', `
    <style>
        #repeatOptions select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        
        #repeatEvent {
            margin-right: 8px;
        }
    </style>
`);

// Add helper function to format repeat frequency
function formatRepeatFrequency(frequency) {
    switch (frequency) {
        case 'daily': return 'Repeats daily';
        case 'weekdays': return 'Repeats on weekdays';
        case 'weekends': return 'Repeats on weekends';
        case 'weekly': return 'Repeats weekly';
        case 'monthly': return 'Repeats monthly';
        default: return '';
    }
}

// Add styles for the button group
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .button-group {
            display: flex;
            gap: 10px;
        }
        
        .button-group button {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .button-group button:hover {
            opacity: 0.9;
        }
    </style>
`); 