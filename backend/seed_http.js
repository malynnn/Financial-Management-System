const http = require('http');

const data = JSON.stringify({
  memberId: "cm1rkms1g00028yusubzksjtz", // Alice from seed data
  paymentAmount: 1500.50,
  paymentDate: new Date().toISOString(),
  paymentMethod: "GCASH",
  paymentReference: "GCASH-987654321",
  description: "Test Collection from Seeder"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/collections',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();
