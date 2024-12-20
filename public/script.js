// This script sets up a connection to the Realtime API via WebRTC
// Once connected, incoming events are displayed in the textarea.
// A simple button sends a text-based client event to the model.
let pc;
let dc;
const connectBtn = document.getElementById("connectBtn");
const sendBtn = document.getElementById("sendBtn");
const statusIndicator = document.getElementById("statusIndicator");
const messageForm = document.getElementById("messageForm");
const userMessage = document.getElementById("userMessage");
const eventsLog = document.getElementById("eventsLog");
const conversation = document.getElementById("conversation");
const toggleEventsBtn = document.getElementById("toggleEvents");
const eventsContainer = document.querySelector(".events-container");
let currentTranscript = '';
let currentResponse = '';

// Add at the top with other initializations
marked.setOptions({
    highlight: function(code, language) {
        if (language && hljs.getLanguage(language)) {
            return hljs.highlight(code, { language }).value;
        }
        return code;
    },
    breaks: true,
    gfm: true
});

// Prevent form submission and handle message sending
messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
});

connectBtn.addEventListener("click", initConnection);

toggleEventsBtn.addEventListener("click", () => {
    const isExpanded = toggleEventsBtn.getAttribute("aria-expanded") === "true";
    toggleEventsBtn.setAttribute("aria-expanded", !isExpanded);
    toggleEventsBtn.textContent = isExpanded ? "Show Events Log" : "Hide Events Log";
    eventsLog.classList.toggle("collapsed");
});

function updateConnectionStatus(status) {
    if (status === 'connected') {
        statusIndicator.className = 'status-online';
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connected';
    } else {
        statusIndicator.className = 'status-offline';
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect';
    }
}

function logEvent(type, data) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedData = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    eventsLog.value += `[${timestamp}] [${type}]: ${formattedData}\n`;
    eventsLog.scrollTop = eventsLog.scrollHeight;

    // Handle text input messages
    if (type === 'Client' && data.type === 'conversation.item.create') {
        const text = data.item.content[0].text;
        updateConversation('user', text, true);
    }

    // Handle transcription events
    if (type === 'Server Event' && data.type === 'response.audio_transcript.delta') {
        currentTranscript += data.delta;
        updateConversation('user', currentTranscript, false);
    }
    
    // Handle text response events
    if (type === 'Server Event' && data.type === 'response.text.delta') {
        currentResponse += data.delta;
        updateConversation('assistant', currentResponse, false);
    }

    // Reset transcripts and mark messages as complete when response is done
    if (type === 'Server Event' && data.type === 'response.done') {
        if (currentTranscript) {
            updateConversation('user', currentTranscript, true);
        }
        if (currentResponse) {
            updateConversation('assistant', currentResponse, true);
        }
        currentTranscript = '';
        currentResponse = '';
    }
}

function updateConversation(role, text, isComplete = false) {
    // Get the last message of this role
    let messageEl = conversation.querySelector(`.${role}-message:last-child`);
    
    // Create new message element if needed
    if (!messageEl || messageEl.dataset.complete === 'true') {
        messageEl = document.createElement('div');
        messageEl.className = `message ${role}-message`;
        messageEl.dataset.complete = 'false';
        
        const roleEl = document.createElement('div');
        roleEl.className = 'message-role';
        roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        
        const textEl = document.createElement('div');
        textEl.className = 'message-text';
        
        messageEl.appendChild(roleEl);
        messageEl.appendChild(textEl);
        conversation.appendChild(messageEl);
    }

    // Update text content with markdown rendering for assistant messages
    const textEl = messageEl.querySelector('.message-text');
    if (role === 'assistant') {
        // Split the text into lines and process markdown line by line
        const lines = text.split('\n');
        let processedText = '';
        let codeBlock = false;
        
        for (const line of lines) {
            // Check if we're entering or leaving a code block
            if (line.startsWith('```')) {
                codeBlock = !codeBlock;
                processedText += line + '\n';
                continue;
            }
            
            // If we're in a code block, don't process markdown
            if (codeBlock) {
                processedText += line + '\n';
                continue;
            }
            
            // Process markdown for non-code-block lines
            processedText += line + '\n';
        }
        
        // Parse the entire processed text with marked
        textEl.innerHTML = marked.parse(processedText);
        
        // Apply syntax highlighting to code blocks
        textEl.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } else {
        textEl.textContent = text;
    }

    // Mark as complete if specified
    if (isComplete) {
        messageEl.dataset.complete = 'true';
    }

    // Scroll to bottom
    conversation.scrollTop = conversation.scrollHeight;
}

async function initConnection() {
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';
    logEvent('System', 'Fetching ephemeral token...');
    
    try {
        const tokenResponse = await fetch("/session");
        const data = await tokenResponse.json();
        
        if (!data.client_secret?.value) {
            throw new Error('Failed to get ephemeral token');
        }

        const EPHEMERAL_KEY = data.client_secret.value;
        
        pc = new RTCPeerConnection();
        
        // Set up remote audio
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        pc.ontrack = e => audioEl.srcObject = e.streams[0];

        // Add microphone track
        try {
            const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
            pc.addTrack(ms.getTracks()[0]);
        } catch (err) {
            logEvent('Error', `Microphone access failed: ${err.message}`);
        }

        // Data channel setup
        dc = pc.createDataChannel("oai-events");
        
        dc.onopen = () => {
            updateConnectionStatus('connected');
            logEvent('System', 'Data channel opened');
            
            // Configure session for both text and audio
            const sessionConfig = {
                type: "session.update",
                session: {
                    modalities: ["text", "audio"],
                    voice: "verse"  // Keep the voice setting
                }
            };
            
            try {
                dc.send(JSON.stringify(sessionConfig));
                logEvent('System', 'Session configured for text and audio');
            } catch (error) {
                logEvent('Error', `Failed to configure session: ${error.message}`);
            }
        };

        dc.onclose = () => {
            updateConnectionStatus('disconnected');
            logEvent('System', 'Data channel closed');
        };

        dc.onmessage = (e) => {
            try {
                const eventObj = JSON.parse(e.data);
                logEvent('Server Event', eventObj);
            } catch {
                logEvent('Server Raw', e.data);
            }
        };

        logEvent('System', 'Creating SDP offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const baseUrl = "https://api.openai.com/v1/realtime";
        const model = "gpt-4o-realtime-preview-2024-12-17";
        
        logEvent('System', 'Sending SDP to OpenAI...');
        const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
            method: "POST",
            body: offer.sdp,
            headers: {
                Authorization: `Bearer ${EPHEMERAL_KEY}`,
                "Content-Type": "application/sdp"
            },
        });
        
        const answerSdp = await sdpResponse.text();
        await pc.setRemoteDescription({
            type: "answer",
            sdp: answerSdp,
        });
        
        logEvent('System', 'Connection established!');
        
    } catch (error) {
        logEvent('Error', error.message);
        updateConnectionStatus('disconnected');
        connectBtn.disabled = false;
        connectBtn.textContent = 'Retry Connection';
    }
}

function sendMessage() {
    if (!dc || dc.readyState !== "open") {
        alert("Please connect to the service first.");
        return;
    }

    const message = userMessage.value.trim();
    if (!message) return;

    // First create a conversation item with the user's message
    const conversationItem = {
        type: "conversation.item.create",
        item: {
            type: "message",
            role: "user",
            content: [
                {
                    type: "input_text",
                    text: message,
                }
            ]
        }
    };

    try {
        // Send the conversation item first
        dc.send(JSON.stringify(conversationItem));
        logEvent('Client', conversationItem);

        // Then create the response
        const responseCreate = {
            type: "response.create",
            response: {
                modalities: ["text", "audio"],
                instructions: message,
            },
        };

        dc.send(JSON.stringify(responseCreate));
        logEvent('Client', responseCreate);
        userMessage.value = "";
    } catch (error) {
        logEvent('Error', `Failed to send message: ${error.message}`);
    }
}

// Add keyboard shortcut for sending messages
userMessage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
