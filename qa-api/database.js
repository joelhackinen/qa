import { postgres } from "./deps.js";

let sql = postgres({});

// Check if running with Kubernetes (CloudNativePG with PGPASS)
const pgpass = Deno.env.get("PGPASS");

if (pgpass) {
  const [host, port, database, username, password] = pgpass.trim().split(":");

  sql = postgres({
    host,
    port,
    database,
    username,
    password,
  });
}

export { sql };
