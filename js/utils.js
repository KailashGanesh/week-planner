// Time and date formatting utilities
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
    });
}

function getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
}

function shouldIncludeDate(date, period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    switch (period) {
        case 'day':
            return date.getTime() === today.getTime();
        case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return date >= weekStart && date <= weekEnd;
        case 'month':
            return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        default:
            return true;
    }
}

// Get user's time zone
export const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Format date with time zone consideration
export function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: userTimeZone
    }).format(date);
}

// Format time with time zone consideration
export function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: userTimeZone
    }).format(date);
}

// Get day name
export function getDayName(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        timeZone: userTimeZone
    }).format(date);
}

// Convert local time to UTC
export function toUTC(date, timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const localDate = new Date(date);
    localDate.setHours(hours, minutes, 0, 0);
    return localDate.toISOString();
}

// Convert UTC to local time
export function fromUTC(utcStr) {
    const date = new Date(utcStr);
    return {
        date: new Date(date.setHours(0, 0, 0, 0)),
        time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    };
}

// Check if date should be included in summary period
export function shouldIncludeDate(date, period) {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    switch (period) {
        case 'day':
            return date.toDateString() === startOfDay.toDateString();
        case 'week':
            return date >= startOfWeek && date < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'month':
            return date >= startOfMonth && date < new Date(now.getFullYear(), now.getMonth() + 1, 1);
        default:
            return true;
    }
}

// Export utilities
export {
    formatDuration,
    formatDate,
    formatTime,
    getDayName,
    shouldIncludeDate
}; 