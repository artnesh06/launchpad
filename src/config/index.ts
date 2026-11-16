export const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Whatsapp Bot';
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0';

  switch (env) {
    case 'development':
      return {
        appName,
        appVersion,
        base_url:
          process.env.NEXT_PUBLIC_BASE_API_URL || 'http://localhost:3001/api'
      };
    case 'production':
      return {
        appName,
        appVersion,
        base_url: process.env.NEXT_PUBLIC_BASE_API_URL || ''
      };
    default:
      return {
        appName,
        appVersion,
        base_url:
          process.env.NEXT_PUBLIC_BASE_API_URL || 'http://localhost:3001/api'
      };
  }
};
