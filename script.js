// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const recordBtn = document.getElementById('recordBtn');
const processTextBtn = document.getElementById('processTextBtn');
const processAudioBtn = document.getElementById('processAudioBtn');
const audioFileInput = document.getElementById('audioFile');
const fileName = document.getElementById('fileName');
const copyButtons = document.querySelectorAll('.copy-btn');
const downloadBtn = document.getElementById('downloadBtn');
const fileUploadArea = document.querySelector('.file-upload');

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = `${savedTheme}-mode`;
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const newTheme = isDarkMode ? 'light' : 'dark';
    
    document.body.className = `${newTheme}-mode`;
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    themeToggle.innerHTML = theme === 'dark' 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
}

// Tab Management
function switchTab(tabId) {
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// Progress Bar Management
function showProgress(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideProgress(id) {
    document.getElementById(id).classList.add('hidden');
}

// Speech Recognition
function setupSpeechRecognition() {
    recordBtn.addEventListener('click', function() {
        // Visual feedback when recording starts
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        
        // Create speech recognition instance
        let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.start();
        
        let finalTranscript = '';
        
        recognition.onresult = function(event) {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            document.getElementById("textInput").value = finalTranscript + interimTranscript;
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            resetRecordButton();
        };
        
        recognition.onend = function() {
            resetRecordButton();
        };
        
        // Stop recording after 15 seconds to prevent indefinite recording
        setTimeout(() => {
            recognition.stop();
        }, 15000);
    });
}

function resetRecordButton() {
    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
}

// Handle Text Processing
function setupTextProcessing() {
    processTextBtn.addEventListener('click', function() {
        let text = document.getElementById("textInput").value;
        let textLanguage = document.getElementById("textLanguageSelect").value;
        
        if (!text.trim()) {
            showNotification('Please enter some text first', 'warning');
            return;
        }
        
        showProgress("progressBar");
        processTextBtn.disabled = true;
        
        fetch('/summarize', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text, text_language: textLanguage })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById("textSummary").innerText = data.summary || "Error summarizing text";
            document.getElementById("textTranslation").innerText = data.translation || "Error translating text";
            showNotification('Processing complete!', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error processing text', 'error');
        })
        .finally(() => {
            hideProgress("progressBar");
            processTextBtn.disabled = false;
        });
    });
}

// Handle Audio Processing
function setupAudioProcessing() {
    audioFileInput.addEventListener('change', handleFileSelection);
    
    processAudioBtn.addEventListener('click', processAudioFile);
    
    downloadBtn.addEventListener('click', function() {
        let resultText = `Transcript:\n${document.getElementById("transcript").innerText}\n\n` +
                         `Summary:\n${document.getElementById("audioSummary").innerText}\n\n` +
                         `Translation:\n${document.getElementById("audioTranslation").innerText}`;
        
        let blob = new Blob([resultText], { type: "text/plain" });
        let a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "nlp_results.txt";
        a.click();
    });
}

function handleFileSelection() {
    if (this.files && this.files[0]) {
        updateFileDisplay(this.files[0]);
    } else {
        fileName.textContent = 'No file selected';
    }
    
    // Hide results from previous uploads
    clearPreviousResults();
}

function updateFileDisplay(file) {
    fileName.textContent = file.name;
    
    // Add file icon based on type
    const fileIcon = getFileIcon(file.type);
    fileName.innerHTML = `<i class="${fileIcon}"></i> ${file.name}`;
    
    // Show file size
    const fileSize = formatFileSize(file.size);
    fileName.innerHTML += ` <span style="font-size: 0.8em; color: #666;">(${fileSize})</span>`;
    
    // Add active class to upload area
    fileUploadArea.classList.add('file-selected');
}

function getFileIcon(fileType) {
    if (fileType.includes('audio/mp3') || fileType.includes('audio/mpeg')) {
        return 'fas fa-file-audio';
    } else if (fileType.includes('audio/wav')) {
        return 'fas fa-file-audio';
    } else if (fileType.includes('audio')) {
        return 'fas fa-file-audio';
    } else {
        return 'fas fa-file';
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + ' bytes';
    } else if (bytes < 1048576) {
        return (bytes / 1024).toFixed(1) + ' KB';
    } else {
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
}

function clearPreviousResults() {
    document.getElementById("transcript").innerText = 'Your transcript will appear here...';
    document.getElementById("audioSummary").innerText = 'Your summary will appear here...';
    document.getElementById("audioTranslation").innerText = 'Your translation will appear here...';
    
    // Hide download button
    downloadBtn.classList.add('hidden');
}

function processAudioFile() {
    if (!audioFileInput.files || !audioFileInput.files[0]) {
        showNotification('Please select an audio file first', 'warning');
        return;
    }
    
    let fileInput = audioFileInput.files[0];
    let audioLanguage = document.getElementById("audioLanguageSelect").value;
    let formData = new FormData();
    formData.append("file", fileInput);
    formData.append("audio_language", audioLanguage);
    
    showProgress("audioProgressBar");
    processAudioBtn.disabled = true;
    
    fetch('/transcribe', { 
        method: "POST", 
        body: formData 
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        document.getElementById("transcript").innerText = data.transcript || "Error transcribing";
        document.getElementById("audioSummary").innerText = data.summary || "Error summarizing";
        document.getElementById("audioTranslation").innerText = data.translated || "Error translating";
        
        downloadBtn.classList.remove("hidden");
        showNotification('Processing complete!', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error processing audio', 'error');
    })
    .finally(() => {
        hideProgress("audioProgressBar");
        processAudioBtn.disabled = false;
    });
}

// Drag and Drop Functionality
function setupDragAndDrop() {
    const dropArea = document.querySelector('.file-upload');
    
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
        dropArea.classList.add('highlight');
        dropArea.querySelector('i').className = 'fas fa-cloud-download-alt';
        dropArea.querySelector('span').textContent = 'Drop to Upload';
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
        dropArea.querySelector('i').className = 'fas fa-cloud-upload-alt';
        dropArea.querySelector('span').textContent = 'Choose Audio File';
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            
            // Check if file is audio
            if (file.type.startsWith('audio/')) {
                // Update file input
                audioFileInput.files = files;
                updateFileDisplay(file);
                
                // Clear previous results
                clearPreviousResults();
                
                showNotification('File successfully uploaded!', 'success');
            } else {
                showNotification('Please upload an audio file', 'warning');
            }
        }
    }
}

// Copy Button Functionality
function setupCopyButtons() {
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const textToCopy = document.getElementById(targetId).innerText;
            
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    // Visual feedback
                    this.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        this.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 1500);
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                });
        });
    });
}

// Notification System
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        `;
        document.body.appendChild(container);
    }
    
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    
    // Set notification style based on type
    let icon, bgColor;
    switch(type) {
        case 'success':
            icon = 'fa-check-circle';
            bgColor = '#28a745';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            bgColor = '#ffc107';
            break;
        case 'error':
            icon = 'fa-times-circle';
            bgColor = '#dc3545';
            break;
        default:
            icon = 'fa-info-circle';
            bgColor = '#17a2b8';
    }
    
    notification.style.cssText = `
        background-color: ${bgColor};
        color: white;
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        animation: slideIn 0.3s, fadeOut 0.5s 2.5s forwards;
        min-width: 250px;
    `;
    
    notification.innerHTML = `
        <i class="fas ${icon}" style="margin-right: 10px;"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
    
    // Add animations
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Initialize Everything
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    initializeTheme();
    
    // Set up event listeners
    themeToggle.addEventListener('click', toggleTheme);
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this.getAttribute('data-tab'));
        });
    });
    
    // Set up feature-specific functionality
    setupSpeechRecognition();
    setupTextProcessing();
    setupAudioProcessing();
    setupCopyButtons();
    setupDragAndDrop();
});