import { spawnSync } from 'node:child_process';

const profile = process.argv[2];
const release = process.argv.includes('--release');

if (!profile) {
  console.error('Usage: node scripts/build-profile.mjs <profile-id> [--release]');
  process.exit(2);
}

if (release && profile !== 'enterprise-euroimmun') {
  console.error('--release is only supported for the enterprise-euroimmun profile.');
  process.exit(2);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['run', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ETF_DEPLOYMENT_PROFILE: profile,
    ETF_ENTERPRISE_RELEASE: release ? '1' : '0',
  },
});
process.exit(result.status ?? 1);
