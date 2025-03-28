// AI Threat Detection functionality
let recognition = null;
let isListening = false;

document.addEventListener('DOMContentLoaded', function() {
    // Set up the enable microphone button
    const enableMicButton = document.getElementById('enable-mic');
    const micStatus = document.getElementById('mic-status');
    
    if (enableMicButton) {
        enableMicButton.addEventListener('click', function() {
            if (!isListening) {
                // Request microphone permission explicitly
                startVoiceRecognition();
            } else {
                stopVoiceRecognition();
            }
        });
    }
    
    // Set up text input monitoring for the community report details
    const reportDetails = document.getElementById('report-details');
    if (reportDetails) {
        reportDetails.addEventListener('input', function() {
            analyzeText(this.value);
        });
    }
});

// Start voice recognition with explicit user action
function startVoiceRecognition() {
    const micStatus = document.getElementById('mic-status');
    const enableMicButton = document.getElementById('enable-mic');
    
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        // Start recognition
        try {
            recognition.start();
            isListening = true;
            
            if (micStatus) micStatus.textContent = 'Voice detection is active';
            if (enableMicButton) enableMicButton.textContent = 'Disable Voice Detection';
            
            // Process results
            recognition.onresult = function(event) {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        transcript += event.results[i][0].transcript;
                    }
                }
                
                if (transcript.trim() !== '') {
                    analyzeText(transcript);
                }
            };
            
            // Handle errors
            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                
                if (event.error === 'not-allowed') {
                    if (micStatus) micStatus.textContent = 'Microphone permission denied';
                } else {
                    if (micStatus) micStatus.textContent = 'Voice detection error: ' + event.error;
                }
                
                isListening = false;
                if (enableMicButton) enableMicButton.textContent = 'Enable Voice Detection';
            };
            
            // Restart when it ends
            recognition.onend = function() {
                if (isListening) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error('Failed to restart speech recognition:', e);
                        isListening = false;
                        if (micStatus) micStatus.textContent = 'Voice detection stopped';
                        if (enableMicButton) enableMicButton.textContent = 'Enable Voice Detection';
                    }
                }
            };
        } catch (e) {
            console.error('Speech recognition error:', e);
            if (micStatus) micStatus.textContent = 'Could not start voice detection';
        }
    } else {
        if (micStatus) micStatus.textContent = 'Voice detection not supported in this browser';
        alert('Voice detection is not supported in your browser. Please use Chrome for this feature.');
    }
}

// Stop voice recognition
function stopVoiceRecognition() {
    const micStatus = document.getElementById('mic-status');
    const enableMicButton = document.getElementById('enable-mic');
    
    if (recognition) {
        recognition.stop();
        isListening = false;
        if (micStatus) micStatus.textContent = 'Voice detection is disabled';
        if (enableMicButton) enableMicButton.textContent = 'Enable Voice Detection';
    }
}

// Analyze text for threat indicators
function analyzeText(text) {
    if (!text || text.trim() === '') return;
    
    // Convert to lowercase for easier matching
    const lowerText = text.toLowerCase();
    
    // Define threat keywords
    const threatKeywords = [
        'help', 'emergency', 'danger', 'scared', 'afraid', 'stalking', 'following',
        'attack', 'harass', 'threat', 'threatened', 'unsafe', 'scared', 'sos',
        'call police', 'save me', 'help me', 'in trouble', 'not safe'
    ];
    
    // Check for matches
    const matches = threatKeywords.filter(keyword => lowerText.includes(keyword));
    
    // If matches found, trigger alert
    if (matches.length > 0) {
        // Calculate threat level based on number of matches
        const threatLevel = Math.min(matches.length / 3, 1); // 0 to 1
        
        // Only trigger for significant threats
        if (threatLevel > 0.3) {
            triggerThreatAlert(matches, threatLevel);
        }
    }
}

// Trigger alert when threat detected
function triggerThreatAlert(keywords, threatLevel) {
    // Update UI to show threat detected
    const statusMessage = document.getElementById('status-message');
    const statusIndicator = document.getElementById('status-indicator');
    
    if (statusMessage && statusIndicator) {
        statusMessage.textContent = 'Potential threat detected!';
        statusIndicator.className = 'danger';
        
        // Show alert dialog
        const shouldSendSOS = confirm(
            `Potential threat detected in your speech or text!\n\n` +
            `Detected keywords: ${keywords.join(', ')}\n\n` +
            `Would you like to send an SOS alert to your emergency contacts?`
        );
        
        if (shouldSendSOS) {
            // Trigger SOS button programmatically
            document.getElementById('sos-button').click();
        } else {
            // Reset status after a delay
            setTimeout(() => {
                statusMessage.textContent = 'You are safe';
                statusIndicator.className = 'safe';
            }, 5000);
        }
    }
}