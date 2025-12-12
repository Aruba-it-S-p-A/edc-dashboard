# EDC Dataspace Dashboard

A web dashboard for managing participants in dataspace ecosystems built on Eclipse Dataspace Component (EDC). This dashboard provides a user-friendly interface for provisioning, monitoring, and managing participants in your dataspace infrastructure.

## Overview

This dashboard is designed to work with EDC-based dataspace deployments. It handles the lifecycle of participants - from initial provisioning through active operations to deprovisioning. You can track participant status, manage credentials, view operation history, and monitor your dataspace through a clean, responsive interface.

The dashboard is built with Angular 19 and TailwindCSS. It supports both authenticated and unauthenticated modes, with optional Keycloak integration for enterprise deployments.

## Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- An EDC backend with the required API endpoints (see API Requirements below)

## Quick Start

Clone the repository and install dependencies:

```bash
npm install
```

For local development with the included mock server:

```bash
npm run start:mock
```

This starts the mock API server on port 3001 and the Angular development server on port 4200. Open http://localhost:4200 in your browser.

To run only the Angular app (pointing to your own backend):

```bash
npm start
```

The app will be available at http://localhost:4200.

## Building for Production

```bash
npm run build
```

The production build will be in `dist/edc-public-dashboard`. You can serve this with any static file server or integrate it into your deployment pipeline.

For development with automatic rebuilds:

```bash
npm run watch
```

## API Requirements

This dashboard expects a REST API that follows the EDC participant management pattern. The backend should provide these endpoints:

### Participant Management

- `GET /v1/participants` - List all participants with optional filtering (status, search, pagination)
- `GET /v1/participants/:participantId` - Get participant details
- `POST /v1/participants` - Create a new participant
- `PATCH /v1/participants/:participantId` - Update participant metadata
- `DELETE /v1/participants/:participantId` - Delete a participant
- `GET /v1/participants/stats` - Get dashboard statistics

### Credentials

- `GET /v1/participants/:participantId/credentials` - List participant credentials
- `GET /v1/participants/:participantId/credentials/:credentialId` - Get credential details
- `POST /v1/participants/:participantId/credentials` - Request new credentials
- `PUT /v1/participants/:participantId/credentials` - Update credentials

### Operations History

- `GET /v1/participants/:participantId/operations` - Get operation history with pagination

### Tenant Information (Optional)

- `GET /v1/tenants/me` - Get current tenant information
- `PUT /v1/tenants/:tenantId` - Update tenant branding/settings

### Response Format

The API should return participant data in this format:

```json
{
  "id": "string",
  "name": "string",
  "did": "string",
  "host": "string",
  "currentOperation": "ACTIVE" | "PROVISION_IN_PROGRESS" | "DEPROVISION_IN_PROGRESS" | "PROVISION_FAILED" | "DEPROVISION_FAILED" | "DEPROVISION_COMPLETED" | "ERROR",
  "description": "string",
  "metadata": {},
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp"
}
```

For paginated responses, include these headers:
- `X-Total`: Total number of items
- `X-Page`: Current page number
- `X-Limit`: Items per page

## Configuration

Configuration is managed through JSON files in `src/assets/config/`:

- `config.json` - Development settings
- `config.mock.json` - Mock server configuration
- `config.prod.json` - Production settings

Key configuration options:

- `apiUrl` - Base URL for your EDC backend API
- `auth.enableAuth` - Enable/disable authentication
- `auth.keycloak` - Keycloak settings (if using authentication)
- `pagination.defaultPageSize` - Default items per page
- `i18n.defaultLanguage` - Default language (en/it supported)

User preferences (theme, language, refresh interval) are stored in browser localStorage.

## Eclipse Dataspace Component Integration

This dashboard is designed to work with EDC-based dataspace deployments. EDC provides the core infrastructure for dataspace connectivity, and this dashboard sits on top to provide participant management capabilities.

The dashboard assumes your EDC deployment exposes participant management APIs that follow the patterns described above. If your EDC setup uses different endpoint structures, you may need to adjust the API calls in the services layer.

## Features

- **Participant Management**: Create, view, edit, and delete participants
- **Status Tracking**: Monitor participant provisioning and deprovisioning status
- **Credential Management**: Request and manage participant credentials
- **Operation History**: View detailed operation logs for each participant
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Internationalization**: English and Italian language support

## Project Structure

```
src/app/
├── core/              # Core services, models, guards, interceptors
│   ├── services/      # Business logic services
│   ├── models/        # TypeScript interfaces and types
│   ├── guards/        # Route guards
│   └── interceptors/  # HTTP interceptors
├── features/          # Feature modules
│   ├── dashboard/     # Main dashboard view
│   ├── participants/ # Participant management
│   └── settings/      # User settings and preferences
└── shared/            # Shared components and utilities
```

## Development

The project uses Angular 19 with standalone components. Services are provided at the root level for dependency injection. State management is handled through RxJS Observables and BehaviorSubjects.

The mock server (`mock-server/`) provides a simple JSON-based API for development and testing. It uses json-server under the hood and includes custom middleware for handling participant operations.

## Testing

Run the test suite:

```bash
npm test
```

## Deployment

After building, the `dist/edc-public-dashboard` folder contains everything needed for deployment. You can:

- Serve it with nginx, Apache, or any static file server
- Deploy to cloud storage services (S3, Azure Blob, etc.)
- Integrate into containerized deployments (Docker, Kubernetes)

Make sure to configure the `apiUrl` in your production config to point to your EDC backend.

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.



## Support

For issues and questions, please open an issue on the project repository.
