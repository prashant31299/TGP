// Main app functionality
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Don't prevent default for emergency call link
            if (!this.classList.contains('emergency-call')) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                
                sections.forEach(section => {
                    section.classList.remove('active-section');
                });
                
                document.getElementById(targetId).classList.add('active-section');
            }
        });
    });
    
    // Add Police Emergency Call Button
    const emergencyCallBtn = document.createElement('button');
    emergencyCallBtn.id = 'police-emergency-call';
    emergencyCallBtn.className = 'police-emergency-call';
    emergencyCallBtn.innerHTML = '<i class="fas fa-phone"></i> Call Police (100)';
    emergencyCallBtn.addEventListener('click', function() {
        window.location.href = 'tel:100';
    });
    
    // Add the button to the home section
    const homeSection = document.getElementById('home');
    if (homeSection) {
        const sosContainer = homeSection.querySelector('.sos-container');
        if (sosContainer) {
            sosContainer.insertAdjacentElement('afterend', emergencyCallBtn);
        } else {
            homeSection.insertAdjacentElement('afterbegin', emergencyCallBtn);
        }
    }
    
    // SOS Button Functionality
    const sosButton = document.getElementById('sos-button');
    if (sosButton) {
        sosButton.addEventListener('click', function() {
            // Visual feedback
            this.style.backgroundColor = '#c2185b';
            
            const statusMessage = document.getElementById('status-message');
            const statusIndicator = document.getElementById('status-indicator');
            
            if (statusMessage) statusMessage.textContent = 'SOS Activated! Sending alerts...';
            if (statusIndicator) statusIndicator.className = 'danger';
            
            // Get current location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        const latitude = position.coords.latitude;
                        const longitude = position.coords.longitude;
                        
                        // Send SOS with location
                        sendSOSAlert(latitude, longitude);
                    },
                    function(error) {
                        console.error('Error getting location:', error);
                        // Send SOS without location
                        sendSOSAlert(null, null);
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            } else {
                console.error('Geolocation not supported by this browser');
                // Send SOS without location
                sendSOSAlert(null, null);
            }
            
            // Reset button after 3 seconds
            setTimeout(() => {
                sosButton.style.backgroundColor = '';
                if (statusMessage) statusMessage.textContent = 'SOS sent to emergency contacts';
            }, 3000);
        });
    }
    
    // Initialize voice detection for safety
    initVoiceDetection();
});

// Function to get emergency contacts
function getEmergencyContacts() {
    // Try to get contacts from localStorage
    try {
        const contacts = JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
        return contacts;
    } catch (e) {
        console.error('Error getting emergency contacts:', e);
        return [];
    }
}

// Function to send SOS alert
function sendSOSAlert(latitude, longitude) {
    // Get emergency contacts
    const contacts = getEmergencyContacts();
    
    // If no contacts found, use a default number or alert the user
    if (contacts.length === 0) {
        alert('No emergency contacts found. Please add emergency contacts in the Contacts section.');
        
        // Open WhatsApp with a default number (police)
        const defaultMessage = 'HELP ME! I AM IN TROUBLE!';
        sendWhatsAppMessage('911', defaultMessage, latitude, longitude);
        return;
    }
    
    // Create message
    let message = 'HELP ME! I AM IN TROUBLE!';
    
    // Send to all contacts
    contacts.forEach(contact => {
        sendWhatsAppMessage(contact.phone, message, latitude, longitude);
    });
}

// Function to send WhatsApp message
function sendWhatsAppMessage(phone, message, latitude, longitude) {
    // Format phone number (remove any non-digit characters)
    const formattedPhone = phone.replace(/\D/g, '');
    
    // Add location to message if available
    let fullMessage = message;
    
    if (latitude && longitude) {
        fullMessage += `\n\nMy current location: https://www.google.com/maps?q=${latitude},${longitude}`;
    }
    
    // Create WhatsApp URL - ensure it has the correct format
    // Note: WhatsApp requires country code in the phone number
    // If the number doesn't start with +, assume it's a local number and add country code
    let whatsappUrl;
    
    if (!formattedPhone.startsWith('+')) {
        // Assuming US country code (1) - change this if needed for your region
        whatsappUrl = `https://api.whatsapp.com/send?phone=1${formattedPhone}&text=${encodeURIComponent(fullMessage)}`;
    } else {
        whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(fullMessage)}`;
    }
    
    // Open WhatsApp in a new window
    const newWindow = window.open(whatsappUrl, '_blank');
    
    // Check if the window was blocked by a popup blocker
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        alert('WhatsApp couldn\'t be opened. Please check your popup blocker settings.');
        
        // Fallback: try to open using location.href instead
        window.location.href = whatsappUrl;
    }
}

// Initialize voice detection for safety
function initVoiceDetection() {
    if (!('webkitSpeechRecognition' in window)) {
        console.error('Voice detection not supported in this browser');
        return;
    }
    
    // Check if user has enabled voice detection in settings
    try {
        const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        // If voice detection is explicitly disabled, don't start it
        if (userSettings.voiceDetectionEnabled === false) {
            console.log('Voice detection disabled in user settings');
            return;
        }
    } catch (e) {
        console.error('Error reading user settings:', e);
    }
    
    // Create a single instance of the recognition object
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Track if we've already requested permission
    let permissionRequested = false;
    let recognitionActive = false;
    
    // Set up voice detection
    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript.toLowerCase();
        }
        
        // Check for help keywords or screams
        if (detectEmergencyInAudio(transcript)) {
            // Trigger SOS alert
            const sosButton = document.getElementById('sos-button');
            if (sosButton) {
                sosButton.click();
            } else {
                // If button not found, trigger alert directly
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        position => sendSOSAlert(position.coords.latitude, position.coords.longitude),
                        error => sendSOSAlert(null, null)
                    );
                } else {
                    sendSOSAlert(null, null);
                }
            }
            
            // Stop listening temporarily to avoid multiple triggers
            recognition.stop();
            recognitionActive = false;
            
            // Restart after 10 seconds
            setTimeout(() => {
                if (document.visibilityState === 'visible' && !permissionRequested) {
                    try {
                        recognition.start();
                        recognitionActive = true;
                    } catch (e) {
                        console.error('Failed to restart voice recognition:', e);
                    }
                }
            }, 10000);
        }
    };
    
    // Handle errors
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        recognitionActive = false;
        
        // Only try to restart for errors that aren't permission-related
        if (event.error !== 'not-allowed' && event.error !== 'service-not-allowed') {
            // Try to restart after error, but only if the page is visible
            setTimeout(() => {
                if (document.visibilityState === 'visible' && !permissionRequested) {
                    try {
                        recognition.start();
                        recognitionActive = true;
                    } catch (e) {
                        console.error('Failed to restart voice recognition after error:', e);
                    }
                }
            }, 5000);
        } else {
            // Permission denied, update UI if needed
            const micStatus = document.getElementById('mic-status');
            if (micStatus) {
                micStatus.textContent = 'Microphone permission denied';
            }
            permissionRequested = true;
            
            // Store this preference in user settings
            try {
                const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                userSettings.voiceDetectionEnabled = false;
                localStorage.setItem('userSettings', JSON.stringify(userSettings));
            } catch (e) {
                console.error('Error saving user settings:', e);
            }
        }
    };
    
    // Restart when it ends, but only if the page is visible and not manually stopped
    recognition.onend = function() {
        recognitionActive = false;
        
        // Only restart if we haven't been denied permission and the page is visible
        if (document.visibilityState === 'visible' && !permissionRequested) {
            // Add a longer delay to prevent rapid restarts
            setTimeout(() => {
                try {
                    recognition.start();
                    recognitionActive = true;
                } catch (e) {
                    console.error('Failed to restart voice recognition:', e);
                }
            }, 3000);
        }
    };
    
    // Add a button to manually enable/disable voice detection
    const enableMicButton = document.getElementById('enable-mic');
    if (enableMicButton) {
        enableMicButton.addEventListener('click', function() {
            if (recognitionActive) {
                // Stop recognition
                try {
                    recognition.stop();
                    recognitionActive = false;
                    this.textContent = 'Enable Voice Detection';
                    
                    const micStatus = document.getElementById('mic-status');
                    if (micStatus) {
                        micStatus.textContent = 'Voice detection is disabled';
                    }
                } catch (e) {
                    console.error('Error stopping voice recognition:', e);
                }
            } else {
                // Start recognition
                try {
                    recognition.start();
                    recognitionActive = true;
                    permissionRequested = false;
                    this.textContent = 'Disable Voice Detection';
                    
                    const micStatus = document.getElementById('mic-status');
                    if (micStatus) {
                        micStatus.textContent = 'Voice detection is active';
                    }
                } catch (e) {
                    console.error('Error starting voice recognition:', e);
                }
            }
        });
    }
    
    // Only start recognition if there's a manual trigger button
    // This prevents automatic microphone permission popups
    if (!enableMicButton) {
        console.log('No microphone button found, voice detection will not start automatically');
        return;
    }
}

// Detect emergency in audio
function detectEmergencyInAudio(transcript) {
    // Keywords that indicate emergency
    const emergencyKeywords = [
        'help', 'emergency', 'sos', 'danger', 'save me', 'help me',
        'in trouble', 'not safe', 'scared', 'afraid', 'stop', 'no'
    ];
    
    // Check for emergency keywords
    for (const keyword of emergencyKeywords) {
        if (transcript.includes(keyword)) {
            console.log('Emergency keyword detected:', keyword);
            return true;
        }
    }
    
    // Check for potential screams (short, loud utterances)
    // This is a simple heuristic - in a real app, you'd use audio analysis
    if (transcript.includes('ah') || transcript.includes('aah') || 
        transcript.includes('aaah') || transcript.includes('ahh') ||
        transcript.includes('aaahh') || transcript.includes('aaahhh')) {
        console.log('Potential scream detected');
        return true;
    }
    
    return false;
}