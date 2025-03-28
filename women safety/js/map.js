// Map and location tracking functionality
let map;
let userMarker;
let trackingInterval;
let communityMap;
let safeMarkers = [];
let unsafeMarkers = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize maps when respective sections are shown
    document.querySelector('nav a[href="#map"]').addEventListener('click', initMap);
    document.querySelector('nav a[href="#community"]').addEventListener('click', initCommunityMap);
    
    // Tracking controls
    document.getElementById('start-tracking').addEventListener('click', startTracking);
    document.getElementById('stop-tracking').addEventListener('click', stopTracking);
    
    // Safe/unsafe marking
    document.getElementById('mark-safe').addEventListener('click', () => markLocation('safe'));
    document.getElementById('mark-unsafe').addEventListener('click', () => markLocation('unsafe'));
    
    // Community report submission
    document.getElementById('submit-report').addEventListener('click', submitCommunityReport);
    
    // Load community reports
    loadCommunityReports();
});

// Initialize the main map
function initMap() {
    if (map) return; // Map already initialized
    
    const mapContainer = document.getElementById('map-container');
    
    // Default location (will be updated with user's location)
    const defaultLocation = { lat: 20.5937, lng: 78.9629 }; // Center of India
    
    map = new google.maps.Map(mapContainer, {
        center: defaultLocation,
        zoom: 15,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });
    
    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Center map on user location
                map.setCenter(userLocation);
                
                // Add user marker
                userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: 'Your Location',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2
                    }
                });
            },
            function(error) {
                console.error('Error getting location:', error);
            }
        );
    }
}

// Initialize the community map
function initCommunityMap() {
    if (communityMap) return; // Map already initialized
    
    const mapContainer = document.getElementById('community-map');
    
    // Default location (will be updated with user's location)
    const defaultLocation = { lat: 20.5937, lng: 78.9629 }; // Center of India
    
    communityMap = new google.maps.Map(mapContainer, {
        center: defaultLocation,
        zoom: 12,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });
    
    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Center map on user location
                communityMap.setCenter(userLocation);
                
                // Load community reports onto the map
                displayCommunityReports();
            },
            function(error) {
                console.error('Error getting location:', error);
                // Load community reports anyway
                displayCommunityReports();
            }
        );
    } else {
        // Load community reports anyway
        displayCommunityReports();
    }
}

// Start location tracking
function startTracking() {
    if (trackingInterval) {
        alert('Tracking is already active');
        return;
    }
    
    if (!map || !userMarker) {
        alert('Map not initialized. Please try again.');
        return;
    }
    
    // Update user location every 10 seconds
    trackingInterval = setInterval(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Update user marker position
                    userMarker.setPosition(userLocation);
                    
                    // Center map on user location
                    map.setCenter(userLocation);
                    
                    // Save location to tracking history
                    saveLocationToHistory(userLocation);
                },
                function(error) {
                    console.error('Error getting location:', error);
                }
            );
        }
    }, 10000); // Every 10 seconds
    
    alert('Live tracking started');
}

// Stop location tracking
function stopTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
        alert('Live tracking stopped');
    } else {
        alert('Tracking is not active');
    }
}

// Mark current location as safe or unsafe
function markLocation(type) {
    if (!map) {
        alert('Map not initialized. Please try again.');
        return;
    }
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Add marker to map
                const marker = new google.maps.Marker({
                    position: location,
                    map: map,
                    title: type === 'safe' ? 'Safe Location' : 'Unsafe Location',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: type === 'safe' ? '#4CAF50' : '#F44336',
                        fillOpacity: 0.8,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 1
                    }
                });
                
                // Save to community reports
                const timestamp = new Date().toISOString();
                const report = {
                    type,
                    location,
                    timestamp,
                    details: type === 'safe' ? 'Marked as safe area' : 'Marked as unsafe area'
                };
                
                saveCommunityReport(report);
                
                alert(`Location marked as ${type}`);
            },
            function(error) {
                console.error('Error getting location:', error);
                alert('Unable to get your location. Please check your GPS settings.');
            }
        );
    } else {
        alert('Geolocation is not supported by this browser');
    }
}

// Save location to tracking history
function saveLocationToHistory(location) {
    let history = JSON.parse(localStorage.getItem('locationHistory') || '[]');
    history.push({
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 locations to avoid storage issues
    if (history.length > 100) {
        history = history.slice(history.length - 100);
    }
    
    localStorage.setItem('locationHistory', JSON.stringify(history));
}

// Submit community report
function submitCommunityReport() {
    const locationName = document.getElementById('location-name').value.trim();
    const safetyRating = document.getElementById('safety-rating').value;
    const details = document.getElementById('report-details').value.trim();
    
    if (locationName === '' || details === '') {
        alert('Please fill in all fields');
        return;
    }
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Create report object
                const report = {
                    name: locationName,
                    type: safetyRating,
                    location,
                    details,
                    timestamp: new Date().toISOString()
                };
                
                // Save report
                saveCommunityReport(report);
                
                // Clear form
                document.getElementById('location-name').value = '';
                document.getElementById('safety-rating').value = 'safe';
                document.getElementById('report-details').value = '';
                
                // Reload reports
                loadCommunityReports();
                
                // If community map is initialized, add marker
                if (communityMap) {
                    displayCommunityReports();
                }
                
                alert('Report submitted successfully');
            },
            function(error) {
                console.error('Error getting location:', error);
                alert('Unable to get your location. Please check your GPS settings.');
            }
        );
    } else {
        alert('Geolocation is not supported by this browser');
    }
}

// Save community report to local storage
function saveCommunityReport(report) {
    let reports = JSON.parse(localStorage.getItem('communityReports') || '[]');
    reports.push(report);
    localStorage.setItem('communityReports', JSON.stringify(reports));
}

// Load community reports
function loadCommunityReports() {
    const reportsList = document.getElementById('reports-list');
    const reports = JSON.parse(localStorage.getItem('communityReports') || '[]');
    
    // Clear current list
    reportsList.innerHTML = '';
    
    if (reports.length === 0) {
        reportsList.innerHTML = '<p>No community reports yet. Be the first to report!</p>';
        return;
    }
    
    // Sort reports by timestamp (newest first)
    reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Add each report to the list
    reports.forEach(report => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        
        const date = new Date(report.timestamp).toLocaleDateString();
        const time = new Date(report.timestamp).toLocaleTimeString();
        
        reportItem.innerHTML = `
            <h4>${report.name || 'Unnamed Location'}</h4>
            <span class="${report.type}-tag">${report.type.toUpperCase()}</span>
            <p>${report.details}</p>
            <small>Reported on ${date} at ${time}</small>
        `;
        
        reportsList.appendChild(reportItem);
    });
}

// Display community reports on the map
function displayCommunityReports() {
    if (!communityMap) return;
    
    const reports = JSON.parse(localStorage.getItem('communityReports') || '[]');
    
    // Clear existing markers
    safeMarkers.forEach(marker => marker.setMap(null));
    unsafeMarkers.forEach(marker => marker.setMap(null));
    safeMarkers = [];
    unsafeMarkers = [];
    
    // Add markers for each report
    reports.forEach(report => {
        if (!report.location) return;
        
        const marker = new google.maps.Marker({
            position: report.location,
            map: communityMap,
            title: report.name || (report.type === 'safe' ? 'Safe Location' : 'Unsafe Location'),
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: getColorForSafetyType(report.type),
                fillOpacity: 0.8,
                strokeColor: '#FFFFFF',
                strokeWeight: 1
            }
        });
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div>
                    <h3>${report.name || 'Unnamed Location'}</h3>
                    <p><strong>Status:</strong> ${report.type.toUpperCase()}</p>
                    <p>${report.details}</p>
                    <small>Reported on ${new Date(report.timestamp).toLocaleDateString()}</small>
                </div>
            `
        });
        
        marker.addListener('click', () => {
            infoWindow.open(communityMap, marker);
        });
        
        // Store marker reference
        if (report.type === 'safe') {
            safeMarkers.push(marker);
        } else {
            unsafeMarkers.push(marker);
        }
    });
}

// Get color based on safety type
function getColorForSafetyType(type) {
    switch (type) {
        case 'safe':
            return '#4CAF50'; // Green
        case 'caution':
            return '#FFC107'; // Yellow
        case 'unsafe':
            return '#F44336'; // Red
        default:
            return '#4CAF50';
    }
}