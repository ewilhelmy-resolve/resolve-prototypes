// Cookie parsing middleware (simple implementation)
function parseCookies(req, res, next) {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      const name = parts[0];
      const value = parts[1];
      if (name && value) {
        req.cookies[name] = decodeURIComponent(value);
      }
    });
  }
  next();
}

module.exports = {
  parseCookies
};