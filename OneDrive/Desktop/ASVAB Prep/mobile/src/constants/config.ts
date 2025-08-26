import Constants from 'expo-constants';

const getApiUrl = () => {
  const expoDebuggerHost = Constants.expoConfig?.hostUri?.split(':').shift();
  
  if (__DEV__ && expoDebuggerHost) {
    return `http://${expoDebuggerHost}:3001/api/v1`;
  }
  
  return Constants.expoConfig?.extra?.apiUrl || 'https://api.asvabprep.com/api/v1';
};

export const config = {
  api: {
    baseURL: getApiUrl(),
    timeout: 10000,
  },
  app: {
    name: 'ASVAB Prep',
    version: Constants.expoConfig?.version || '1.0.0',
  },
  storage: {
    tokenKey: '@asvab_prep_token',
    refreshTokenKey: '@asvab_prep_refresh_token',
    userKey: '@asvab_prep_user',
  },
  notifications: {
    androidChannelId: 'asvab-prep-notifications',
  },
};