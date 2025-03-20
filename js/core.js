// State management
export const state = {
    currentDate: new Date(),
    events: {},
    activities: new Set(['Sleep', 'Work']),
    activityColors: {
        'Sleep': 'sleep',
        'Work': 'work'
    },
    colorIndex: 1,
    selectedSlot: null,
    isDragging: false,
    dragStart: null,
    dragEnd: null,
    scheduleOverrides: {}
};

// Default schedules
export const defaultSchedules = {
    sleep: {
        start: '23:00',
        end: '07:00'
    },
    work: {
        start: '09:00',
        end: '17:00'
    }
};

// Save state to localStorage
function saveState() {
    const saveableState = {
        ...state,
        activities: Array.from(state.activities),
        currentDate: state.currentDate.toISOString()
    };
    localStorage.setItem('calendarState', JSON.stringify(saveableState));
}

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('calendarState');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        state.events = parsed.events || {};
        state.activities = new Set(parsed.activities || ['Sleep', 'Work']);
        state.activityColors = parsed.activityColors || {
            'Sleep': 'sleep',
            'Work': 'work'
        };
        state.currentDate = new Date(parsed.currentDate);
        state.scheduleOverrides = parsed.scheduleOverrides || {};
    }
}

// Initialize the application
export function initializeApp(renderCalendar, updateActivitySummary, updateCurrentTimeLine) {
    // Load saved state
    loadState();
    
    // Initial render
    renderCalendar();
    updateActivitySummary();
    
    // Update current time line every minute
    setInterval(updateCurrentTimeLine, 60000);
    
    // Save state when window closes
    window.addEventListener('beforeunload', saveState);
} 