function extractFeaturesFromRequest(req) {
  const email = req.body.email || '';
  const password = req.body.password || '';
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || '0.0.0.0';

  // IP octets
  const ipParts = ip.split('.').map(Number);
  while (ipParts.length < 4) ipParts.push(0);

  // SQL keywords
  const sqlKeywords = ['SELECT', 'UNION', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'OR 1=1', '--'];
  const hasSQL = sqlKeywords.some(kw => password.toUpperCase().includes(kw));

  // XSS patterns
  const xssPatterns = [
    '<script', 'javascript:', 'onerror=', 'onload=', 'onmouseover=',
    'alert(', 'document.', 'window.', 'eval(', 'document.cookie',
    'document.write', 'innerHTML', 'outerHTML', 'src=', 'href='
  ];
  const hasScript = xssPatterns.some(pattern => password.toLowerCase().includes(pattern));

  // Calculate time since last request (in seconds)
  const now = Date.now();
  const lastRequestTime = req.session?.lastRequestTime || now;
  const timeSinceLast = (now - lastRequestTime) / 1000;
  
  // Update last request time in session
  if (req.session) {
    req.session.lastRequestTime = now;
  }

  return [
    email.length,
    password.length,
    (password.match(/[^a-zA-Z0-9]/g) || []).length,
    req.method === 'POST' ? 1 : 0,
    req.originalUrl === '/api/login' ? 1 : 0,
    userAgent.length,
    ipParts[0], ipParts[1], ipParts[2], ipParts[3],
    Math.min(timeSinceLast, 3600), // Cap at 1 hour to prevent extreme values
    Object.keys(req.body).length,
    hasSQL ? 1 : 0,
    hasScript ? 1 : 0,
    new Date().getHours(),
    new Date().getDay(),
    email.endsWith('@gmail.com') ? 1 : 0,
    email.endsWith('@yahoo.com') ? 1 : 0,
    email.endsWith('@outlook.com') ? 1 : 0,
    0 // dummy
  ];
}

module.exports = { extractFeaturesFromRequest }; 