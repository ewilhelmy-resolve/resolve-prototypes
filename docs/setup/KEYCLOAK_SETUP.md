# Keycloak Local Development Setup

This guide provides instructions for running and managing the Keycloak instance for local development.

## Running Keycloak

The Keycloak service is integrated into the main `docker-compose.yml` file. To start it, simply run:

```bash
docker compose up
```

This will start all the necessary services, including Keycloak. Keycloak will automatically import the local development realm configuration on startup.

## Accessing the Admin Console

1.  **URL:** [http://localhost:8080](http://localhost:8080)
2.  Click on the `Administration Console` link.
3.  **Username:** `admin`
4.  **Password:** `admin`

Once logged in, you can manage the `rita-chat-realm`, clients, and users.

## Local Development Users

The imported realm configuration includes a default user for frontend development and testing.

-   **Username:** `testuser`
-   **Password:** `test`

You can use these credentials on the frontend login page, which will redirect to Keycloak for authentication.
