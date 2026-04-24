export const getBackendUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configuredUrl) {
    throw new Error(
      "Backend URL is not configured. Please set EXPO_PUBLIC_API_URL environment variable.",
    );
  }
  return configuredUrl;
};

export const getBackendApiKey = () => {
  const configuredApiKey = process.env.EXPO_PUBLIC_BACKEND_API_KEY?.trim();
  if (!configuredApiKey) {
    throw new Error(
      "Backend API key is not configured. Please set EXPO_PUBLIC_BACKEND_API_KEY environment variable.",
    );
  }

  return configuredApiKey;
};

export const getBackendHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key": getBackendApiKey(),
});
