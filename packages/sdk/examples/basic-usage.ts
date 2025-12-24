import { UniAuthClient } from '../src';

// Example of how to use the SDK
// Initialize client
const client = new UniAuthClient({
    clientId: 'your_client_id_here',
    clientSecret: 'your_client_secret_here',
    baseUrl: 'http://localhost:3000'
});

async function main() {
    console.log('UniAuth SDK Basic Usage Example');

    // 1. Send SMS Code
    console.log('\n--- 1. Sending SMS Code ---');
    const sendResult = await client.sendPhoneCode('+8613800138000');
    console.log('Send Result:', sendResult);

    if (!sendResult.success) {
        console.log('Failed to send code, stopping demo.');
        return;
    }

    // 2. Login with Code (Simulated)
    console.log('\n--- 2. Logging in with Code ---');
    // In a real app, user inputs the code received
    const code = '123456';
    const loginResult = await client.loginWithPhoneCode('+8613800138000', code);

    if (loginResult.success) {
        console.log('Login Successful!');
        console.log('User:', loginResult.user?.phone);
        console.log('Access Token:', loginResult.access_token);

        // 3. User Info (via OAuth2 helper if we had an ID token or similar)
        // Here we just use the returned user object
    } else {
        console.log('Login Failed:', loginResult.message);
    }
}

// Check if run directly
// if (require.main === module) {
//   main().catch(console.error);
// }

export { main };
