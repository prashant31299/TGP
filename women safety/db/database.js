// Database functionality using localStorage
document.addEventListener('DOMContentLoaded', function() {
    // Initialize database if needed
    initDatabase();
});

// Initialize database with default values if empty
function initDatabase() {
    // Check if emergency contacts exist
    if (!localStorage.getItem('emergencyContacts')) {
        localStorage.setItem('emergencyContacts', JSON.stringify([]));
    }
    
    // Check if community reports exist
    if (!localStorage.getItem('communityReports')) {
        localStorage.setItem('communityReports', JSON.stringify([]));
    }
    
    // Check if location history exists
    if (!localStorage.getItem('locationHistory')) {
        localStorage.setItem('locationHistory', JSON.stringify([]));
    }
    
    // Check if user settings exist
    if (!localStorage.getItem('userSettings')) {
        const defaultSettings = {
            name: '',
            phone: '',
            trackingEnabled: false,
            autoSendSOS: false,
            voiceDetectionEnabled: true
        };
        localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
    }
}

// Get user settings
function getUserSettings() {
    return JSON.parse(localStorage.getItem('userSettings') || '{}');
}

// Update user settings
function updateUserSettings(settings) {
    localStorage.setItem('userSettings', JSON.stringify(settings));
}

// Clear all data (for testing or reset)
function clearAllData() {
    if (confirm('Are you sure you want to clear all app data? This cannot be undone.')) {
        localStorage.removeItem('emergencyContacts');
        localStorage.removeItem('communityReports');
        localStorage.removeItem('locationHistory');
        localStorage.removeItem('userSettings');
        
        // Reinitialize database
        initDatabase();
        
        alert('All data has been cleared.');
        
        // Reload page
        window.location.reload();
    }
}

// Export data as JSON (for backup)
function exportData() {
    const data = {
        emergencyContacts: JSON.parse(localStorage.getItem('emergencyContacts') || '[]'),
        communityReports: JSON.parse(localStorage.getItem('communityReports') || '[]'),
        userSettings: JSON.parse(localStorage.getItem('userSettings') || '{}')
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'safeher-backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Import data from JSON (for restore)
function importData(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        // Validate data structure
        if (data.emergencyContacts && Array.isArray(data.emergencyContacts)) {
            localStorage.setItem('emergencyContacts', JSON.stringify(data.emergencyContacts));
        }
        
        if (data.communityReports && Array.isArray(data.communityReports)) {
            localStorage.setItem('communityReports', JSON.stringify(data.communityReports));
        }
        
        if (data.userSettings && typeof data.userSettings === 'object') {
            localStorage.setItem('userSettings', JSON.stringify(data.userSettings));
        }
        
        alert('Data imported successfully.');
        
        // Reload page
        window.location.reload();
    } catch (e) {
        alert('Error importing data: ' + e.message);
    }
}

// Add a function to simulate SQL-like queries for emergency contacts
function queryContacts(criteria) {
    const contacts = JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
    
    if (!criteria) return contacts;
    
    return contacts.filter(contact => {
        for (const key in criteria) {
            if (contact[key] !== criteria[key]) {
                return false;
            }
        }
        return true;
    });
}

// Add a function to simulate SQL-like queries for community reports
function queryReports(criteria) {
    const reports = JSON.parse(localStorage.getItem('communityReports') || '[]');
    
    if (!criteria) return reports;
    
    return reports.filter(report => {
        for (const key in criteria) {
            if (report[key] !== criteria[key]) {
                return false;
            }
        }
        return true;
    });
}