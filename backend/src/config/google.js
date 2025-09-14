import { google } from "googleapis";
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(CLIENT_ID);

export const verifyGoogleToken = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const getAuthenticatedClient = async (user) => {
    oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
    });

    if (oauth2Client.isTokenExpiring()) {
        console.log("Access token expired, refreshing...");
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            user.googleAccessToken = credentials.access_token;
            await user.save();
            oauth2Client.setCredentials(credentials);
        } catch (error) {
            console.error("Error refreshing access token:", error);
            throw new Error("Could not refresh token");
        }
    }
    return oauth2Client;
};