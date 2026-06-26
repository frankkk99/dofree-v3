const ref = process.env.VERCEL_GIT_COMMIT_REF || '';
const env = process.env.VERCEL_ENV || '';

if (env === 'production' && ref !== 'main') {
  console.log(`Skipping production build for non-main ref: ${ref || 'unknown'}`);
  process.exit(0);
}

console.log(`Building ${env || 'unknown'} deployment for ref: ${ref || 'unknown'}`);
process.exit(1);
