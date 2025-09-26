const fs = require('fs');
const path = require('path');

// Simple SVG to create a basic icon
const svgIcon = `
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="32" ry="32" fill="url(#grad1)"/>
  <circle cx="128" cy="128" r="80" fill="white" opacity="0.9"/>
  <text x="128" y="140" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#357ABD">O</text>
</svg>
`;

// Write SVG file
fs.writeFileSync(path.join(__dirname, 'client', 'assets', 'icon.svg'), svgIcon);

console.log('SVG icon created successfully!');
console.log('Note: For production, you should convert this SVG to proper ICO, ICNS, and PNG formats using tools like:');
console.log('- For ICO: Use online converters or imagemagick');
console.log('- For ICNS: Use iconutil on macOS or online converters');
console.log('- For PNG: Use any SVG to PNG converter');