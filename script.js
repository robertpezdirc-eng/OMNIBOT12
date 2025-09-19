// --- GLOBAL STATE ---
let chatController = null;
let recognition = null;
let isListening = false;
let uploadedImage = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initApp);
window.onload = () => {
    // Trigger boot-up animation
    setTimeout(() => {
        document.body.classList.remove('loading');
    }, 200);
};


function initApp() {
    initUI();
    initEventListeners();
    initSpeechRecognition();
}

function initUI() {
    // Initial UI setup, if any
}

function initEventListeners() {
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keydown', handleKeydown);
    document.getElementById('mic-btn').addEventListener('click', toggleSpeechRecognition);
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    document.getElementById('remove-image-btn').addEventListener('click', removeUploadedImage);
    document.getElementById('generate-image-btn').addEventListener('click', generateImage);
    document.getElementById('generate-video-btn').addEventListener('click', generateVideo);
    document.getElementById('theme-switch').addEventListener('change', toggleTheme);
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'sl-SI';

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            document.getElementById('chat-input').value = transcript;
            document.getElementById('transcription-status').textContent = "Poslušam...";
        };

        recognition.onend = () => {
            if (isListening) {
                // If it stops unexpectedly, restart it
                recognition.start();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showToast(`Napaka pri prepoznavi: ${event.error}`, 'error');
            stopListening();
        };
    } else {
        document.getElementById('mic-btn').style.display = 'none';
        console.warn('Speech Recognition not supported in this browser.');
    }
}


// --- THEME ---
function toggleTheme(event) {
    document.documentElement.classList.toggle('light', event.target.checked);
}


// --- CHAT LOGIC ---
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message && !uploadedImage) return;
    
    // Abort previous stream if exists
    if (chatController) {
        chatController.abort();
    }
    chatController = new AbortController();

    appendMessage('user', message);
    if (uploadedImage) {
        appendMessage('user', { image: uploadedImage.url });
    }
    input.value = '';
    input.style.height = 'auto';
    removeUploadedImage();

    showSkeletonLoader();

    try {
        const aiPersona = document.getElementById('ai-persona').value;
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                image: uploadedImage ? { type: uploadedImage.type, data: uploadedImage.data } : null,
                persona: aiPersona,
            }),
            signal: chatController.signal,
        });
        
        removeSkeletonLoader();
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const widgetDataHeader = response.headers.get('X-Widget-Data');
        if (widgetDataHeader) {
            const widgetData = JSON.parse(decodeURIComponent(widgetDataHeader));
            renderWidget(widgetData);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiMessage = appendMessage('ai', '');

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            updateMessage(aiMessage, chunk, true);
        }
        
    } catch (error) {
        removeSkeletonLoader();
        if (error.name !== 'AbortError') {
            appendMessage('ai', `Prišlo je do napake: ${error.message}`);
            console.error('Error sending message:', error);
        }
    } finally {
        chatController = null;
    }
}

function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
    // Auto-resize textarea
    event.target.style.height = 'auto';
    event.target.style.height = (event.target.scrollHeight) + 'px';
}

// --- MESSAGE RENDERING ---
function appendMessage(sender, content) {
    const chatLog = document.getElementById('chat-log');
    const template = document.getElementById('chat-message-template');
    const messageClone = template.content.cloneNode(true);
    const messageElement = messageClone.querySelector('.chat-message');
    const contentElement = messageClone.querySelector('.message-content');

    messageElement.classList.add(sender);

    if (typeof content === 'string') {
        contentElement.textContent = content;
    } else if (content.image) {
        const img = document.createElement('img');
        img.src = content.image;
        img.style.maxWidth = '200px';
        img.style.borderRadius = '8px';
        contentElement.appendChild(img);
    }
    
    chatLog.appendChild(messageClone);
    chatLog.scrollTop = chatLog.scrollHeight;
    return messageElement;
}

function updateMessage(messageElement, chunk, stream = false) {
    const contentElement = messageElement.querySelector('.message-content');
    if (stream) {
        // Simple markdown for bold and italic
        let currentText = contentElement.innerHTML;
        currentText += chunk
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        contentElement.innerHTML = currentText;
    } else {
        contentElement.innerHTML = chunk;
    }
    
    // Add copy buttons to new code blocks
    const codeBlocks = contentElement.querySelectorAll('pre:not(.code-block-initialized)');
    codeBlocks.forEach(block => {
        block.classList.add('code-block-initialized');
        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.textContent = 'Kopiraj';
        btn.onclick = () => {
            const code = block.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = 'Kopirano!';
                setTimeout(() => { btn.textContent = 'Kopiraj'; }, 2000);
            });
        };
        block.appendChild(btn);
    });

    const chatLog = document.getElementById('chat-log');
    chatLog.scrollTop = chatLog.scrollHeight;
}

function showSkeletonLoader() {
    const chatLog = document.getElementById('chat-log');
    const skeletonMessage = appendMessage('ai', '');
    skeletonMessage.id = 'skeleton-loader';
    const content = skeletonMessage.querySelector('.message-content');
    content.innerHTML = `<div class="skeleton" style="height: 20px; width: 80%; margin-bottom: 10px;"></div><div class="skeleton" style="height: 20px; width: 60%;"></div>`;
}

function removeSkeletonLoader() {
    const loader = document.getElementById('skeleton-loader');
    if (loader) {
        loader.remove();
    }
}

// --- IMAGE HANDLING ---
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result.split(',')[1];
            uploadedImage = {
                url: e.target.result,
                data: base64String,
                type: file.type
            };
            
            const preview = document.getElementById('image-preview');
            const previewContainer = document.getElementById('image-preview-container');
            preview.src = e.target.result;
            previewContainer.classList.add('visible');
        };
        reader.readAsDataURL(file);
    }
}

function removeUploadedImage() {
    uploadedImage = null;
    document.getElementById('image-upload').value = '';
    document.getElementById('image-preview-container').classList.remove('visible');
}


// --- WIDGETS ---
function renderWidget(data) {
    if (data.type === 'recipe') {
        const template = document.getElementById('recipe-widget-template');
        const widget = template.content.cloneNode(true);
        const widgetElement = widget.querySelector('.widget');

        widget.querySelector('.recipe-title').textContent = data.content.name;
        widget.querySelector('.recipe-description').textContent = data.content.description;
        
        const ingredientsList = widget.querySelector('.recipe-ingredients');
        data.content.ingredients.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ingredientsList.appendChild(li);
        });
        
        const instructionsList = widget.querySelector('.recipe-instructions');
        data.content.instructions.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            instructionsList.appendChild(li);
        });
        
        widget.querySelector('.close-widget-btn').onclick = () => {
            widgetElement.style.animation = 'fade-out 0.3s ease forwards';
            setTimeout(() => widgetElement.remove(), 300);
        };
        
        document.getElementById('dynamic-widgets-container').prepend(widget);
    }
}


// --- SPEECH RECOGNITION ---
function toggleSpeechRecognition() {
    if (!recognition) return;
    isListening ? stopListening() : startListening();
}

function startListening() {
    isListening = true;
    recognition.start();
    document.getElementById('mic-btn').classList.add('recording');
    document.getElementById('transcription-status').textContent = "Poslušam...";
}

function stopListening() {
    isListening = false;
    recognition.stop();
    document.getElementById('mic-btn').classList.remove('recording');
    document.getElementById('transcription-status').textContent = "";
    if (document.getElementById('chat-input').value.trim()) {
        sendMessage();
    }
}

// --- IMAGE & VIDEO GENERATION ---
async function generateImage() {
    const prompt = document.getElementById('image-prompt').value;
    if (!prompt) {
        showToast('Vnesite opis slike.', 'error');
        return;
    }

    const loader = document.getElementById('image-loader');
    const container = document.getElementById('generated-image-container');
    loader.style.display = 'flex';
    container.innerHTML = '';

    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error('Generiranje slike ni uspelo.');
        
        const { imageUrl } = await response.json();
        const img = document.createElement('img');
        img.src = imageUrl;
        container.appendChild(img);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        loader.style.display = 'none';
    }
}

async function generateVideo() {
    const prompt = document.getElementById('video-prompt').value;
    if (!prompt) {
        showToast('Vnesite opis videa.', 'error');
        return;
    }

    const loader = document.getElementById('video-loader');
    const statusText = document.getElementById('video-status-text');
    const container = document.getElementById('generated-video-container');
    
    loader.style.display = 'flex';
    statusText.textContent = 'Začenjam proces...';
    container.innerHTML = '';

    try {
        const startResponse = await fetch('/api/generate-video-start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        if (!startResponse.ok) throw new Error('Napaka pri zagonu generiranja videa.');
        
        const { operationName } = await startResponse.json();
        
        const statusMessages = ["Pripravljam sceno...", "Komponiram kadre...", "Urejam osvetlitev...", "Dodajam končne detajle..."];
        let messageIndex = 0;

        const interval = setInterval(async () => {
            try {
                const statusResponse = await fetch(`/api/video-status/${operationName}`);
                const data = await statusResponse.json();
                
                statusText.textContent = statusMessages[messageIndex % statusMessages.length];
                messageIndex++;

                if (data.done) {
                    clearInterval(interval);
                    statusText.textContent = 'Video je končan!';
                    const videoUrl = `/api/videos/${encodeURIComponent(data.uri)}`;
                    const video = document.createElement('video');
                    video.src = videoUrl;
                    video.controls = true;
                    container.appendChild(video);
                    loader.style.display = 'none';
                }
            } catch (err) {
                clearInterval(interval);
                throw new Error('Napaka pri preverjanju statusa videa.');
            }
        }, 10000); // Check every 10 seconds

    } catch (error) {
        showToast(error.message, 'error');
        loader.style.display = 'none';
    }
}

// --- UTILITIES ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toast-out 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
