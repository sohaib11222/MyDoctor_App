/**
 * Stream.io Video Configuration
 * Stream API Key for video calling functionality
 */

// Stream API Key - same as web app
export const STREAM_API_KEY = '3cp572t2hewb';

// Log in development
if (__DEV__) {
  console.log('📹 Stream API Key configured:', STREAM_API_KEY ? `${STREAM_API_KEY.substring(0, 4)}...` : 'MISSING');
}
