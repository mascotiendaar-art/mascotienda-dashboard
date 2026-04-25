const https = require('https');

exports.handler = async (event) => {
  const { endpoint, body } = JSON.parse(event.body || '{}');

  const isAuth = endpoint === 'auth';
  const url = isAuth
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
