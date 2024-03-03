// const os = require('node:os');
const express = require('express');
const http = require('http');
const _url = require("url");
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = 3000;
const path = require('path');
const commonClasses = require('./web/common.js');
const FlashCard = commonClasses.FlashCard;

// this loads the API key from the .env file. 
// For development, you should create a .env file in the root directory of the project and add the following line to it:
// OPENAI_SECRET_KEY=your-api-key
require("dotenv").config();
//////////////////////////////////////////////////////////////////// Logging //////////////////////////////////////////////////////////////////////////////////////////
const consoleLogging = true;
// const logFile = 'logs.txt';
// logLevel, 0-5 or "off", "info", "warn", "error", "debug", "trace"
const logLevel = process.env.LOG_LEVEL;
const {Logger,logLevels} = require('./logger.js');
let logLevelNumber = logLevels.indexOf(logLevel);
const logger = logLevelNumber>0?new Logger(consoleLogging, logLevel):null; // create a new logger object. This must remain at/near the top of the file. If the logger is off, the logger object will be null and no logs will be created.
///////////////////////////////////////////////////////////////////// ChatGPT /////////////////////////////////////////////////////////////////////////////////////////
const ChatGPT = require('./chatGPT.js');
const chatbot = new ChatGPT(logger, process.env.OPENAI_SECRET_KEY);
//////////////////////////////////////////////////////////////// FlashCardDatabase ////////////////////////////////////////////////////////////////////////////////////
const FlashCardDatabase = require('./database.js');
const flashcard_db = new FlashCardDatabase(logger);
//////////////////////////////////////////////////////////////// Server endpoints /////////////////////////////////////////////////////////////////////////////////////

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
    logger?.log("GET /api/getCards", "debug");
    let requestParams = req.query;
    if (requestParams.numberOfCards === undefined) requestParams.numberOfCards = 10;
    if (requestParams.offset === undefined) requestParams.offset = 0;
    if (requestParams.collection === undefined) requestParams.collection = null;
    if (requestParams.tags === undefined) requestParams.tags = null;
    if (requestParams.difficulty === undefined) requestParams.difficulty = null;
    if (requestParams.search === undefined) requestParams.search = null;
    if (requestParams.dateCreatedRange === undefined) requestParams.dateCreatedRange = null;
    if (requestParams.dateModifiedRange === undefined) requestParams.dateModifiedRange = null;
    let cards = flashcard_db.getCards(requestParams);
    let offset = requestParams.offset;
    let numberOfCards = requestParams.numberOfCards;
    cards = cards.slice(offset, offset + numberOfCards);
    res.send({ cards: cards, count: flashcard_db.getCountOfCards(requestParams), total: flashcard_db.getCountOfAllCards() });
});

// endpoint: /api/getCollections
// Type: GET
// sends a JSON object with the names of the collections
app.get('/api/getCollections', (req, res) => {
    logger?.log("GET /api/getCollections", "debug");
    // get the collection names from the flash card database class
    let collectionNames = flashcard_db.getCollectionNames();
    res.send({ collections: collectionNames });
});

// endpoint: /api/saveNewCards
// Type: POST
// receives a JSON object with the card data and saves it to the database
app.post('/api/saveNewCards', (req, res) => {
    logger?.log("POST /api/saveNewCards", "debug");
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        logger?.log("Saving new flash card: \n" + JSON.stringify(cardData, 2, null), "debug");
        if(!Array.isArray(cardData)){
            res.send({ status: 'error', reason: 'Invalid data. Expected an array of cards.'});
            logger?.log("Invalid card data", "error");
            return;
        }
        logger?.log("Number of cards being saved: " + cardData.length, "trace");
        let success = true;
        for(let i = 0; i < cardData.length; i++){
            let card = new FlashCard(cardData[i]);
            if (!flashcard_db.addCard(card)) {
                success = false;
                logger?.log("Error saving card: " + JSON.stringify(cardData[i], 2, null), "error");
            }
        }
        if(success){
            res.send({ status: 'ok' });
        }else{
            res.send({ status: 'error', reason: 'error saving card' });
        }
    });
});

// endpoint: /api/deleteCard
// Type: POST
// receives a JSON object with the card data and deletes it from the database
app.post('/api/deleteCard', (req, res) => {
    logger?.log("POST /api/deleteCard", "debug");
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        // find the card in the database and delete it
        const id = parseInt(cardData.id);
        logger?.log("Deleting flash card with id: " + id, "trace");
        if(Number.isNaN(id) || id < 0){
            logger?.log("Invalid card id", "error");
            res.send({ status: 'error', reason: 'invalid id'});
            return;
        }
        const card = flashcard_db.getCardById(cardData.id);
        if(card === null || card === undefined){
            res.send({ status: 'error', reason: 'card not found'});
            logger?.log("Card not found", "error");
            return;
        }
        const success = flashcard_db.deleteCard(id);
        logger?.log("Card deleted: " + success, "debug");
        res.send({ status: 'ok', card: card, success: success});
    });
});

// endpoint: /api/updateCard
// Type: POST
// receives a JSON object with the card data and updates it in the database. The id property is required.
// The other properties are optional and only the ones that are given will be updated.
// This endpoint is useful for updating the timesStudied, timesCorrect, timesIncorrect, timesSkipped, and timesFlagged properties.
app.post('/api/updateCard', (req, res) => {
    logger?.log("POST /api/updateCard", "debug");
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        const id = parseInt(cardData.id);
        logger?.log("Updating flash card with id: " + id, "trace");
        if(Number.isNaN(id) || id < 0){
            res.send({ status: 'error', reason: 'invalid id'});
            logger?.log("Invalid card id", "error");
            return;
        }
        const oldCard = flashcard_db.getCardById(cardData.id);
        if(card === null || card === undefined){
            res.send({ status: 'error', reason: 'card not found'});
            logger?.log("Card not found", "error");
            return;
        }
        const success = flashcard_db.updateCard(cardData);
        const newCard = flashcard_db.getCardById(cardData.id);
        logger?.log("Card updated: " + success, "debug");
        logger?.log("Old card: " + JSON.stringify(oldCard, 2, null), "trace");
        logger?.log("New card: " + JSON.stringify(newCard, 2, null), "trace");
        res.send({ status: 'ok', oldCard: oldCard, newCard: newCard, success: success});
    });
});

// endpoint: /api/generateCards
// Type: POST
// receives a string and generates flash cards from it
app.post('/api/generateCards', (req, res) => {
    logger?.log("POST /api/generateCards", "debug");
    req.on('data', async (data) => {
        const dataObj = JSON.parse(data);
        if (dataObj.text === undefined) res.send({ status: 'error', reason: 'text property not found'});
        else if (dataObj.text === '') res.send({ status: 'empty' });
        else {
            let text = dataObj.text;
            let numberOfCards = dataObj.numberOfCards;
            let difficulty = dataObj.difficulty;
            let cards = await chatbot.flashCardGenerator(text, numberOfCards, difficulty, () => {
                ioServer?.emit('message', {type:'cardGeneratorUpdate', data: {status: 'working'}});
            }, true);
            res.send({ cards: cards, status: 'ok' });
        }
    });
});

// endpoint: /api/getWrongAnswers
// Type: GET
// sends a JSON object with the wrong answers for a given card
// query parameters:
// - cardId: the id of the card to get wrong answers for
// - numberOfAnswers: the number of wrong answers to get
app.get('/api/getWrongAnswers', async (req, res) => {
    logger?.log("GET /api/getWrongAnswers", "debug");
    const requestParams = req.query;
    // call the wrongAnswerGenerator function and send the generated wrong answers
    const numberOfAnswers = requestParams.numberOfAnswers;
    const cardId = requestParams.cardId;
    const card = flashcard_db.getCardById(cardId);
    if (card !== null && card !== undefined) {
        let chatRes;
        try {
            chatRes = await chatbot.wrongAnswerGenerator(card, numberOfAnswers, () => { });
        } catch (err) {
            logger?.log("Error generating wrong answers: " + err, "error");
            res.send({ answers: [] });
        }
        res.send({ answers: chatRes });
    } else {
        res.send({ answers: [] });
    }
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
    logger?.log("GET /api/getCardCount", "debug");
    const requestParams = req.query;
    if (requestParams.collection === undefined) requestParams.collection = null;
    if (requestParams.tags === undefined) requestParams.tags = null;
    if (requestParams.difficulty === undefined) requestParams.difficulty = null;
    if (requestParams.search === undefined) requestParams.search = null;
    if (requestParams.dateCreatedRange === undefined) requestParams.dateCreatedRange = null;
    if (requestParams.dateModifiedRange === undefined) requestParams.dateModifiedRange = null;
    let count = flashcard_db.getCountOfCards(requestParams);
    logger?.log("Returning count: " + count, "debug");
    res.send({ count: count });
});

// endpoint: /api/tagMatch
// Type: GET
// sends a JSON object with the tags that match the given tag/partial tag
// query parameters:
// - tag: the tag or partial tag to match
app.get('/api/tagMatch', (req, res) => {
    logger?.log("GET /api/tagMatch", "debug");
    logger?.log("Query: " + JSON.stringify(req.query), "trace");
    const tag = req.query.tag;
    if (typeof tag !== 'string') {
        logger?.log("Invalid tag: " + tag, "error");
        res.send({ tags: [] });
    }
    let tagsMatchFuzzy = flashcard_db.tagMatchFuzzy(tag);
    let tagsMatchFirstChars = flashcard_db.tagMatchFirstChars(tag);
    let tagsExistExact = flashcard_db.tagExistsExact(tag);
    let tagsExistFuzzy = flashcard_db.tagExistsFuzzy(tag);
    res.send({ tagsMatchFuzzy: tagsMatchFuzzy, tagsMatchFirstChars: tagsMatchFirstChars, tagsExistExact: tagsExistExact, tagsExistFuzzy: tagsExistFuzzy });
});


// endpoint: /api/getGPTenabled
// Type: GET
// sends a JSON object with the value of apiKeyFound
app.get('/api/getGPTenabled', (req, res) => {
    logger?.log("GET /api/getGPTenabled", "debug");
    res.send({ enabled: chatbot.apiKeyFound });
});

// endpoint: /api/setGPTapiKey
// Type: POST
// receives a JSON object with the API key and sets it in ChatGPT class
app.post('/api/setGPTapiKey', (req, res) => {
    logger?.log("POST /api/setGPTapiKey", "debug");
    req.on('data', (data) => {
        const apiKey = JSON.parse(data).apiKey;
        logger?.log("Setting OpenAI API key, " + apiKey, "debug");
        if (chatbot.isValidOpenAIKey(apiKey)) {
            chatbot.setApiKey(apiKey);
            updateEnvFile('OPENAI_SECRET_KEY', apiKey);
            res.send({ status: 'ok' });
        } else {
            res.send({ status: 'invalid' });
        }
    });
});

// endpoint: /api/addLogEntry
// Type: POST
// receives a JSON object with the log entry and adds it to the logs
app.post('/api/addLogEntry', (req, res) => {
    logger?.log("POST /api/addLogEntry", "debug");
    req.on('data', (data) => {
        const logEntry = JSON.parse(data);
        logger?.log(logEntry.message, logEntry.level);
        res.send({ status: 'ok' });
    });
});

// endpoint: /api/setLogLevel
// Type: POST
// receives a JSON object with the log level and sets it in the logger
app.post('/api/setLogLevel', (req, res) => {
    logger?.log("POST /api/setLogLevel", "debug");
    req.on('data', (data) => {
        let logLevel = null;
        const dataObj = JSON.parse(data);
        if(dataObj.hasOwnProperty('logLevel')) logLevel = dataObj.logLevel;
        else if(dataObj.hasOwnProperty('level')) logLevel = dataObj.level;
        if(logLevel === null){
            res.send({ status: 'error', reason: 'log level not found' });
            logger?.log("Log level not found in request data", "error");
            return;
        }
        logger?.log("Attempting to set log level to " + logLevel, "debug");
        let success = logger?.setLogLevel(logLevel);
        if (success){
            updateEnvFile('LOG_LEVEL', logLevel);
            res.send({ status: 'ok' });
            logger?.log("Log level set to " + logLevel, "debug");
        }else{
            res.send({ status: 'error', reason: 'invalid log level' });
            logger?.log("Error setting log level to " + logLevel, "error");
        }
    });
});

app.get('/web/404.html', (req, res) => {
    logger?.log("GET /web/404.html", "debug");
    res.sendFile(__dirname + '/web/404.html');
});

// Serve static files
app.get('/', (req, res) => {
    logger?.log("GET /", "debug");
    // forward to /web/
    res.redirect('/web/index.html');
});
app.use('/web', express.static(adjustPathForPKG('web')));

// 404
app.use((req, res, next) => {
    logger?.log("404 - " + req.originalUrl, "warn");
    res.status(404).redirect(`/web/404.html?originalUrl=${req.originalUrl}`);
});

var ioServer = null;
var connectedCount = 0;
io.on('connection', (socket) => {
    ioServer = socket;
    connectedCount++;
    logger?.log('A user connected', "debug");
    socket.on('disconnect', () => {
        connectedCount--;
        if(connectedCount === 0) ioServer = null;
        logger?.log('User disconnected', "debug");
    });
    socket.on('message', (msg) => {
        logger?.log('Message: ' + msg, "debug");
    });
});



// Get the local IP addresses of the computer
let interfaces = require('os').networkInterfaces();
let addresses = [];
for (let k in interfaces) {
    for (let k2 in interfaces[k]) {
        let address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}

server.listen(port, () => {
    // logger?.log(`If you are using a web browser on the same computer as the app, you can use the following address:`)
    // logger?.log(`http://localhost:${port}`)
    logger?.log(`If you are using a web browser on a different computer on the same network, you can try the following addresses:`)
    addresses.forEach((address) => {
        logger?.log(`http://${address}:${port}`);
    });
});



////////////////////////////////////////////////////////////////////////////////////////////
/// Support functions
////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @function adjustPathForPKG
 * @description - adjusts the path when running the app as a standalone executable
 * @param {string} filePath - the file path to adjust
 * @returns {string} - the adjusted file path
 * @throws - nothing
 * @sideEffects - nothing
 * @notes - this function is used to adjust the path when running the app as a standalone executable
 * @notes - it is necessary because when the app is run as a standalone executable, the current working directory is different
 */
function adjustPathForPKG(filePath) {
    if (process.pkg) {
        return path.join(path.dirname(process.cwd()), filePath);
    }
    return filePath;
}

/**
 * @function updateEnvFile
 * @description - updates the .env file with the given key / value pair
 * @param {string} key - the key to update
 * @param {string} value - the value to set
 * @returns {boolean} - true if the key / value pair was updated, false otherwise
 * @throws - nothing
 * @notes - this function updates the .env file with the given key / value pair
 * @notes - if the key does not exist, it is added
 * @notes - if the key exists, its value is updated
 */
function updateEnvFile(key, value) {
    logger?.log("Updating .env file", "debug");
    if (typeof key !== 'string' || typeof value !== 'string') return false;
    const fs = require('fs');
    const path = adjustPathForPKG('.env');
    logger?.log("Path: " + path, "trace");
    let fileContents = "";
    if (fs.existsSync(path)) {
        fileContents = fs.readFileSync(path, 'utf8');
        logger?.log("File read", "trace");
    }
    let lines = fileContents.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        logger?.log("Line " + i + ": " + lines[i], "trace");
        if (lines[i].indexOf(key) === 0) {
            logger?.log("Key found", "trace");
            lines[i] = key + (typeof value == "string" ? "=\"" : "=") + value + (typeof value == "string" ? "\"" : "");
            found = true;
            break;
        }
    }
    if (!found) {
        lines.push(key + (typeof value == "string" ? "=\"" : "=") + value + (typeof value == "string" ? "\"" : ""));
    }
    fileContents = lines.join('\n');
    try {
        fs.writeFileSync(path, fileContents);
        logger?.log("File written", "trace");
        return true;
    } catch (e) {
        logger?.error(e);
        return false;
    }
}

(() => {
    // Open the default web browser to the app
    logger?.log("Opening the default web browser to the app", "info");
    let child_process = require("child_process");
    function browseURL(url) {
        logger?.log("Browsing URL: " + url, "debug");
        var validatePath = isValidateUrl(url);
        logger?.log("Is URL valid: " + validatePath, "debug");
        if (!validatePath) { return null; }
        logger?.log("Process platform: " + process.platform, "debug");
        var start = (process.platform == "darwin" ? "open" : process.platform == "win32" ? "start" : "xdg-open");
        logger?.log("Start command: " + start, "trace");
        var childProcess = child_process.exec(start + " " + validatePath, function (err) {
            if (err) { console.error("\r\n", err); }
        });
        return childProcess;

    }
    function isValidateUrl(url) {
        let strPath = _url.toString(url);
        logger?.log("URL: " + strPath, "trace");
        try { strPath = decodeURI(strPath); } catch (err) { return false; }
        if (strPath.indexOf('\0') !== -1) { return false; }
        if (strPath.indexOf('..') !== -1) { return false; }
        if (strPath.indexOf('/.') !== -1) { return false; }
        if (strPath.indexOf('\\.') !== -1) { return false; }
        if (strPath === '/') { return url; }
        strPath = path.normalize(strPath);
        if (strPath.indexOf('\\.') !== -1) { return false; }
        return url;
    }
    browseURL('http://localhost:3000/');
})();

// When the app is closed, finalize the logger
const EXIT = () => {
    logger?.log("Saving FlashCards...", "info");
    flashcard_db.saveCollections();
    logger?.log("Exiting...", "info");
    logger?.finalize();
    process.exit();
}

// Catch all the ways the program can exit
process.on('SIGINT', EXIT);
process.on('SIGTERM', EXIT);
process.on('uncaughtException', EXIT);
process.on('SIGHUP', EXIT);
process.on('exit', () => {});