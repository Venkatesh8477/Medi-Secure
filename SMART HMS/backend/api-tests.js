const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = null;
let currentUser = null;

const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true // Don't throw on any status
});

function formatRequestError(error) {
  if (axios.isAxiosError(error)) {
    if (error.code) return `${error.code} (${BASE_URL})`;
    if (error.response) return `HTTP ${error.response.status} ${error.response.statusText || ''}`.trim();
  }
  const cause = error.cause;
  if (cause && typeof cause === 'object' && 'message' in cause && cause.message) {
    return String(cause.message);
  }
  const msg = error.message;
  if (msg && msg !== 'Error') return msg;
  return String(error);
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${formatRequestError(error)}`);
    return false;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   HOSPITAL MANAGEMENT SYSTEM - API TEST SUITE   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    await axios.get(`${BASE_URL}/health`, {
      timeout: 5000,
      validateStatus: () => true
    });
  } catch (e) {
    console.error('⚠️  Cannot reach the API server.');
    console.error(`   ${formatRequestError(e)}`);
    console.error('   Start the backend from this folder: npm start');
    console.error('   (Server must listen on port 5000 — see server.js / .env)\n');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  console.log('\n📝 AUTHENTICATION TESTS');
  console.log('─────────────────────────────────────────\n');

  if (await test('Health check endpoint', async () => {
    const res = await api.get('/health');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  })) passed++; else failed++;

  if (await test('Patient login', async () => {
    const res = await api.post('/auth/login', {
      username: 'patient1',
      password: 'Patient@100'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.token) throw new Error('No token in response');
    authToken = res.data.token;
    currentUser = res.data.user;
  })) passed++; else failed++;

  if (await test('Doctor login', async () => {
    const res = await api.post('/auth/login', {
      username: 'doctor1',
      password: 'Doctor@100'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.token) throw new Error('No token in response');
  })) passed++; else failed++;

  if (await test('Invalid login', async () => {
    const res = await api.post('/auth/login', {
      username: 'wronguser',
      password: 'wrongpass'
    });
    if (res.status === 200) throw new Error('Should have failed');
  })) passed++; else failed++;

  if (await test('Register new user', async () => {
    const res = await api.post('/auth/register', {
      username: 'newuser123',
      email: 'newuser@hospital.com',
      password: 'NewUser@123',
      role: 'patient',
      firstName: 'New',
      lastName: 'User'
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 201/200, got ${res.status}`);
  })) passed++; else failed++;

  // ============================================
  // PATIENT ENDPOINTS
  // ============================================
  console.log('\n📝 PATIENT ENDPOINTS');
  console.log('─────────────────────────────────────────\n');

  if (await test('Get all patients', async () => {
    const res = await api.get('/patients', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data.patients) && !Array.isArray(res.data)) throw new Error('Expected array');
  })) passed++; else failed++;

  if (await test('Get patient details', async () => {
    const res = await api.get('/patients/1', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    // May return 200 or 404 depending on data
    if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected status ${res.status}`);
  })) passed++; else failed++;

  if (await test('Get patient medical records', async () => {
    const res = await api.get('/patients/1/medical-records', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected status ${res.status}`);
  })) passed++; else failed++;

  if (await test('Get patient diagnoses', async () => {
    const res = await api.get('/patients/1/diagnoses', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected status ${res.status}`);
  })) passed++; else failed++;

  // ============================================
  // DOCTOR ENDPOINTS
  // ============================================
  console.log('\n📝 DOCTOR ENDPOINTS');
  console.log('─────────────────────────────────────────\n');

  if (await test('Get all doctors', async () => {
    const res = await api.get('/doctors', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  })) passed++; else failed++;

  if (await test('Get doctor details', async () => {
    const res = await api.get('/doctors/1', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected status ${res.status}`);
  })) passed++; else failed++;

  // ============================================
  // APPOINTMENT ENDPOINTS
  // ============================================
  console.log('\n📝 APPOINTMENT ENDPOINTS');
  console.log('─────────────────────────────────────────\n');

  if (await test('Get all appointments', async () => {
    const res = await api.get('/appointments', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  })) passed++; else failed++;

  if (await test('Get appointment by ID', async () => {
    const res = await api.get('/appointments/1', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected status ${res.status}`);
  })) passed++; else failed++;

  // ============================================
  // MEDICATION ENDPOINTS
  // ============================================
  console.log('\n📝 MEDICATION ENDPOINTS');
  console.log('─────────────────────────────────────────\n');

  if (await test('Get all medications', async () => {
    const res = await api.get('/medications', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  })) passed++; else failed++;

  if (await test('Get medication by ID', async () => {
    const res = await api.get('/medications/1', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected status ${res.status}`);
  })) passed++; else failed++;

  // ============================================
  // PRESCRIPTION ENDPOINTS
  // ============================================
  console.log('\n📝 PRESCRIPTION ENDPOINTS');
  console.log('─────────────────────────────────────────\n');

  if (await test('Get all prescriptions', async () => {
    const res = await api.get('/prescriptions', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  })) passed++; else failed++;

  if (await test('Get prescription by ID', async () => {
    const res = await api.get('/prescriptions/1', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected status ${res.status}`);
  })) passed++; else failed++;

  // ============================================
  // LAB ENDPOINTS
  // ============================================
  console.log('\n📝 LAB ENDPOINTS');
  console.log('─────────────────────────────────────────\n');

  if (await test('Get lab requests', async () => {
    const res = await api.get('/lab-requests', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  })) passed++; else failed++;

  if (await test('Get lab results', async () => {
    const res = await api.get('/lab-results', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  })) passed++; else failed++;

  // ============================================
  // VITAL SIGNS ENDPOINTS
  // ============================================
  console.log('\n📝 VITAL SIGNS ENDPOINTS');
  console.log('─────────────────────────────────────────\n');

  if (await test('Get vital signs', async () => {
    const res = await api.get('/vital-signs', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  })) passed++; else failed++;

  if (await test('Get vital signs by patient', async () => {
    const res = await api.get('/vital-signs/patient/1', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected status ${res.status}`);
  })) passed++; else failed++;

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                      ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║ ✅ Passed: ${String(passed).padEnd(45)} ║`);
  console.log(`║ ❌ Failed: ${String(failed).padEnd(45)} ║`);
  console.log(`║ 📊 Total:  ${String(passed + failed).padEnd(45)} ║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
