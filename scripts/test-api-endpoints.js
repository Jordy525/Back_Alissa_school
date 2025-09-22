const fetch = require('node-fetch');

const API_BASE_URL = 'https://back-alissa-school-up2p.onrender.com';

async function testApiEndpoints() {
  console.log('🔍 Test des endpoints API...\n');

  // Test 1: Health check
  console.log('1. Test du health check...');
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: API root
  console.log('\n2. Test de l\'API root...');
  try {
    const response = await fetch(`${API_BASE_URL}/api`);
    const data = await response.json();
    console.log('✅ API root:', data.message);
  } catch (error) {
    console.log('❌ API root failed:', error.message);
  }

  // Test 3: Admin stats (sans token pour voir la réponse)
  console.log('\n3. Test des stats admin (sans auth)...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/stats`);
    const text = await response.text();
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('📊 Response body (first 200 chars):', text.substring(0, 200));
  } catch (error) {
    console.log('❌ Admin stats failed:', error.message);
  }

  // Test 4: Login endpoint
  console.log('\n4. Test du login endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/frontend/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@alissa-school.com',
        password: 'admin123'
      })
    });
    const data = await response.json();
    console.log('✅ Login response:', {
      success: data.success,
      role: data.data?.user?.role,
      redirectPath: data.data?.redirectPath
    });
    
    if (data.success && data.data?.token) {
      // Test 5: Admin stats avec token
      console.log('\n5. Test des stats admin (avec auth)...');
      try {
        const statsResponse = await fetch(`${API_BASE_URL}/api/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${data.data.token}`,
            'Content-Type': 'application/json'
          }
        });
        const statsData = await statsResponse.json();
        console.log('✅ Admin stats avec auth:', {
          success: statsData.success,
          students: statsData.data?.students?.total_students,
          documents: statsData.data?.documents?.total_documents
        });
      } catch (error) {
        console.log('❌ Admin stats avec auth failed:', error.message);
      }
    }
  } catch (error) {
    console.log('❌ Login failed:', error.message);
  }

  console.log('\n🎉 Tests terminés!');
}

testApiEndpoints();