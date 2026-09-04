// Central API base URL.
// In production, set NEXT_PUBLIC_API_URL to your deployed backend, e.g.
//   https://your-app.fastapicloud.dev/api/v1
// Falls back to localhost for local development.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
