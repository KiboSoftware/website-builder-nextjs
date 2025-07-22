const constants = {
  headerPrefix: "x-vol-",
  headers: {
    APPCLAIMS: "app-claims",
    USERCLAIMS: "user-claims",
    TENANT: "tenant",
    SITE: "site",
    MASTERCATALOG: "master-catalog",
    CATALOG: "catalog",
  },
};

export const calculateTicketExpiration = (kiboAuthTicket: any) =>
  Date.now() + kiboAuthTicket.expires_in * 1000;

export const getProxyAgent = (): { agent: any } => {
  let options = { agent: null as any };
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  return options;
};

export const isValidConfig: (config: any) => boolean = (
  config
) => {
  const { api: apiConfig } = config || {};

  if (
    !apiConfig ||
    !(apiConfig.accessTokenUrl || apiConfig.authHost) ||
    !apiConfig.apiHost ||
    !apiConfig.clientId ||
    !apiConfig.sharedSecret
  )
    return false;
  return true;
};
//naive method to grab auth host from auth url
export const getHostFromUrl = (url: string) => {
  const match = url.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
  return (match && match[0]) || "";
};

// normalize anonymous / registered shopper auth ticket
export const normalizeShopperAuthResponse = (
  apiResponse: any
): any => {
  const {
    accessToken,
    accessTokenExpiration,
    refreshToken,
    userId,
    refreshTokenExpiration,
  } = apiResponse;
  return {
    accessToken,
    accessTokenExpiration,
    refreshToken,
    userId,
    refreshTokenExpiration,
  } as any
};

export const isShopperAuthExpired = (userAuthTicket: any) => {
  const { accessTokenExpiration } = userAuthTicket;
  return new Date(accessTokenExpiration).getTime() < Date.now();
};

export const getKiboHostedConfig = () => {
  try {
    return JSON.parse(process.env.mozuHosted as string).sdkConfig;
  } catch (error:any) {
    throw new Error(
      "Error parsing Kibo Hosted environment variables: " + error.message
    );
  }
};

export const makeKiboAPIHeaders = (kiboHostedConfig: any) => {

  return Object.values(constants.headers).reduce((accum: any, headerSuffix) => {
    if (!kiboHostedConfig[headerSuffix]) {
      return accum;
    }
    const headerName = `${constants.headerPrefix}${headerSuffix}`;
    accum[headerName] = kiboHostedConfig[headerSuffix];
    return accum;
  }, {});
};
const protocolRegx = new RegExp(/https?:\/\//)
export const addProtocolToHost = (hostname: string | undefined) =>
  hostname && !hostname.match(protocolRegx) ? `https://${hostname}` : hostname

export const formatConfigHostnames = (config: any): any => {
  const { apiHost, authHost, ...creds } = config;
  return {
    apiHost: addProtocolToHost(apiHost),
    authHost: addProtocolToHost(authHost),
    ...creds
  }
}

export const getApiConfigFromEnv = () => ({
  clientId: process.env.KIBO_CLIENT_ID as string,
  sharedSecret: process.env.KIBO_SHARED_SECRET as string,
  authHost: process.env.KIBO_AUTH_HOST as string,
  apiHost: process.env.KIBO_API_HOST as string,
})