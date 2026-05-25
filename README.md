# Mission Control

A application for managing widgets, configurations, and environment variables.

## Prerequisites

Before starting the application, ensure you have the following installed:
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- [Bun](https://bun.sh/) (a fast all-in-one JavaScript runtime)

## Getting Started

Follow these steps to set up and start the application:

### 1. Start the Database
The project uses MongoDB. Start it in the background using Docker Compose from the root directory:
```bash
docker compose up -d
```

### 2. Configure Environment Variables
Copy the example environment file in the backend package and customize it if needed:
```bash
cp app/packages/backend/.env.example app/packages/backend/.env
```

### 3. Install Dependencies
Navigate to the `app/` directory and install the workspace dependencies:
```bash
cd app
bun install
```

### 4. Run the Application
Start the development server for both frontend and backend concurrently:
```bash
bun dev
```

The frontend application should now be accessible in your browser (typically at `http://localhost:5173` or as indicated in the console).
