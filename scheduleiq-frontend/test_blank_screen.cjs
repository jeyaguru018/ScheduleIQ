const puppeteer = require('puppeteer');
const { exec } = require('child_process');

(async () => {
  console.log('Building frontend...');
  exec('npm run build', async (err, stdout, stderr) => {
    if (err) {
      console.error('Build failed:', err);
      console.error(stderr);
      return;
    }
    console.log('Build succeeded. Starting preview server...');
    const preview = exec('npm run preview -- --port 4173');
    
    // Wait a bit for server to start
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Launching puppeteer...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type().toUpperCase(), msg.text()));
    page.on('pageerror', err => console.error('BROWSER PAGE ERROR:', err.toString()));
    page.on('requestfailed', req => console.error('BROWSER REQUEST FAILED:', req.url(), req.failure().errorText));
    
    console.log('Navigating to http://localhost:4173...');
    try {
      await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
      console.log('Page loaded successfully.');
    } catch (e) {
      console.error('Navigation error:', e);
    }
    
    await browser.close();
    preview.kill();
    process.exit(0);
  });
})();
