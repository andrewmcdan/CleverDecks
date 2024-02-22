// these test should be run with the server running
// TODO: need to write all the tests for all the endpoints

const server = 'http://localhost:3000';
const apiBase = '/api/';
const webBase = '/web/';
const request = require('supertest');


test('server is running', () => {
    expect(true).toBe(true);
    // TODO: check if server is running
});

test('GET /', async () => {
    const response = await request(server).get('/');
    expect(response.statusCode).toBe(302); // redirect
});

test('GET /web/index.html', async () => {
    const response = await request(server).get(webBase + 'index.html');
    expect(response.statusCode).toBe(200);
    expect(response.type).toBe('text/html');
});

test('GET /api/getCards?options', async () => {
    const response = await request(server).get(apiBase + 'getCards?collection=Geography&tags=Europe');
    expect(response.statusCode).toBe(200);
    expect(response.type).toBe('application/json');
    expect(response.body).toBeDefined();
});

