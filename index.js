const express = require('express');
const app = express();
const port = 3000;



//////////////////////////////////////////////////////
// Server endpoints
//////////////////////////////////////////////////////

// endpoint: /api/getCards
// Type: GET
// sends a JSON object with the card data
app.get('/api/getCards', (req, res) => {
    // TODO: implement
    res.send({cards: []});
});

// endpoint: /api/saveNewCards
// Type: POST
// receives a JSON object with the card data and saves it to the database
app.post('/api/saveNewCards', (req, res) => {
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        // TODO: implement
        res.send({status: 'ok'});
    });
});

// endpoint: /api/deleteCard
// Type: POST
// receives a JSON object with the card data and deletes it from the database
app.post('/api/deleteCard', (req, res) => {
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        // TODO: implement
        res.send({status: 'ok'});
    });
});

// endpoint: /api/updateCard
// Type: POST
// receives a JSON object with the card data and updates it in the database
app.post('/api/updateCard', (req, res) => {
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        // TODO: implement
        res.send({status: 'ok'});
    });
});


// Serve static files
app.get('/', (req, res) => {
    // forward to /web/
    res.redirect('/web/');
});
app.use('/web/', express.static('web', {
    extensions: ['html', 'htm', 'css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'json', 'xml', 'webmanifest']
}));

// 404
app.use((req, res, next) => {
    res.status(404).sendFile(__dirname + '/web/404.html');
});

app.listen(port, () => {
    console.log(`App running. Point your web browser to http://localhost:${port}`);
});