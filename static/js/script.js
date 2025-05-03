document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsSection = document.getElementById('results-section');
    const uploadedImage = document.getElementById('uploaded-image');
    const originalCaption = document.getElementById('original-caption');
    const improvedCaption = document.getElementById('improved-caption');
    const captionAudio = document.getElementById('caption-audio');
    const playAudioBtn = document.getElementById('play-audio');
    const downloadAudioBtn = document.getElementById('download-audio');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const enhanceToggle = document.getElementById('enhance-toggle');
    const captionTabs = document.querySelectorAll('.caption-tab');
    const noApiNotice = document.getElementById('no-api-notice');

    // Accessibility enhancement - add keyboard support for drop area
    dropArea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });

    // Theme toggle functionality
    themeToggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            themeToggleBtn.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i><span class="sr-only">Switch to light mode</span>';
            themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
        } else {
            themeToggleBtn.innerHTML = '<i class="fas fa-moon" aria-hidden="true"></i><span class="sr-only">Switch to dark mode</span>';
            themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
        }
        
        // Save theme preference
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        
        // Announce theme change for screen readers
        announceForScreenReader(`Theme changed to ${isDarkMode ? 'dark' : 'light'} mode`);
    });

    // Apply saved theme
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        document.body.classList.add('dark-mode');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i><span class="sr-only">Switch to light mode</span>';
        themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
    }

    // Download audio functionality
    downloadAudioBtn.addEventListener('click', function() {
        if (captionAudio.src) {
            const link = document.createElement('a');
            link.href = captionAudio.src;
            link.download = 'image_description.mp3';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('Audio file downloading', 'success');
        }
    });

    // Caption tabs functionality with accessibility
    captionTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and contents
            captionTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.caption-content p').forEach(p => p.classList.remove('active'));
            
            // Add active class to current tab and content
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            const targetContent = document.getElementById(this.dataset.target);
            targetContent.classList.add('active');
            
            // Announce tab change for screen readers
            announceForScreenReader(`Switched to ${this.textContent} description`);
        });
        
        // Add keyboard support for tabs
        tab.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    // File drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('dragover');
    }

    function unhighlight() {
        dropArea.classList.remove('dragover');
    }

    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (!file.type.match('image.*')) {
                showNotification('Please select an image file', 'error');
                announceForScreenReader('Error: Please select an image file');
                return;
            }
            
            // Show loading and hide results
            loadingIndicator.style.display = 'flex';
            resultsSection.style.display = 'none';
            noApiNotice.style.display = 'none';
            
            // Announce for screen readers
            announceForScreenReader('Analyzing your image. Please wait.');
            
            // Create FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('enhance', enhanceToggle.checked);
            
            // Upload the file
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display results
                    uploadedImage.src = data.imageUrl;
                    uploadedImage.alt = 'Uploaded image: ' + data.caption;
                    originalCaption.textContent = data.caption;
                    improvedCaption.textContent = data.improvedCaption;
                    captionAudio.src = data.audioUrl;
                    
                    // Show API notice if needed
                    if (enhanceToggle.checked && !data.geminiSuccess) {
                        noApiNotice.style.display = 'block';
                    }
                    
                    // Ensure "Basic" tab is active by default
                    captionTabs.forEach(tab => {
                        tab.classList.remove('active');
                        tab.setAttribute('aria-selected', 'false');
                    });
                    document.querySelectorAll('.caption-content p').forEach(p => p.classList.remove('active'));
                    document.querySelector('[data-target="original-caption"]').classList.add('active');
                    document.querySelector('[data-target="original-caption"]').setAttribute('aria-selected', 'true');
                    originalCaption.classList.add('active');
                    
                    // Show results and hide loading
                    loadingIndicator.style.display = 'none';
                    resultsSection.style.display = 'block';
                    
                    // Announce for screen readers
                    announceForScreenReader('Image analyzed successfully. Description is now available.');
                } else {
                    loadingIndicator.style.display = 'none';
                    showNotification(data.error || 'An error occurred', 'error');
                    announceForScreenReader('Error: ' + (data.error || 'An error occurred processing your image'));
                }
            })
            .catch(error => {
                loadingIndicator.style.display = 'none';
                showNotification('Network error occurred', 'error');
                announceForScreenReader('Error: Network connection problem');
                console.error('Error:', error);
            });
        }
    }

    // Audio control
    playAudioBtn.addEventListener('click', function() {
        if (captionAudio.paused) {
            captionAudio.play();
            this.innerHTML = '<i class="fas fa-pause" aria-hidden="true"></i> Pause Description';
            this.setAttribute('aria-label', 'Pause audio description');
        } else {
            captionAudio.pause();
            this.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i> Play Description';
            this.setAttribute('aria-label', 'Play audio description');
        }
    });

    captionAudio.addEventListener('ended', function() {
        playAudioBtn.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i> Play Description';
        playAudioBtn.setAttribute('aria-label', 'Play audio description');
        announceForScreenReader('Audio description finished');
    });

    // Function to announce content for screen readers
    function announceForScreenReader(message) {
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'assertive');
        announcer.setAttribute('class', 'sr-only');
        announcer.textContent = message;
        document.body.appendChild(announcer);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcer);
        }, 3000);
    }

    // Notification system
    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        
        // Append to body
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
    // Add this to the DOMContentLoaded event listener in script.js

    // Chatbot elements
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input-field');
    const chatbotSend = document.getElementById('chatbot-send');

    // Predefined questions and answers
    const predefinedAnswers = {
        "who made you": "I was created by Ankit, a second year student of Machine Learning from Lovely Professional University.",
        "who created you": "I was created by Ankit, a second year student of Machine Learning from Lovely Professional University.",
        "what does this web app do": "This is a caption generator with voice modulation for visually impaired users. You can upload an image to get a detailed description and listen to it as audio.",
        "how does this work": "Simply upload an image, and our AI will generate a description. You can choose between basic or enhanced captions, and listen to the audio version.",
        "what can i do here": "You can upload images to get detailed descriptions, listen to audio versions of those descriptions, and download the audio files.",
        "help": "You can ask me about the app, its creator, or how to use it. Try questions like 'What does this app do?' or 'Who made you?'"
    };

    // Toggle chatbot window
    chatbotToggle.addEventListener('click', function() {
        chatbotWindow.classList.toggle('open');
        if (chatbotWindow.classList.contains('open')) {
            chatbotToggle.setAttribute('aria-label', 'Close chatbot');
            chatbotInput.focus();
        } else {
            chatbotToggle.setAttribute('aria-label', 'Open chatbot');
        }
    });

    chatbotClose.addEventListener('click', function() {
        chatbotWindow.classList.remove('open');
        chatbotToggle.setAttribute('aria-label', 'Open chatbot');
    });

    // Send message function
    function sendMessage() {
        const message = chatbotInput.value.trim();
        if (message) {
            addMessage(message, 'user');
            chatbotInput.value = '';
            
            // Check for predefined answers first
            const lowerMessage = message.toLowerCase();
            if (predefinedAnswers[lowerMessage]) {
                setTimeout(() => {
                    addMessage(predefinedAnswers[lowerMessage], 'bot');
                }, 500);
            } else {
                // For other questions, use Gemini API if available
                setTimeout(() => {
                    fetch('/ask-gemini', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ question: message })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            addMessage(data.answer, 'bot');
                        } else {
                            addMessage("I'm sorry, I couldn't process your question. Please try asking something else.", 'bot');
                        }
                    })
                    .catch(() => {
                        addMessage("I'm having trouble connecting to the AI service. Please try again later.", 'bot');
                    });
                }, 500);
            }
        }
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender + '-message');
        messageElement.textContent = text;
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        
        // Announce new message for screen readers if it's a bot response
        if (sender === 'bot') {
            announceForScreenReader('Assistant says: ' + text);
        }
    }

    // Event listeners for sending messages
    chatbotSend.addEventListener('click', sendMessage);
    chatbotInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Add welcome message
    setTimeout(() => {
        addMessage("Hello! I'm your AI assistant. How can I help you today?", 'bot');
    }, 1000);
});