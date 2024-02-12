const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const ai = require("openai");

// this loads the API key from the .env file. 
// For development, you should create a .env file in the root directory of the project and add the following line to it:
// OPENAI_SECRET_KEY=your-api-key
require("dotenv").config();

// This class is used to interface with OpenAI
class ChatGPT {
    constructor(key) {
        this.openai = null;
        this.setApiKey(key);
    }

    setApiKey(key) {
        this.apiKeyFound = isValidOpenAIKey(key);
        if (this.apiKeyFound) {
            this.openai = new ai.OpenAI({ apiKey: key });
        }
    }

    async generateResponse(inputText){
        if(!this.apiKeyFound) return null;
        const chatCompletion = await this.openai.chat.completions.create({
            messages: [{ role: 'assistant', content: inputText }],
            model: 'gpt-4-0125-preview',
        });
        return chatCompletion.choices[0].message.content;
    }
}

chatbot = new ChatGPT(process.env.OPENAI_SECRET_KEY);

let exampleFlashCard = {
    question: "What is the capital of France?",
    answer: "Paris",
    tags: ["geography", "Europe"],
    difficulty: 2,
    collection: "World Geography"
};
// TODO: function "flashCardGenerator": interface with ChatGPT chatbot class to generate flash cards from text
// It should take a string and returns an array of flash cards
// parameters:
// - text: a string to generate flash cards from, maximum length 16,384 characters
// returns:
// - an array of flash cards


// TODO: function "wrongAnswerGenerator": creates wrong answers for cards for use in multiple choice questions
// It should take a card and return an array of wrong answers
// parameters:
// - card: a flash card object
// - numberOfAnswers: the number of wrong answers to generate
// returns:
// - an array of strings that are wrong answers for the card


// TODO: class "FlashCard"
// each flash card will have the following properties:
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


// TODO: make a class that implements the flash card database. It should have methods for getting, adding, updating, and deleting cards.
// Flash cards should be stored on disk as JSON file(s). The class should load the flash cards from disk into memory when it is created.
// Whenever a card is added, updated, or deleted, the class should save the flash cards to disk.
//
// class properties:
// - cards: an array of flash cards (or another data structure of your choice)
// - largestId: the largest id number used so far
// 
// METHODS:
//
// loadCards() - loads the flash cards from flashcards.json into memory. This should be called when the class is created and keep track of the largest id number used so far.
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
        // TODO: implement this
        // call the flashCardGenerator function and send the generated cards
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
    // call the wrongAnswerGenerator function and send the generated wrong answers
    res.send({ answers: [] });
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
    // TODO: implement this
    res.send({ count: 0 });
});

// endpoint: /api/getGPTenabled
// Type: GET
// sends a JSON object with the value of apiKeyFound
app.get('/api/getGPTenabled', (req, res) => {
    res.send({ enabled: chatbot.apiKeyFound });
});

// endpoint: /api/setGPTapiKey
// Type: POST
// receives a JSON object with the API key and sets it in ChatGPT class
app.post('/api/setGPTapiKey', (req, res) => {
    req.on('data', (data) => {
        const apiKey = JSON.parse(data).apiKey;
        if(isValidOpenAIKey(apiKey)){
            chatbot.setApiKey(apiKey);
            writeApiKeyToFile(apiKey);            
            res.send({ status: 'ok' });
        }else{
            res.send({ status: 'invalid' });
        }
    });
});

// Serve static files
app.get('/', (req, res) => {
    // forward to /web/
    res.redirect('/web/index.html');
});
app.use('/web',express.static(adjustPathForPKG('web')));

// 404
app.use((req, res, next) => {
    res.status(404).sendFile(__dirname + '/web/404.html');
});

// Get the local IP addresses of the computer
let interfaces = require('os').networkInterfaces();
let addresses = [];
for(let k in interfaces){
    for(let k2 in interfaces[k]){
        let address = interfaces[k][k2];
        if(address.family === 'IPv4' && !address.internal){
            addresses.push(address.address);
        }
    }
}

app.listen(port, () => {
    console.log(`If you are using a web browser on the same computer as the app, you can use the following address:`)
    console.log(`http://localhost:${port}`)
    console.log(`If you are using a web browser on a different computer on the same network, you can try the following addresses:`)
    addresses.forEach((address)=>{
        console.log(`http://${address}:${port}`);
    });
});

// This function is used to adjust the path when running the app as a standalone executable
function adjustPathForPKG(filePath){
    if(process.pkg){
        return path.join(path.dirname(process.cwd()),filePath);
    }
    return filePath;
}

function isValidOpenAIKey(key) {
    if(typeof key !== 'string') return false;
    // Regex explanation:
    // ^sk- : Starts with "sk-"
    // [a-zA-Z0-9]{54} : Followed by 54 alphanumeric characters (total length becomes 57 characters including "sk-")
    const regex = /^sk-[a-zA-Z0-9]{54}$/;
    return regex.test(key);
}

function writeApiKeyToFile(key) {
    const fs = require('fs');
    fs.writeFileSync(adjustPathForPKG('.env'), `OPENAI_SECRET_KEY=${key}`);
}

// Open the default web browser to the app
const browse = require("browse-url")('http://localhost:3000/');
