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
    endpoint = parsed.endpoint;
    body = parsed.body;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const url = endpoint === 'auth'
    ? 'https://www.tfactura.io/Provisioning/GetAuthToken'
    : `https://www.tfactura.io/Services/Facturacion/${endpoint}`;

  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: data,
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: e.message }),
      });
    });

    req.write(payload);
    req.end();
  });
};
