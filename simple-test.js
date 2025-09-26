console.log('Simple test starting...');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());

const express = require('express');
console.log('Express loaded');

const app = express();
console.log('App created');

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const PORT = 3003;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Test completed successfully!');
});

console.log('Server setup complete');