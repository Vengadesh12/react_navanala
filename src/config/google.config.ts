/**
 * Google OAuth 2.0 & Identity Services Configuration
 *
 * HOW TO OBTAIN & CONFIGURE YOUR GOOGLE CLIENT ID:
 * 1. Visit the Google Cloud Console:
 *    https://console.cloud.google.com/apis/credentials
 * 2. Create or select your Google Cloud Project.
 * 3. Go to "APIs & Services" > "Credentials".
 * 4. Click "+ CREATE CREDENTIALS" and select "OAuth client ID".
 * 5. Under "Application type", choose "Web application".
 * 6. Under "Authorized JavaScript origins", add:
 *      http://localhost:5173
 *      http://localhost:3000
 * 7. Under "Authorized redirect URIs", add:
 *      http://localhost:5173
 *      http://localhost:5173/login
 * 8. Click "Create" and copy the generated "Client ID".
 * 9. Paste your Client ID into:
 *      - Frontend: frornt/csharp/.env (VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com)
 *      - Backend: back/backend/appsettings.json (Authentication:Google:ClientId)
 */

export const GOOGLE_CONFIG = {
  // Read from Vite environment variable with direct fallback
  clientId:
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
    "294359684714-s4cjvi3kfqsp9oviegouck3rq375bn95.apps.googleusercontent.com",
  consoleCredentialsUrl: "https://console.cloud.google.com/apis/credentials",
  scopes: "email profile openid",
};

/**
 * Returns true if the Google Client ID has been configured with a non-placeholder value.
 */
export const isGoogleAuthAvailable = (): boolean => {
  const id = GOOGLE_CONFIG.clientId?.trim();
  return Boolean(
    id &&
    id.length > 10 &&
    !id.includes("YOUR_GOOGLE_CLIENT_ID") &&
    !id.includes("your-google-client-id")
  );
};
