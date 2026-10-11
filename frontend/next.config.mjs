/** @type {import('next').NextConfig} */
// TAATVA Obsidian - website settings.
// Safety headers on every page (bug QA-11):
//   - X-Frame-Options: other websites cannot show Obsidian inside a hidden frame (click tricks)
//   - X-Content-Type-Options: the browser never guesses file types
//   - Referrer-Policy: other websites do not see our full page addresses
//   - Permissions-Policy: no camera, microphone or location, ever
const nextConfig = {
  // Test builds go to their own folder, so they never mix with the normal one
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
