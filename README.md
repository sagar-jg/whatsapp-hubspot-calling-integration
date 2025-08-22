# WhatsApp HubSpot Calling Integration

A comprehensive solution for integrating WhatsApp Business Calling with HubSpot using Twilio, WebRTC, and the HubSpot Calling Extensions SDK.

## Features

- **Inbound WhatsApp Calls**: Automatically route incoming WhatsApp calls to HubSpot agents
- **Outbound WhatsApp Calls**: Initiate calls to prospects directly from HubSpot
- **WebRTC Integration**: Handle virtual number calls with 2-legged conference calling
- **HubSpot Integration**: Full integration with HubSpot Calling Extensions SDK
- **Twilio Compliance**: Fully compliant with Twilio's WhatsApp Business Calling requirements
- **Real-time Communication**: WebSocket-based real-time call management

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    HubSpot      │────│   Your App     │────│     Twilio      │
│  (Agent Side)   │    │   (Backend)     │    │ (WhatsApp API)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │ Calling SDK     │    │   Frontend      │    │   WhatsApp      │
    │   Extension     │    │  (WebRTC UI)    │    │   Business      │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

- Node.js 18+
- Twilio Account with WhatsApp Business API access
- HubSpot Developer Account
- SSL Certificate (required for WebRTC)

## Environment Variables

Create `.env` files in both `backend` and `frontend` directories:

### Backend (.env)
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+your_twilio_number
HUBSPOT_APP_ID=your_hubspot_app_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
PORT=3000
JWT_SECRET=your_jwt_secret
REDIS_URL=redis://localhost:6379
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_HUBSPOT_APP_ID=your_hubspot_app_id
REACT_APP_WEBSOCKET_URL=ws://localhost:3000
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/sagar-jg/whatsapp-hubspot-calling-integration.git
cd whatsapp-hubspot-calling-integration
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Install HubSpot Calling Extensions SDK:
```bash
cd ../
git clone https://github.com/HubSpot/calling-extensions-sdk.git hubspot-sdk
```

## Usage

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

3. Configure your HubSpot app to use the calling extension

## API Endpoints

- `POST /api/calls/outbound` - Initiate outbound WhatsApp call
- `POST /api/calls/webhook` - Twilio webhook for call events
- `GET /api/calls/:callId/status` - Get call status
- `POST /api/auth/hubspot` - HubSpot OAuth integration

## Testing

Run the test suites:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# End-to-end tests
npm run test:e2e
```

## Deployment

The application can be deployed to any cloud provider. Make sure to:

1. Set up SSL certificates
2. Configure environment variables
3. Set up Redis for session management
4. Configure Twilio webhooks

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License