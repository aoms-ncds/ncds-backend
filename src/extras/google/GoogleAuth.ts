import {BaseExternalAccountClient, OAuth2Client} from 'google-auth-library';

class GoogleAuth {
  static auth: BaseExternalAccountClient | OAuth2Client | null;

  public static authenticate() {
    GoogleAuth.auth = new OAuth2Client(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRETE,
    );

    GoogleAuth.auth.setCredentials({refresh_token: process.env.GOOGLE_APIS_REFRESH_TOKEN});
    return GoogleAuth.auth;
  }

  public static getAuth() {
    if (!GoogleAuth.auth) return GoogleAuth.authenticate();
    return GoogleAuth.auth;
  }
}
export default GoogleAuth;
