const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  let endpoint, body;
  try {
    const parsed = JSON.parse(event.body || '{}');
    endpoint = parsed.endpoint || '';
    body = parsed.body || {};
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid JSON', raw: event.body })
    };
  }

  if (!endpoint) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing endpoint' })
    };
  }

  const url = endpoint === 'auth'
    ? 'http://www.tangofactura.com/Provisioning/GetAuthToken'
    : `http://www.tangofactura.com/Services/Facturacion/${endpoint}`;

  const payload = JSON.stringify(body);

  const doRequest = (reqUrl, redirectCount) => new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));

    const urlObj = new URL(reqUrl);
    const lib = urlObj.protocol === 'https:' ? require('https') : require('http');

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Host': urlObj.hostname,
        'Accept': 'application/json',
      },
    };

    const req = lib.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const location = res.headers.location;
        const nextUrl = location.startsWith('http')
          ? location
          : `${urlObj.protocol}//${urlObj.hostname}${location}`;
        res.resume();
        return doRequest(nextUrl, (redirectCount || 0) + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  try {
    const { status, data } = await doRequest(url, 0);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ _status: status, _url: url, _raw: data }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
