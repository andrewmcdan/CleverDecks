const express = require('express');
const app = express();
const port = 3000;

const { OpenAI, Configuration } = require("openai");
//const readlineSync = require("readline-sync");

// this loads the API key from the .env file. 
// For development, you should create a .env file in the root directory of the project and add the following line to it:
// OPENAI_SECRET_KEY=your-api-key
// The release version will have to check if the environment variable is set and if not, prompt the user to enter it.
require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });

//////////////////  testing /////////////////////////
let exampleFlashCard = {
    question: "What is the capital of France?",
    answer: "Paris",
    tags: ["geography", "Europe"],
    difficulty: 2,
    collection: "World Geography"
};
let exampleInputText = "The capital of France is Paris. The Eiffel Tower is located in Paris. The Louvre is also located in Paris. The Seine River runs through Paris. Other various fact about France and paris. Extrapolate.";
async function main() {
    const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'assistant', content: 'Please create flash cards and return the data in the json format (an object of an array of objects like this ' + JSON.stringify(exampleFlashCard) + ') from the following text: ' + exampleInputText }],
        model: 'gpt-4-0125-preview',
    });
    console.log(chatCompletion.choices[0].message.content);
}

main();
////////////////// end testing ///////////////////



// TODO: make a class that implements the flash card database. It should have methods for getting, adding, updating, and deleting cards.
// Flash cards should be stored on disk as JSON files
// Flash cards with have the following properties:
// - id: a unique identifier for the card
// - question: the question on the front of the card
// - answer: the answer on the back of the card
// - tags: an array of strings that describe the card. used for searching, sorting, and filtering
// - difficulty: a number from 1 to 5 that represents the difficulty of the card
// - collection: the name of the collection the card belongs to
// - dateCreated: the date the card was created
// - dateModified: the date the card was last modified
// - dateLastStudied: the date the card was last studied
// - timesStudied: the number of times the card has been studied
// - timesCorrect: the number of times the card has been answered correctly
// - timesIncorrect: the number of times the card has been answered incorrectly
// - timesSkipped: the number of times the card has been skipped
// - timesFlagged: the number of times the card has been flagged



// TODO: make a class that interfaces with ChatGPT to generate flash cards from text
// It should have a method that takes a string and returns an array of flash cards



//////////////////////////////////////////////////////
// Server endpoints
//////////////////////////////////////////////////////

// endpoint: /api/getCards
// Type: GET
// sends a JSON object with the card data
app.get('/api/getCards', (req, res) => {
    // TODO: implement
    res.send({ cards: [] }); // should be able to call the getCards method from the flash card database class
});

// endpoint: /api/saveNewCards
// Type: POST
// receives a JSON object with the card data and saves it to the database
app.post('/api/saveNewCards', (req, res) => {
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        // TODO: implement
        res.send({ status: 'ok' });
    });
});

// endpoint: /api/deleteCard
// Type: POST
// receives a JSON object with the card data and deletes it from the database
app.post('/api/deleteCard', (req, res) => {
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        // TODO: implement
        res.send({ status: 'ok' });
    });
});

// endpoint: /api/updateCard
// Type: POST
// receives a JSON object with the card data and updates it in the database
app.post('/api/updateCard', (req, res) => {
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        // TODO: implement
        res.send({ status: 'ok' });
    });
});

// endpoint: /api/generateCards
// Type: POST
// receives a string and generates flash cards from it
app.post('/api/generateCards', (req, res) => {
    req.on('data', (data) => {
        const text = data.toString();
        // TODO: implement. Use ChatGPT class to generate flash cards from the text
        res.send({ status: 'ok' }); // send the generated cards instead of 'ok'
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