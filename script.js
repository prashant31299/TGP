document.addEventListener('DOMContentLoaded', () => {
    // Initialize variables
    let map, marker, watchId, recognition, isListening = false;
    const database = firebase.database();
    const EMERGENCY_SERVICES = {
        police: '100',      // Indian Police
        firefighters: '101', // Indian Fire Department
        ambulance: '102'    // Indian Ambulance
    };
    
    // Navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            showPage(pageId);
        });
    });

    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        if (pageId === 'map') initMap();
    }

    // SOS Feature
    const sosButton = document.getElementById('sosButton');
    sosButton.addEventListener('click', handleSOS);

    async function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                position => resolve(position),
                error => {
                    const messages = {
                        1: 'Please enable location services to use this feature',
                        2: 'Location information is unavailable',
                        3: 'Location request timed out'
                    };
                    reject(new Error(messages[error.code] || error.message));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }
    
    async function handleSOS() {
        sosButton.textContent = 'Sending...';
        sosButton.disabled = true;
        sosButton.style.animation = 'pulse 0.5s infinite';
        
        // Add pause button
        const pauseButton = document.createElement('button');
        pauseButton.className = 'pause-sos';
        pauseButton.innerHTML = '<i class="fas fa-pause"></i> Cancel Alert';
        pauseButton.onclick = () => {
            sosButton.textContent = 'SOS';
            sosButton.disabled = false;
            sosButton.style.animation = '';
            pauseButton.remove();
            
            // Show cancellation message
            const locationInfo = document.getElementById('location-info');
            locationInfo.style.display = 'block';
            locationInfo.innerHTML = `
                <p style="color: orange;"><i class="fas fa-exclamation-circle"></i> Alert cancelled</p>
            `;
            
            setTimeout(() => {
                locationInfo.style.display = 'none';
            }, 3000);
        };
        sosButton.parentElement.insertBefore(pauseButton, sosButton.nextSibling);

        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            const address = await getAddressFromCoordinates(latitude, longitude);
            
            const message = `Emergency Alert! I need help!\nLocation: ${address || `${latitude}, ${longitude}`}\nGoogle Maps: https://www.google.com/maps?q=${latitude},${longitude}`;
            
            // Send to emergency services via SMS
            Object.entries(EMERGENCY_SERVICES).forEach(([service, number]) => {
                window.open(`sms:${number}?body=${encodeURIComponent(message)}`, '_blank');
            });

            // Send to contacts
            const contacts = await getEmergencyContacts();
            for (const contact of contacts) {
                // WhatsApp
                window.open(`https://wa.me/${contact.phone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
                // SMS
                window.open(`sms:${contact.phone}?body=${encodeURIComponent(message)}`, '_blank');
            }
            
            // Save alert to Firebase
            await database.ref('alerts').push({
                latitude, longitude, address, timestamp: Date.now()
            });
            
            // Update UI with success message
            const locationInfo = document.getElementById('location-info');
            locationInfo.style.display = 'block';
            locationInfo.innerHTML = `
                <h3><i class="fas fa-check-circle" style="color: #4CAF50;"></i> Alert Sent!</h3>
                <p><strong>Location:</strong> ${address || `${latitude}, ${longitude}`}</p>
                <p><strong>Contacts Notified:</strong> ${contacts.length > 0 ? contacts.map(c => c.name).join(', ') : 'No contacts added'}</p>
            `;
        } catch (error) {
            const locationInfo = document.getElementById('location-info');
            locationInfo.style.display = 'block';
            locationInfo.innerHTML = `
                <p style="color: red;"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</p>
                <p>Please enable location services and try again.</p>
            `;
        }
    }

    // Map functionality
    function initMap() {
        const mapDiv = document.getElementById('google-map');
        if (!mapDiv) return;

        // Nagpur coordinates
        const nagpurCoords = { lat: 21.1458, lng: 79.0882 };
        map = new google.maps.Map(mapDiv, {
            center: nagpurCoords,
            zoom: 13,
            styles: [
                { "featureType": "poi", "elementType": "labels.text", "stylers": [{"visibility": "off"}] },
                { "featureType": "poi.business", "stylers": [{"visibility": "off"}] },
                { "featureType": "road", "elementType": "labels.icon", "stylers": [{"visibility": "off"}] },
                { "featureType": "transit", "stylers": [{"visibility": "off"}] }
            ]
        });

        // Try to get user's location
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            
            // Custom marker icon
            marker = new google.maps.Marker({
                position: { lat: latitude, lng: longitude },
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 2
                },
                title: "Your Location"
            });

            // Add accuracy circle
            new google.maps.Circle({
                map: map,
                center: { lat: latitude, lng: longitude },
                radius: position.coords.accuracy,
                fillColor: "#4285F4",
                fillOpacity: 0.15,
                strokeColor: "#4285F4",
                strokeOpacity: 0.3,
                strokeWeight: 1
            });

            // Start tracking with smooth animation
            watchId = navigator.geolocation.watchPosition((position) => {
                smoothlyAnimateMarker(marker, {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            });
            
            // Load existing safe/unsafe zones
            loadZones();
        }, () => {
            // If geolocation fails, still load zones for Nagpur
            loadZones();
        });
    }

    // Contact management
    function setupContactModal() {
        const addContactButton = document.getElementById('addContactButton');
        const contactModal = document.getElementById('contactModal');
        const closeModal = document.querySelector('.close-modal');
        
        if (addContactButton && contactModal) {
            addContactButton.addEventListener('click', () => {
                contactModal.style.display = 'block';
            });
            
            closeModal.addEventListener('click', () => {
                contactModal.style.display = 'none';
            });
            
            window.addEventListener('click', (e) => {
                if (e.target === contactModal) {
                    contactModal.style.display = 'none';
                }
            });
            
            // Save contact
            document.getElementById('saveContact').addEventListener('click', saveContact);
        }
    }
    
    function saveContact() {
        const name = document.getElementById('contactName').value;
        const phone = document.getElementById('contactPhone').value.replace(/[^0-9+]/g, '');
        
        if (!name || !phone) {
            alert('Please fill in name and phone number');
            return;
        }
    
        if (!phone.startsWith('+91')) {
            alert('Please include Indian country code (+91)');
            return;
        }

        if (phone.length !== 13) {
            alert('Please enter a valid 10-digit Indian mobile number with country code (+91)');
            return;
        }
        
        database.ref('contacts').push({
            name,
            phone,
            timestamp: Date.now()
        }).then(() => {
            // Clear form and close modal
            document.getElementById('contactName').value = '';
            document.getElementById('contactPhone').value = '';
            document.getElementById('contactModal').style.display = 'none';
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Contact saved successfully!';
            document.querySelector('.feature-section').appendChild(successMsg);
            
            setTimeout(() => successMsg.remove(), 3000);
            loadContacts();
        }).catch(error => {
            alert('Error saving contact: ' + error.message);
        });
    }

    // Load contacts
    function loadContacts() {
        const contactList = document.getElementById('contactList');
        if (!contactList) return;
        
        database.ref('contacts').on('value', (snapshot) => {
            contactList.innerHTML = '';
            
            let hasContacts = false;
            snapshot.forEach((contact) => {
                hasContacts = true;
                const data = contact.val();
                const contactItem = document.createElement('div');
                contactItem.className = 'contact-item';
                contactItem.innerHTML = `
                    <div class="contact-info">
                        <span class="contact-name"><i class="fas fa-user"></i> ${data.name}</span>
                        <span class="contact-phone"><i class="fas fa-phone"></i> ${data.phone}</span>
                    </div>
                    <div class="contact-actions">
                        <button class="delete-contact" data-id="${contact.key}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                contactList.appendChild(contactItem);
            });
            
            if (!hasContacts) {
                contactList.innerHTML = '<p class="no-contacts">No emergency contacts added yet.</p>';
            }
            
            // Add delete functionality
            document.querySelectorAll('.delete-contact').forEach(button => {
                button.addEventListener('click', () => {
                    if (confirm('Are you sure you want to delete this contact?')) {
                        database.ref(`contacts/${button.getAttribute('data-id')}`).remove();
                    }
                });
            });
        });
    }
    
    // Get emergency contacts
    async function getEmergencyContacts() {
        return new Promise((resolve) => {
            database.ref('contacts').once('value', (snapshot) => {
                const contacts = [];
                snapshot.forEach((contact) => {
                    contacts.push(contact.val());
                });
                resolve(contacts);
            });
        });
    }
    
    // Get address from coordinates
    async function getAddressFromCoordinates(latitude, longitude) {
        try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                return data.results[0].formatted_address;
            }
            return null;
        } catch (error) {
            console.error('Error getting address:', error);
            return null;
        }
    }
    
    // Helper functions for map
    function smoothlyAnimateMarker(marker, newPosition) {
        const startPosition = marker.getPosition();
        const startLat = startPosition.lat();
        const startLng = startPosition.lng();
        const endLat = newPosition.lat;
        const endLng = newPosition.lng;
        
        const frames = 100;
        let frame = 0;
        
        const animate = () => {
            if (frame >= frames) return;
            
            const progress = frame / frames;
            const lat = startLat + (endLat - startLat) * progress;
            const lng = startLng + (endLng - startLng) * progress;
            
            marker.setPosition({ lat, lng });
            
            frame++;
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    // Safe/Unsafe Zone Marking
    document.getElementById('markSafe')?.addEventListener('click', () => markZone('safe'));
    document.getElementById('markUnsafe')?.addEventListener('click', () => markZone('unsafe'));

    function markZone(type) {
        if (!map) return;
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            const address = await getAddressFromCoordinates(latitude, longitude);
            
            // Save to Firebase
            await database.ref('zones').push({
                type, latitude, longitude, address, timestamp: Date.now()
            });

            // Add to map
            const circle = new google.maps.Circle({
                map,
                center: { lat: latitude, lng: longitude },
                radius: 0,
                fillColor: type === 'safe' ? '#4CAF50' : '#f44336',
                fillOpacity: 0.3,
                strokeColor: type === 'safe' ? '#4CAF50' : '#f44336',
                strokeWeight: 2
            });
            
            // Animate the circle
            let currentRadius = 0;
            const targetRadius = 100;
            const animationStep = 5;
            
            const growCircle = () => {
                if (currentRadius >= targetRadius) return;
                currentRadius += animationStep;
                circle.setRadius(currentRadius);
                requestAnimationFrame(growCircle);
            };
            
            growCircle();
            
            // Add info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 10px;">
                        <h3 style="color: ${type === 'safe' ? '#4CAF50' : '#f44336'};">
                            ${type === 'safe' ? 'Safe Zone' : 'Unsafe Zone'}
                        </h3>
                        <p>${address || 'Marked location'}</p>
                        <p><small>${new Date().toLocaleString()}</small></p>
                    </div>
                `
            });
            
            // Create a marker for the info window
            const zoneMarker = new google.maps.Marker({
                position: { lat: latitude, lng: longitude },
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: type === 'safe' ? '#4CAF50' : '#f44336',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2
                }
            });
            
            zoneMarker.addListener('click', () => {
                infoWindow.open(map, zoneMarker);
            });
        });
    }
    
    // Load existing zones
    function loadZones() {
        if (!map) return;
        
        database.ref('zones').on('value', (snapshot) => {
            snapshot.forEach((zone) => {
                const data = zone.val();
                
                // Create circle
                new google.maps.Circle({
                    map,
                    center: { lat: data.latitude, lng: data.longitude },
                    radius: 100,
                    fillColor: data.type === 'safe' ? '#4CAF50' : '#f44336',
                    fillOpacity: 0.3,
                    strokeColor: data.type === 'safe' ? '#4CAF50' : '#f44336',
                    strokeWeight: 2
                });
                
                // Create marker
                const zoneMarker = new google.maps.Marker({
                    position: { lat: data.latitude, lng: data.longitude },
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: data.type === 'safe' ? '#4CAF50' : '#f44336',
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2
                    }
                });
                
                // Add info window
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 10px;">
                            <h3 style="color: ${data.type === 'safe' ? '#4CAF50' : '#f44336'};">
                                ${data.type === 'safe' ? 'Safe Zone' : 'Unsafe Zone'}
                            </h3>
                            <p>${data.address || 'Marked location'}</p>
                            <p><small>${new Date(data.timestamp).toLocaleString()}</small></p>
                        </div>
                    `
                });
                
                zoneMarker.addListener('click', () => {
                    infoWindow.open(map, zoneMarker);
                });
            });
        });
    }

    // Community Reports
    const reportForm = document.getElementById('submitReport');
    if (reportForm) {
        reportForm.addEventListener('click', async () => {
            const title = document.getElementById('reportTitle').value;
            const description = document.getElementById('reportDescription').value;

            if (!title || !description) {
                alert('Please fill in both title and description');
                return;
            }

            try {
                const position = await getCurrentPosition();
                const { latitude, longitude } = position.coords;
                const address = await getAddressFromCoordinates(latitude, longitude);
                
                await database.ref('reports').push({
                    title, description, latitude, longitude, address, timestamp: Date.now()
                });

                // Clear form
                document.getElementById('reportTitle').value = '';
                document.getElementById('reportDescription').value = '';
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Report submitted successfully!';
                document.querySelector('.report-form').appendChild(successMsg);
                
                setTimeout(() => successMsg.remove(), 3000);
                loadReports();
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    }

    // Load reports
    function loadReports() {
        const reportsList = document.getElementById('reportsList');
        if (!reportsList) return;
        
        database.ref('reports').on('value', (snapshot) => {
            reportsList.innerHTML = '';
            
            // Convert to array and sort by timestamp (newest first)
            const reports = [];
            snapshot.forEach((report) => {
                reports.push({
                    id: report.key,
                    ...report.val()
                });
            });
            
            reports.sort((a, b) => b.timestamp - a.timestamp);
            
            if (reports.length === 0) {
                reportsList.innerHTML = '<p class="no-reports">No reports yet. Be the first to share safety information!</p>';
                return;
            }
            
            reports.forEach((data) => {
                const reportCard = document.createElement('div');
                reportCard.className = 'report-card';
                reportCard.innerHTML = `
                    <h3>${data.title}</h3>
                    <p>${data.description}</p>
                    ${data.address ? `<p class="report-location"><i class="fas fa-map-marker-alt"></i> ${data.address}</p>` : ''}
                    <small><i class="far fa-clock"></i> ${new Date(data.timestamp).toLocaleString()}</small>
                `;
                
                // Add view on map button if location is available
                if (data.latitude && data.longitude) {
                    const viewButton = document.createElement('button');
                    viewButton.className = 'view-on-map';
                    viewButton.innerHTML = '<i class="fas fa-map"></i> View on Map';
                    viewButton.addEventListener('click', () => {
                        showPage('map');
                        setTimeout(() => {
                            map.setCenter({ lat: data.latitude, lng: data.longitude });
                            map.setZoom(17);
                            
                            // Add a temporary marker
                            const reportMarker = new google.maps.Marker({
                                position: { lat: data.latitude, lng: data.longitude },
                                map: map,
                                animation: google.maps.Animation.DROP,
                                title: data.title
                            });
                            
                            // Add info window
                            const infoWindow = new google.maps.InfoWindow({
                                content: `
                                    <div style="padding: 10px;">
                                        <h3>${data.title}</h3>
                                        <p>${data.description}</p>
                                        <small>${new Date(data.timestamp).toLocaleString()}</small>
                                    </div>
                                `
                            });
                            
                            infoWindow.open(map, reportMarker);
                        }, 300);
                    });
                    reportCard.appendChild(viewButton);
                }
                
                reportsList.appendChild(reportCard);
            });
        });
    }
    
    // Voice recognition setup
    function setupVoiceRecognition() {
        const startVoiceButton = document.getElementById('startVoiceButton');
        const voiceStatus = document.getElementById('voiceStatus');
        
        if (!startVoiceButton || !voiceStatus) return;
        
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
        
            recognition.onstart = () => {
                voiceStatus.style.display = 'block';
                voiceStatus.innerHTML = `
                    <div class="voice-indicator"></div>
                    <span>Listening for distress words...</span>
                `;
                isListening = true;
                startVoiceButton.innerHTML = '<i class="fas fa-microphone-slash"></i> Stop Voice Detection';
            };
        
            recognition.onerror = (event) => {
                voiceStatus.innerHTML = `<p style="color: red;">Error: ${event.error === 'not-allowed' ? 'Please enable microphone access' : event.error}</p>`;
            };
            
            startVoiceButton.addEventListener('click', () => {
                if (!isListening) {
                    recognition.start();
                } else {
                    recognition.stop();
                    startVoiceButton.innerHTML = '<i class="fas fa-microphone"></i> Start Voice Detection';
                    isListening = false;
                    voiceStatus.style.display = 'none';
                }
            });
        }
    }
    
    // Add CSS styles
    function addStyles() {
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .modal {
                display: none;
                position: fixed;
                z-index: 1001;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
            }
            
            .modal-content {
                background-color: white;
                margin: 15% auto;
                padding: 2rem;
                border-radius: 10px;
                width: 80%;
                max-width: 500px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                position: relative;
            }
            
            .close-modal {
                position: absolute;
                top: 10px;
                right: 15px;
                font-size: 24px;
                cursor: pointer;
            }
            
            .modal-content input {
                width: 100%;
                padding: 10px;
                margin: 10px 0;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            
            .contact-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background-color: white;
                border-radius: 5px;
                margin-bottom: 10px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            
            .contact-name {
                font-weight: bold;
                display: block;
            }
            
            .delete-contact {
                background-color: transparent;
                border: none;
                color: #f44336;
                cursor: pointer;
            }
            
            .view-on-map {
                background-color: #2196F3;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 5px;
                margin-top: 10px;
                cursor: pointer;
            }
            
            .no-reports, .no-contacts {
                color: #777;
                font-style: italic;
            }
            
            .pause-sos {
                background-color: #ff9800;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 25px;
                font-size: 16px;
                margin-top: 10px;
                cursor: pointer;
                transition: background-color 0.3s;
                display: block;
                margin: 10px auto;
            }
            
            .pause-sos:hover {
                background-color: #f57c00;
            }
            
            .success-message {
                background-color: rgba(76, 175, 80, 0.1);
                color: #4CAF50;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
                text-align: center;
                animation: fadeIn 0.3s;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            body {
                font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f7fa;
                color: #333;
                line-height: 1.6;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            
            header {
                background: linear-gradient(135deg, #2196F3, #1976D2);
                color: white;
                padding: 15px 0;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                position: sticky;
                top: 0;
                z-index: 1000;
            }
            
            .nav-links {
                display: flex;
                justify-content: center;
                gap: 20px;
                padding: 10px 0;
            }
            
            .nav-links a {
                color: white;
                text-decoration: none;
                padding: 8px 15px;
                border-radius: 20px;
                transition: all 0.3s;
                font-weight: 500;
            }
            
            .nav-links a:hover, .nav-links a.active {
                background-color: rgba(255,255,255,0.2);
                transform: translateY(-2px);
            }
            
            #sosButton {
                background: linear-gradient(135deg, #f44336, #d32f2f);
                color: white;
                border: none;
                padding: 20px 40px;
                border-radius: 30px;
                font-size: 18px;
                font-weight: bold;
                margin: 30px auto;
                display: block;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
                transition: all 0.3s;
            }
            
            #sosButton:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 20px rgba(244, 67, 54, 0.6);
            }
            
            #sosButton:active {
                transform: translateY(1px);
            }
            
            .feature-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            
            .feature-card {
                background-color: white;
                border-radius: 10px;
                padding: 25px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                transition: transform 0.3s;
            }
            
            .feature-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            }
            
            .feature-card h3 {
                color: #2196F3;
                margin-top: 0;
                font-size: 1.4rem;
            }
            
            input, textarea, button {
                font-family: inherit;
            }
            
            input, textarea {
                width: 100%;
                padding: 12px;
                margin: 8px 0;
                border: 1px solid #ddd;
                border-radius: 8px;
                transition: border-color 0.3s;
            }
            
            input:focus, textarea:focus {
                border-color: #2196F3;
                outline: none;
                box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
            }
            
            button {
                background-color: #2196F3;
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            button:hover {
                background-color: #1976D2;
            }
            
            #google-map {
                height: 500px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                margin: 20px 0;
            }
            
            .report-card {
                background-color: white;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 15px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.05);
                transition: transform 0.3s;
            }
            
            .report-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            
            .report-card h3 {
                margin-top: 0;
                color: #333;
            }
            
            .report-location {
                color: #666;
                font-style: italic;
            }
            
            /* Voice recognition styles */
            .voice-indicator {
                width: 15px;
                height: 15px;
                background-color: #f44336;
                border-radius: 50%;
                display: inline-block;
                margin-right: 10px;
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .feature-section {
                    grid-template-columns: 1fr;
                }
                
                .nav-links {
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }
                
                #sosButton {
                    padding: 15px 30px;
                    font-size: 16px;
                }
                
                .modal-content {
                    width: 95%;
                    margin: 10% auto;
                }
            }
        `;
        document.head.appendChild(modalStyle);
    }

    // Initialize the app
    function init() {
        // Set default page
        document.querySelector('.nav-links a[data-page="home"]').classList.add('active');
        document.getElementById('home').classList.add('active');
        
        // Setup contact modal
        setupContactModal();
        
        // Load contacts
        loadContacts();
        
        // Load reports
        loadReports();
        
        // Setup voice recognition
        setupVoiceRecognition();
        
        // Add styles
        addStyles();
    }
    
    // Initialize the app
    init();
});