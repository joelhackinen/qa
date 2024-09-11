TODO: The RUNNING.md outlines steps needed to run the application separately for the development mode and the production mode.

TODO: For merits, the RUNNING.md also outlines the steps needed to use Kubernetes to run the application with Minikube (or similar), using kubernetes configuration files created as parts of the passing with merits requirements


## Run in production:
- `docker compose -f docker-compose.prod.yml up -d --build` exposes the application to localhost:7800
- `docker compose down` to shut it down

## Run in development:
- `npm --prefix ./qa-ui install`
- `docker compose up -d --build` exposes the application to localhost:7800
- `docker compose run --entrypoint=npx e2e-playwright playwright test` to run the tests
- `docker compose down` to shut it down