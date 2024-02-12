const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const ai = require("openai");

const flashCardMaxDifficulty = 5;

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
        console.log("Setting OpenAI API key to: " + key);
        this.apiKeyFound = isValidOpenAIKey(key);
        console.log("API key is valid: " + this.apiKeyFound);
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

// TODO: function "flashCardGenerator": interface with ChatGPT chatbot class to generate flash cards from text
// It should take a string and returns an array of flash cards
// parameters:
// - text: a string to generate flash cards from, maximum length 16,384 characters
// returns:
// - an array of flash cards


// function "wrongAnswerGenerator": creates wrong answers for cards for use in multiple choice questions
// It should take a card and return an array of wrong answers
// As an synchronous function, be sure to use the "await" keyword when calling it
// parameters:
// - card: a flash card object
// - numberOfAnswers: the number of wrong answers to generate
// returns:
// - an array of strings that are wrong answers for the card
async function wrongAnswerGenerator(card, numberOfAnswers){
    let prompt = "Please generate " + numberOfAnswers + " wrong answers for the following flash card: \n";
    prompt += "Card front: " + card.question + "\nCorrect answer: " + card.answer + "\n";
    prompt += "Flash Card Tags: " + card.tags.join(", ") + "\n";
    prompt += "Flash Card Collection: " + card.collection + "\n";
    prompt += "Flash Card Difficulty: " + card.difficulty + " of " + flashCardMaxDifficulty + "\n";
    prompt += "Return the wrong answers as a JSON array of strings.";
    let response = await chatbot.generateResponse(prompt);
    return parseGPTjsonResponse(response);
}

// class "FlashCard"
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
class FlashCard {
    constructor(data) {
        if(data === undefined || data === null) throw new Error("FlashCard constructor requires an object as an argument");
        if(data.id === undefined || data.id === null) throw new Error("FlashCard constructor requires an id property in the object");
        this.id = data.id;
        if(data.question === undefined || data.question === null) throw new Error("FlashCard constructor requires a question property in the object");
        this.question = data.question;
        if(data.answer === undefined || data.answer === null) throw new Error("FlashCard constructor requires an answer property in the object");
        this.answer = data.answer;
        if(data.tags === undefined || data.tags === null) throw new Error("FlashCard constructor requires a tags property in the object");
        this.tags = data.tags;
        if(data.difficulty === undefined || data.difficulty === null) data.difficulty = 3;
        this.difficulty = data.difficulty;
        if(data.collection === undefined || data.collection === null) data.collection = "Uncategorized";
        this.collection = data.collection;
        if(data.dateCreated === undefined || data.dateCreated === null) data.dateCreated = new Date();
        this.dateCreated = data.dateCreated;
        if(data.dateModified === undefined || data.dateModified === null) data.dateModified = new Date();
        this.dateModified = data.dateModified;
        if(data.dateLastStudied === undefined || data.dateLastStudied === null) data.dateLastStudied = "";
        this.dateLastStudied = data.dateLastStudied;
        if(data.timesStudied === undefined || data.timesStudied === null) data.timesStudied = 0;
        this.timesStudied = data.timesStudied;
        if(data.timesCorrect === undefined || data.timesCorrect === null) data.timesCorrect = 0;
        this.timesCorrect = data.timesCorrect;
        if(data.timesIncorrect === undefined || data.timesIncorrect === null) data.timesIncorrect = 0;
        this.timesIncorrect = data.timesIncorrect;
        if(data.timesSkipped === undefined || data.timesSkipped === null) data.timesSkipped = 0;
        this.timesSkipped = data.timesSkipped;
        if(data.timesFlagged === undefined || data.timesFlagged === null) data.timesFlagged = 0;
        this.timesFlagged = data.timesFlagged;
    }
}

let testCard = new FlashCard({
    id: 0,
    question: "What is the capital of France?",
    answer: "Paris",
    tags: ["geography", "Europe"],
    difficulty: 2,
    collection: "World Geography"
});


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
// loadCards() - loads the flash cards from flashcards.json into memory. 
// This should be called when the class is created and keep track of the largest id number used so far.
// This should make sure that the file exists and has valid JSON data before trying to load it.
// Part of loading the cards will be to track the largest id number used so far.
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
// receives a JSON object with the card data and updates it in the database. The id property is required.
// The other properties are optional and only the ones that are given will be updated.
// This endpoint is useful for updating the timesStudied, timesCorrect, timesIncorrect, timesSkipped, and timesFlagged properties.
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


////////////////////////////////////////////////////////////////////////////////////////////
/// Helper functions
////////////////////////////////////////////////////////////////////////////////////////////


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
    const regex = /sk-[a-zA-Z0-9]{48}/g;
    return regex.test(key);
}

function writeApiKeyToFile(key) {
    const fs = require('fs');
    fs.writeFileSync(adjustPathForPKG('.env'), `OPENAI_SECRET_KEY=${key}`);
}

function parseGPTjsonResponse(response){
    if(response === undefined || response === null) return null;
    if(typeof response !== 'string') return response;
    if(response === "") return null;
    if(response.indexOf("```") === 0) response = response.substring(response.indexOf('\n')+1);
    if(response.indexOf("```") > 0) response = response.substring(0,response.lastIndexOf('\n'));
    try{
        let json = JSON.parse(response);
        return json;
    }catch(e){
        console.error(e);
        return response;
    }
}

// wait x seconds
function wait(seconds){
    return new Promise(resolve => setTimeout(resolve, seconds*1000));
}

// Open the default web browser to the app
const browse = require("browse-url")('http://localhost:3000/');
