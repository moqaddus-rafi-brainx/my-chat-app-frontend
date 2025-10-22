// Quick test script to check if your backend is accessible
// Run this with: node debug-api.js

const API_BASE_URL = process.env.VITE_BACKEND_URL || 'https://your-backend-url.com';

async function testEndpoints() {
  console.log('🔍 Testing backend endpoints...');
  console.log('Backend URL:', API_BASE_URL);

  // Test 1: Check if backend is reachable
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test123'
      }),
    });

    console.log('✅ Backend is reachable');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.status === 405) {
      console.log('❌ 405 Error: Method Not Allowed');
      console.log('This means the endpoint exists but POST method is not allowed');
    } else if (response.status === 404) {
      console.log('❌ 404 Error: Endpoint not found');
      console.log('Check if your backend has /auth/signin endpoint');
    }

    const text = await response.text();
    console.log('Response body:', text);

  } catch (error) {
    console.log('❌ Backend is not reachable:', error.message);
  }
}

testEndpoints();
