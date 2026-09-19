import { spawnSync } from 'node:child_process';

const profile = process.argv[2];
if (!profile) {
  console.error('Usage: node scripts/build-profile.mjs <profile-id>');
  process.exit(2);
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, ETF_DEPLOYMENT_PROFILE: profile },
});
process.exit(result.status ?? 1);
