# OpenAI Realtime API WebRTC Demo

A real-time voice and text chat application that demonstrates the capabilities of OpenAI's Realtime API using WebRTC. This application supports both text-based conversations and voice interactions with AI.

## Features

- 🎙️ Real-time voice communication with AI
- 💬 Text-based chat interface
- ✨ Markdown rendering for AI responses
- 🎨 Syntax highlighting for code blocks
- 📝 Event logging system
- 🔄 Real-time transcription display
- 🎯 WebRTC-based communication
- 🔒 Secure token-based authentication

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18 or higher)
- npm (Node Package Manager)
- An OpenAI API key with access to the Realtime API

## Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your OpenAI API key:
```bash
OPENAI_API_KEY=your_api_key_here
```

## Running the Application

1. Start the server:
```bash
node server.js
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. Click the "Connect" button to establish a connection with the OpenAI Realtime API
2. Type your message in the input field or speak using your microphone
3. View the conversation history in the main chat window
4. Toggle the events log to see detailed WebRTC events and API responses

## Project Structure

```
├── public/
│   ├── index.html      # Main HTML file
│   ├── style.css       # Styles for the application
│   └── script.js       # Client-side JavaScript
├── server.js           # Express server setup
├── .env               # Environment variables (create this)
└── README.md          # This file
```

## Technical Details

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- Real-time Communication: WebRTC
- Markdown Processing: Marked.js
- Syntax Highlighting: highlight.js
- API: OpenAI Realtime API

## Security Notes

- The application uses ephemeral tokens for API authentication
- Environment variables are used to secure API keys
- WebRTC connections are established using secure protocols

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- OpenAI for providing the Realtime API
- The WebRTC project
- Marked.js for markdown rendering
- highlight.js for syntax highlighting

## Support

For support, please [create an issue](your-repository-url/issues) in the repository.
