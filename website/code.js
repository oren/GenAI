document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chatWindow');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessageDiv = document.getElementById('errorMessage');

    // --- CONFIGURATION ---
    const API_ENDPOINT_URL = 'https://xv7sjhw21m.execute-api.us-west-2.amazonaws.com/chat';

    function addMessageToChat(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

        const p = document.createElement('p');
        // Sanitize text slightly to prevent basic HTML injection
        // For robust sanitization, use a library like DOMPurify if handling untrusted HTML from API.
        // Since Bedrock usually returns plain text, this is a basic measure.
        p.textContent = text;
        messageDiv.appendChild(p);

        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to the bottom
    }

    async function sendMessage() {
        const prompt = userInput.value.trim();
        if (!prompt) {
            return;
        }

        if (API_ENDPOINT_URL === 'YOUR_API_GATEWAY_ENDPOINT_URL/chat') {
            showError("Please configure the API_ENDPOINT_URL in script.js");
            return;
        }

        addMessageToChat(prompt, 'user');
        userInput.value = ''; // Clear input field
        sendButton.disabled = true;
        loadingIndicator.style.display = 'block';
        hideError();

        try {
            const response = await fetch(API_ENDPOINT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }),
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    // If response is not JSON
                    errorData = { message: `HTTP error! Status: ${response.status} - ${response.statusText}` };
                }
                console.error('API Error Response:', errorData);
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.response) {
                addMessageToChat(data.response, 'bot');
            } else {
                throw new Error("Invalid response format from API.");
            }

        } catch (error) {
            console.error('Error sending message:', error);
            showError(`Error: ${error.message || 'Could not connect to the chatbot API.'}`);
            // Optionally, add a generic bot message indicating an error
            // addMessageToChat("Sorry, I encountered an error. Please try again.", 'bot');
        } finally {
            sendButton.disabled = false;
            loadingIndicator.style.display = 'none';
            userInput.focus();
        }
    }

    function showError(message) {
        errorMessageDiv.querySelector('p').textContent = message;
        errorMessageDiv.style.display = 'block';
    }

    function hideError() {
        errorMessageDiv.style.display = 'none';
        errorMessageDiv.querySelector('p').textContent = '';
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Initial focus
    userInput.focus();
});
