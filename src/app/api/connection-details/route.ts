import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

// Get LiveKit credentials from environment variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Don't cache the results
export const revalidate = 0;

export interface ConnectionDetails {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
}

export async function GET() {
  try {
    console.log("Connection details API called");
    
    // Debug environment variables
    console.log("Environment check:", {
      hasApiKey: !!API_KEY,
      hasApiSecret: !!API_SECRET,
      livekitUrl: LIVEKIT_URL,
    });
    
    if (!LIVEKIT_URL) {
      console.error("LIVEKIT_URL is not defined");
      return NextResponse.json(
        { error: "LiveKit URL is not configured" },
        { status: 500 }
      );
    }
    
    if (!API_KEY) {
      console.error("LIVEKIT_API_KEY is not defined");
      return NextResponse.json(
        { error: "LiveKit API key is not configured" },
        { status: 500 }
      );
    }
    
    if (!API_SECRET) {
      console.error("LIVEKIT_API_SECRET is not defined");
      return NextResponse.json(
        { error: "LiveKit API secret is not configured" },
        { status: 500 }
      );
    }

    // Generate a unique participant identity
    const participantIdentity = `user-${Math.floor(Math.random() * 100000)}`;
    
    // Always use the consistent room name for the Tara agent
    const roomName = 'tara-medical-counselor';
    
    // Create the access token with the required credentials
    const token = new AccessToken(API_KEY, API_SECRET, {
      identity: participantIdentity,
      ttl: 60 * 15, // 15 minutes in seconds
    });
    
    // Add grants for the participant - using standard properties
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });
    
    // Generate JWT token - our version of livekit-server-sdk returns a Promise
    const participantToken = await token.toJwt();

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName: participantIdentity,
    };
    
    console.log("Connection details generated successfully:", {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantName: participantIdentity,
    });
    
    return NextResponse.json(data, { 
      headers: { "Cache-Control": "no-store" } 
    });
  } catch (error) {
    console.error("Error generating connection details:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 