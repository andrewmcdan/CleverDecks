const express = require('express');
const app = express();
const port = 3000;



//////////////////////////////////////////////////////
// Server endpoints
//////////////////////////////////////////////////////

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