## Application structure
The application contains seven different services:
  1. redis
    - utilized for:
      - caching database queries
      - nonblocking asynchronous communication between services with Redis Streams
      - key-value store to facilitate rate-limiting
  2. llm-api
    - generates the answers with facebook/opt-125m -model
  3. sse-server
    - interacts with llm-api and broadcasts the AI-generated answers to appropriate clients
    - utilizes web worker API to listen for requests to form a SSE connection and to consume a Redis stream simultaneously
  4. qa-ui
    - implemented with Astro and Svelte
    - serves the user interface to the client
    - forms a SSE-connection with sse-server that sends the AI-generated answers to the client without the need to poll any server
  5. qa-api
    - fetches the resources from the database for clients
    - performs basic create, read and update operations
  6. nginx
    - reverse proxy and load balancer
  7. flyway
    - database migrations

## Possible improvements and known flaws
- The whole app could be split into smaller chunks so that individual, more burdened parts of it could be scaled on demand
- Currently non-existing courses can be access in client without error handling, for example:
  - http://localhost:7800/asdfaafsd --> no error
  - http://localhost:7800/asdfaafsd/123 --> error
- llm-api could be scaled so that requests could be processed in concurrently