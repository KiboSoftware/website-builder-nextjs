import { getProxyAgent, calculateTicketExpiration, addProtocolToHost } from "./util";
const isBrowser = () => {
    return typeof window !== 'undefined' && 
           typeof window.document !== 'undefined';
};
export class APIAuthClient  {
  private _clientId: string;
  private _sharedSecret: string;
  private _authHost: string;
  private _authTicketCache?: any;
  private _fetcher: any;
  private _isInternal: any;

  constructor(
    { clientId, sharedSecret, authHost }: any,
    fetcher: any,
    authTicketCache?: any,
    isInternal?: boolean
  ) {
    if (!clientId || !sharedSecret || !authHost) {
      throw new Error(
        "Kibo API Auth client requires a clientId, sharedSecret, and authUrl"
      );
    }
    if (!fetcher) {
      throw new Error(
        "Kibo API Auth client requires a Fetch API implementation"
      );
    }
    this._clientId = clientId;
    this._sharedSecret = sharedSecret;
    this._authHost = addProtocolToHost(authHost) as string;
    this._fetcher = fetcher;
    this._isInternal = isInternal;
    
    if (authTicketCache) {
      this._authTicketCache = authTicketCache;
    }
  }

  private _buildFetchOptions(body: any = {}): any {
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      ...getProxyAgent(),
    };
  }

  private async _fetchAuthTicket(
    url: string,
    options: any
  ): Promise<any> {
    // fetch app auth ticket
    let response: Response 
    if(isBrowser()){
        response = await fetch(url, options);
    } else {
        response = await this._fetcher(url, options);
    }
    if(response?.status >= 500) {
      throw new Error(response?.statusText);
    }

    const authTicket = (await response.json()) as any;
    if(authTicket?.errorCode) {
      throw new Error(authTicket.message);
    }
    // set expiration time in ms on auth ticket
    authTicket.expires_at = calculateTicketExpiration(authTicket);
    return authTicket;
  }

  public async authenticate(): Promise<any> {
    // create oauth fetch options
    const options = this._buildFetchOptions({
      client_id: this._clientId,
      client_secret: this._sharedSecret,
      grant_type: "client_credentials",
    });
    const path = this._isInternal ? `/platform/applications/internal/access-tokens/oauth` : `/api/platform/applications/authtickets/oauth`
    // perform authentication
    const authTicket = await this._fetchAuthTicket(
      `${this._authHost}${path}`,
      options
    );
    // set authentication ticket on next server runtime object
    this._authTicketCache?.setAuthTicket(authTicket);

    return authTicket;
  }

  public async refreshTicket(kiboAuthTicket: any) {
    // create oauth refresh fetch options
    const options = this._buildFetchOptions({
      client_id: this._clientId,
      client_secret: this._sharedSecret,
      grant_type: "client_credentials",
      refresh_token: kiboAuthTicket?.refresh_token,
    });
    const path = this._isInternal ? `/api/platform/applications/internal/access-tokens/oauth` : `/api/platform/applications/authtickets/oauth`
    // perform auth ticket refresh
    const refreshedTicket = await this._fetchAuthTicket(
      `${this._authHost}${path}`,
      options
    );
    // set authentication ticket on next server runtime object
    this._authTicketCache?.setAuthTicket(refreshedTicket);

    return refreshedTicket;
  }

  public async getAccessToken(): Promise<string> {
    // get current Kibo API auth ticket
    try { 
      let authTicket = await this._authTicketCache?.getAuthTicket();

      // if no current ticket, perform auth
      // or if ticket expired, refresh auth
      if (!authTicket) {
        authTicket = await this.authenticate();
      } else if (authTicket.expires_at < Date.now()) {
        authTicket = await this.refreshTicket(authTicket);
      }    
      return authTicket?.access_token as string;
     } catch(error: any) {
      throw new Error(error.message)
     }
  }
}