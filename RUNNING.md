# Docker compose
## Run in production:
1. `docker compose -f docker-compose.prod.yml up -d --build` exposes the application to localhost:7800
2. `docker compose down` to shut it down

## Run in development:
1. `npm --prefix ./qa-ui install`
2. `docker compose up -d --build` exposes the application to localhost:7800
3. `docker compose run --entrypoint=npx e2e-playwright playwright test` to run the tests
4. `docker compose down` to shut it down

# Minikube
## App
1. Start Minikube:
    ```
    minikube start
    ```
2. Install the Postgres operator:
    ```
    kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.19/releases/cnpg-1.19.1.yaml
    ```
3. Deploy the cluster:
    ```
    kubectl apply -f kubernetes/qa-api-database-cluster.yml
    ```
4. Build all the images by running...
    ```
    minikube image build -t nginx -f ./Dockerfile.prod ./nginx
    minikube image build -t qa-api -f ./Dockerfile.prod ./qa-api
    minikube image build -t qa-ui -f ./Dockerfile.prod ./qa-ui
    minikube image build -t sse-server -f ./Dockerfile.prod ./sse-server
    minikube image build -t redis -f ./Dockerfile ./redis
    minikube image build -t llm-api -f ./Dockerfile ./llm-api
    minikube image build -t qa-api-database-migrations -f ./Dockerfile ./flyway
    ```
5. First, ensure that there are two pods of database clusters by running `kubectl get pods`. Then, deploy the application:
    ```
    kubectl apply -f kubernetes/
    ```
6. Expose the application:
    ```
    minikube service nginx-service --url
    ```
## Monitoring
1. Deploy the Prometheus Operator (from https://prometheus-operator.dev/docs/getting-started/installation/):
    ```
    LATEST=$(curl -s https://api.github.com/repos/prometheus-operator/prometheus-operator/releases/latest | jq -cr .tag_name)
    curl -sL https://github.com/prometheus-operator/prometheus-operator/releases/download/${LATEST}/bundle.yaml | kubectl create -f -
    ```
2. Apply the file to the cluster:
    ```
    kubectl apply -f kubernetes/monitoring/prometheus_rbac.yml
    ```
3. Deploy Prometheus instance and access the service by forwarding a local port to the Prometheus Service:
    ```
    kubectl apply -f kubernetes/monitoring/prometheus_instance.yml
    kubectl port-forward svc/prometheus-operated 9090:9090
    ```
  
4. Deploy the service monitor:
    ```
    kubectl apply -f kubernetes/monitoring/service_monitor.yml
    ```
5. Create Grafana deployment:
    ```
    kubectl create deployment grafana --image=docker.io/grafana/grafana:latest 
    ```
6. Create service for Grafana deployment and forward the port 3000 to the service:
    ```
    kubectl expose deployment grafana --port 3000
    kubectl port-forward svc/grafana 3000:3000
    ```
7. Open http://localhost:3000 in your browser to access your Grafana dashboard. Log in with admin as the username and password. This redirects you to a page where you’ll be asked to change your password; afterward, you’ll see the Grafana homepage.
8. Apply they Prometheus exposure:
    ```
    kubectl apply -f kubernetes/monitoring/expose_prometheus.yml
    ```
9. View <node_ip> with
    ```
    kubectl get nodes -o wide
    ```
10. Create a new data source for Prometheus in Grafana and enter "http://<node_ip>:30900" in the URL box, then click Save & Test.
11. You can now create visualizations in Grafana