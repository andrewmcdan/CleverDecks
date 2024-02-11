const express = require('express');
const app = express();
const port = 3000;

const ai = require("openai");
//const readlineSync = require("readline-sync");

// this loads the API key from the .env file. 
// For development, you should create a .env file in the root directory of the project and add the following line to it:
// OPENAI_SECRET_KEY=your-api-key
require("dotenv").config();

let apiKeyFound = process.env.OPENAI_SECRET_KEY==undefined?false:true; // check to see if the API key is set in the environment variables. If the .env file is not found, this will be false.
let openai = null;
if(apiKeyFound){   
    openai = new ai.OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });
}

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
if(apiKeyFound) main();
////////////////// end testing ///////////////////

// TODO: "ChatGPT" class: make a class that interfaces with ChatGPT as a generic chatbot 
// This class should check if the API key is found before trying to use it. 

// TODO: "flashCardGenerator" class: make a class that interfaces with ChatGPT chatbot class to generate flash cards from text
// It should have a method that takes a string and returns an array of flash cards

// TODO: "wrongAnswerGenerator" class: make a class that creates wrong answers for cards for use in multiple choice questions
// It should have a method that takes a card and returns an array of wrong answers


// TODO: make a class that implements the flash card database. It should have methods for getting, adding, updating, and deleting cards.
// Flash cards should be stored on disk as JSON file(s). The class should load the flash cards from disk into memory when it is created.
// Whenever a card is added, updated, or deleted, the class should save the flash cards to disk.
//
// FlashCards class will have the following properties:
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
// 
// METHODS:
//
// loadCards() - loads the flash cards from disk into memory
// 
// getCards(params) - returns an array of cards that match the given parameters
// params is an object with the following properties:
// - numberOfCards: the number of cards to get
// - offset: the number of cards to skip
// - collection (optional): the name of the collection to get cards from
// - tags (optional): an array of strings to filter by
// - difficulty (optional): a number from 1 to 5 to filter by
// - search (optional): a string to search for in the question or answer
// - dateCreatedRange (optional): an array of two Date objects to filter by date created
// - dateModifiedRange (optional): an array of two Date objects to filter by date modified
//
// addCard(cardData) - adds a card to the database
// cardData is an object with the following properties:
// - question: the question on the front of the card
// - answer: the answer on the back of the card
// - tags: an array of strings that describe the card. used for searching, sorting, and filtering
// - difficulty: a number from 1 to 5 that represents the difficulty of the card
// - collection: the name of the collection the card belongs to
//
// updateCard(cardData) - updates a card in the database
// cardData is an object with "id" and one or more the following properties:
// - id: the unique identifier of the card to update
// - question: the question on the front of the card
// - answer: the answer on the back of the card
// - tags: an array of strings that describe the card. used for searching, sorting, and filtering
// - difficulty: a number from 1 to 5 that represents the difficulty of the card
// - collection: the name of the collection the card belongs to
//
// deleteCard(cardData) - deletes a card from the database
// cardData is an object with the following properties:
// - id: the unique identifier of the card to delete
//
// getCountOfCards(params) - returns the number of cards that match the given parameters
// params is an object with any or none of the following properties:
// - collection (optional): the name of the collection to get cards from
// - tags (optional): an array of strings to filter by
// - difficulty (optional): a number from 1 to 5 to filter by
// - search (optional): a string to search for in the question or answer
// - dateCreatedRange (optional): an array of two Date objects to filter by date created
// - dateModifiedRange (optional): an array of two Date objects to filter by date modified
//


//////////////////////////////////////////////////////
// Server endpoints
//////////////////////////////////////////////////////

// endpoint: /api/getCards
// Type: GET
// sends a JSON object with the card data
// query parameters (optional):
// - numberOfCards: the number of cards to get
// - offset: the number of cards to skip
// - collection: the name of the collection to get cards from
// - tags: a comma separated list of tags to filter by
// - difficulty: a number from 1 to 5 to filter by
// - search: a string to search for in the question or answer
// - dateCreatedRange: a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date created
// - dateModifiedRange: a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date modified
app.get('/api/getCards', (req, res) => {
    // TODO: implement
    let requestParams = req.query; // if no query parameters are given, we should get all cards
    // we should validate the query parameters and set defaults of null or 0 if they are not given

    // let cards = get cards from the flash card database class using the above parameters
    res.send({ cards: [requestParams] });
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

// endpoint: /api/getWrongAnswers
// Type: GET
// sends a JSON object with the wrong answers for a given card
// query parameters:
// - cardId: the id of the card to get wrong answers for
// - numberOfAnswers: the number of wrong answers to get
app.get('/api/getWrongAnswers', (req, res) => {
    const requestParams = req.query;
    // TODO: implement
    res.send({ answers: [requestParams] });
});

// endpoint: /api/getCardCount
// Type: GET
// sends a JSON object with the number of cards that match the given parameters
// query parameters (optional):
// - collection: the name of the collection to get cards from
// - tags: a comma separated list of tags to filter by
// - difficulty: a number from 1 to 5 to filter by
// - search: a string to search for in the question or answer
// - dateCreatedRange: a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date created
// - dateModifiedRange: a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date modified
app.get('/api/getCardCount', (req, res) => {
    const requestParams = req.query;
    // TODO: implement
    res.send({ count: 0 });
});

// endpoint: /api/getGPTenabled
// Type: GET
// sends a JSON object with the value of apiKeyFound
app.get('/api/getGPTenabled', (req, res) => {
    res.send({ enabled: apiKeyFound });
});


// Serve static files
app.get('/', (req, res) => {
    // forward to /web/
    res.redirect('/web/index.html');
});
app.use('/web', express.static('web', {
    extensions: ['html', 'htm', 'css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'json', 'xml', 'webmanifest']
}));

// 404
app.use((req, res, next) => {
    res.status(404).sendFile(__dirname + '/web/404.html');
});

app.listen(port, () => {
    console.log(`App running. Point your web browser to http://localhost:${port}`);
});