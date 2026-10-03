/** @type {import('next').NextConfig} */
const nextConfig = {
  // The public Timelysa website (public/site/index.html) is served at "/".
  // The original business landing page (app/page.tsx) is untouched and available at /for-business.
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/site/index.html' }],
    };
  },
};
export default nextConfig;
