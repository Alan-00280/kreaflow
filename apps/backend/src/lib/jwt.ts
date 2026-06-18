import 'dotenv/config'

export function validateSecrets() {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing secrets: ${missing.join(', ')}`);
    process.exit(1);
  }
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    console.error('❌ JWT_SECRET too short! Minimum 32 characters required.');
    process.exit(1);
  }
  console.log('✅ All secrets validated successfully');
}