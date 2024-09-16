TODO: The RUNNING.md outlines steps needed to run the application separately for the development mode and the production mode.

TODO: For merits, the RUNNING.md also outlines the steps needed to use Kubernetes to run the application with Minikube (or similar), using kubernetes configuration files created as parts of the passing with merits requirements

# Docker compose
## Run in production:
- `docker compose -f docker-compose.prod.yml up -d --build` exposes the application to localhost:7800
- `docker compose down` to shut it down

## Run in development:
- `npm --prefix ./qa-ui install`
- `docker compose up -d --build` exposes the application to localhost:7800
- `docker compose run --entrypoint=npx e2e-playwright playwright test` to run the tests
- `docker compose down` to shut it down

# Minikube
1. Start Minikube with `minikube start`
2. Build all the images by running...
  - `minikube image build -t nginx -f ./Dockerfile.prod ./nginx`
  - `minikube image build -t qa-api -f ./Dockerfile.prod ./qa-api`
  - `minikube image build -t qa-ui -f ./Dockerfile.prod ./qa-ui`
  - `minikube image build -t sse-server -f ./Dockerfile.prod ./sse-server`
  - `minikube image build -t redis -f ./Dockerfile ./redis`
  - `minikube image build -t llm-api -f ./Dockerfile ./llm-api`
  - `minikube image build -t qa-api-database-migrations -f ./Dockerfile ./flyway`

3. Install the Postgres operator:
  - `kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.19/releases/cnpg-1.19.1.yaml`

4. Deploy the application:
  - `kubectl apply -f kubernetes/`