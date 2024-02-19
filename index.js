const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const ai = require("openai");
const fs = require('fs');

const commonClasses = require('./web/common.js');
const FlashCard = commonClasses.FlashCard;

const flashCardMaxDifficulty = 5; // Flash card difficulty is a number from 1 to 5

const consoleLogging = true;
const logFile = 'logs.txt';
// logLevel, 0-5 or "off", "info", "warn", "error", "debug", "trace"
const logLevel = 1; // "info"
const logLevels = ["off", "info", "warn", "error", "debug", "trace"];
/**
 * "off" - no logging
 * "info" - logs info messages that should be shown all the time
 * "warn" - logs info and warning messages
 * "error" - logs info, warning, and error messages
 * "debug" - logs info, warning, error, and debug messages
 * "trace" - logs everything, including trace messages. this is the most verbose level.
 */


// this loads the API key from the .env file. 
// For development, you should create a .env file in the root directory of the project and add the following line to it:
// OPENAI_SECRET_KEY=your-api-key
require("dotenv").config();

/**
 * @class Logger
 * @description - a class to log messages to the console and to a file
 * @param {boolean} con - a boolean to indicate if console logging is enabled
 * @property {Array} logs - an array of log entries
 * @property {boolean} consoleLogging - a boolean to indicate if console logging is enabled
 * @method log - a method to log a message
 * @method writeOutLogs - a method to write out the logs to a file
 * @method finalize - a method to write out the logs to a file when the object is destroyed
 * @notes - Because this is used for logging, this class must remain at the top of the file, and the logger object must be created before any other objects are created.
 */
class Logger {
    constructor(con = true, logLevel = 1) {
        if(typeof con !== 'boolean') con = true;
        if(typeof logLevel === 'string') logLevel = logLevels.indexOf(logLevel);
        if(typeof logLevel !== 'number') logLevel = 1;
        this.logs = [];
        this.consoleLogging = con;
        this.logLevel = logLevel;
    }

    /**
     * @method log
     * @description - logs a message
     * @param {string} message - the message to log
     * @param {string} level - the log level, one of "info", "warn", "error", "debug", "trace"
     * @returns - nothing
     * @throws - nothing
     * @sideEffects - adds a log entry to the logs array
     * @sideEffects - writes out the logs to a file if the logs array has 10 or more entries
     * @sideEffects - writes out the logs to the console if consoleLogging is true
     */
    log(message, level = "info") {
        if(typeof level === 'string') level = logLevels.indexOf(level); // convert level to a number
        if(level > this.logLevel) return; // if the level is higher than the log level, don't log the message
        if(this.logLevel === 0) return; // if the log level is 0, don't log the message (this is the "off" level)
        let newEntry = { date: new Date().toLocaleString(), message: message }; // create a new log entry
        this.logs.push(newEntry); // add the new log entry to the logs array
        if (this.consoleLogging) console.log(newEntry.date + " - " + newEntry.message); // log the message to the console
        if(this.logs.length >= 10) this.writeOutLogs(); // write out the logs to a file if there are 10 or more entries
    }

    /**
     * @method writeOutLogs
     * @description - writes out the logs to a file
     * @returns - nothing
     * @throws - nothing
     * @sideEffects - writes out the logs to a file
     * @sideEffects - clears the logs array
     * @sideEffects - writes a message to the logs array if there is an error writing out the logs
     * @sideEffects - writes a message to the console if there is an error writing out the logs
     */
    writeOutLogs() {
        let localLogs = this.logs;
        this.logs = [];
        let logString = "";
        localLogs.forEach((entry) => {
            logString += entry.date + " - " + entry.message + "\n";
        });
        fs.appendFile('logs.txt', logString, (err) => {
            if (err) {
                console.error(err);
                let tempLog = this.logs;
                this.logs = localLogs.concat(tempLog);
                this.logs.push({ date: new Date().toLocaleString(), message: "Failed to write logs to file" });
            }else{
                if(this.consoleLogging) console.log("Logs written to file");
                let logFile = fs.readFileSync('logs.txt', 'utf8');
                let logLines = logFile.split('\n');
                if(logLines.length > 10000) {
                    fs.writeFileSync('logs.txt', logLines.slice(logLines.length - 10000).join('\n'));
                }
            }
        }); 
    }
    
    /**
     * @method finalize
     * @description - writes out the logs to a file when the object is destroyed
     * @returns - nothing
     * @throws - nothing
     * @sideEffects - writes out the logs to a file
     */
    finalize() {
        let logString = "";
        this.logs.forEach((entry) => {
            logString += entry.date + " - " + entry.message + "\n";
        });
        fs.appendFileSync('logs.txt', logString, (err) => {
            if (err) {
                console.error(err);
            }
        }); 
    }
}

const logger = new Logger(consoleLogging, logLevel); // create a new logger object. This must remain at the top of the file.

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @class ChatGPT
 * @description - a class to interface with OpenAI's GPT-4 chatbot
 * @param {string} key - the OpenAI API key
 * @property {boolean} apiKeyFound - a boolean to indicate if the API key is valid
 * @property {Object} openai - an instance of the OpenAI API
 * @method setApiKey - a method to set the API key
 * @method generateResponse - a method to generate a response from the chatbot
 * 
 * TODO: 
 * 1. Need to add a mechanism that interrupts the streaming results.
 */
class ChatGPT {
    constructor(key) {
        this.openai = null;
        this.setApiKey(key);
    }

    /**
     * @method setApiKey
     * @description - sets the API key
     * @param {string} key - the OpenAI API key
     * @returns - nothing
     * @throws - nothing
     * @sideEffects - sets the apiKeyFound property to true if the key is valid
     * @sideEffects - sets the openai property to an instance of the OpenAI API if the key is valid
     */
    setApiKey(key) {
        this.apiKeyFound = isValidOpenAIKey(key);
        if (this.apiKeyFound) {
            logger.log("OpenAI API key found", "warn");
            this.openai = new ai.OpenAI({ apiKey: key });
        }else{
            logger.log("OpenAI API key not found", "warn");
        }
    }

    /**
     * @method generateResponse
     * @description - generates a response from the chatbot
     * @async - this method is asynchronous and can be used with the "await" keyword
     * @param {string} inputText - the text to generate a response from
     * @param {boolean} stream_enabled - a boolean to enable streaming
     * @param {Function} stream_cb - a callback function to receive streaming data from the chatbot
     * @param {Function} completion_cb - a callback function to receive the completion response from the chatbot
     * @returns {string} - the response from the chatbot
     * @throws - nothing
     * @sideEffects - calls the stream_cb function with streaming data from the chatbot
     * @sideEffects - calls the completion_cb function with the completion response from the chatbot
     */
    async generateResponse(inputText, stream_enabled, stream_cb, completion_cb) {
        if (!this.apiKeyFound) {
            logger.log("OpenAI API key not found", "error");
            return null;
        }
        if (stream_enabled) {
            if (typeof stream_cb !== 'function') stream_cb = (chunk) => logger.log(chunk);
            if (typeof completion_cb !== 'function') completion_cb = (response) => logger.log(response);
            let response = "";
            const stream = await this.openai?.chat.completions.create({
                model: 'gpt-4-0125-preview',
                messages: [{ role: 'assistant', content: inputText }],
                stream: true,
            });
            for await (const chunk of stream) {
                stream_cb(chunk.choices[0]?.delta?.content || '');
                response += chunk.choices[0]?.delta?.content || '';
            }
            completion_cb(response);
        } else {
            const chatCompletion = await this.openai?.chat.completions.create({
                messages: [{ role: 'assistant', content: inputText }],
                model: 'gpt-4-0125-preview',
            });
            return chatCompletion.choices[0]?.message?.content || "";
        }
    }
}

chatbot = new ChatGPT(process.env.OPENAI_SECRET_KEY);


/**
 * @function flashCardGenerator
 * @description - generates flash cards from text
 * @async - this function is asynchronous and should be used with the "await" keyword
 * @param {string} text - the text to generate flash cards from, maximum length 16,384 characters
 * @param {number} numberOfCardsToGenerate - the number of flash cards to generate
 * @param {Function} streamingData_cb - a callback function to receive streaming data from the chatbot. If not given, it will default to a function that logs the data to the console. Useful for showing progress to the user.
 * @param {boolean} enableExtrapolation - a boolean to enable the chatbot to extrapolate from the given text
 * @returns {Array} - an array of flash cards
 */
async function flashCardGenerator(text, numberOfCardsToGenerate, streamingData_cb, enableExtrapolation = false) {
    // TODO: rework this to return a promise instead of using async / await
    if (text === undefined || text === null) {
        logger.log("flashCardGenerator requires a string as an argument", "error");
        return null;
    }
    if (typeof text !== 'string') {
        logger.log("flashCardGenerator requires a string as an argument", "error");
        return null;
    }
    if (text.length > 16384) {
        logger.log("The text is too long. Maximum length is 16,384 characters", "error");
        return null;
    }
    if(typeof streamingData_cb !== 'function') {
        logger.log("streamingData_cb is not a function. Using default streaming data callback", "warn");
        streamingData_cb = (chunk) => process.stdout.write(chunk);
    }
    let prompt = "Please generate " + numberOfCardsToGenerate + " flash cards (based on the text below) with concise answers, returning the data in JSON format following the schema ";
    prompt += "{\"question\":\"the flash card question\",\"answer\":\"the flash card answer\",\"tags\":[\"tag1\",\"tag2\"],\"difficulty\":N,\"collection\":\"The broad category the card belong to such as world geography\"} (difficulty is a number from 1 to " + flashCardMaxDifficulty + ").";
    prompt += " all based on the following text (it is important that the flash cards be based on the following text)" + (enableExtrapolation?", extrapolating on the given text to generate the desired number of cards":"") + ": \n" + text;
    let response = "";
    logger.log("Generating flash cards from text...\n");
    await chatbot.generateResponse(prompt, true, streamingData_cb, (res)=>{response = res;});
    return parseGPTjsonResponse(response);
}


/**
 * @function wrongAnswerGenerator
 * @description - creates wrong answers for cards for use in multiple choice questions
 * @async - this function is asynchronous and should be used with the "await" keyword
 * @param {FlashCard} card - the flash card to generate wrong answers for
 * @param {number} numberOfAnswers - the number of wrong answers to generate
 * @param {Function} streamingData_cb - a callback function to receive streaming data from the chatbot. If not given, it will default to a function that logs the data to the console. Useful for showing progress to the user.
 * @returns {Array} - an array of strings that are wrong answers for the card
 * @throws {Error} - if the card is not given
 */
async function wrongAnswerGenerator(card, numberOfAnswers, streamingData_cb) {
    // TODO: rework this to return a promise instead of using async / await
    if (card === undefined || card === null) {
        logger.log("wrongAnswerGenerator requires a FlashCard object as an argument", "error");
        throw new Error("wrongAnswerGenerator requires a FlashCard object as an argument");
    }
    if(typeof streamingData_cb !== 'function') {
        logger.log("streamingData_cb is not a function. Using default streaming data callback", "warn");
        streamingData_cb = (chunk) => process.stdout.write(chunk);
    }
    let prompt = "Please generate " + numberOfAnswers + " wrong answers for the following flash card: \n";
    prompt += "Card front: " + card.question + "\nCorrect answer: " + card.answer + "\n";
    prompt += "Flash Card Tags: " + card.tags.join(", ") + "\n";
    prompt += "Flash Card Collection: " + card.collection + "\n";
    prompt += "Flash Card Difficulty: " + card.difficulty + " of " + flashCardMaxDifficulty + "\n";
    prompt += "Return the wrong answers as a JSON array of strings.";
    let response = "";
    logger.log("Generating wrong answers for flash card...\n");
    await chatbot.generateResponse(prompt, true, streamingData_cb, (res)=>{response = res;});
    return parseGPTjsonResponse(response);
}


//////////////////////////// TESTING ///////////////////////////////////
// FlashCard class provided by web/common.js
let testCard = new FlashCard({
    id: -Number.MAX_VALUE,
    question: "What is the capital of France?",
    answer: "Paris",
    tags: ["geography", "Europe"],
    difficulty: 2,
    collection: "World Geography"
});

(async () => {
    let testText = `
    Page 1: Introduction to Physics
    Physics is a captivating and fundamental science that seeks to understand the natural world. At its core, physics is the study of matter, energy, and the interactions between them. It is a discipline that strives to uncover the laws governing the universe, from the smallest particles to the vastness of the cosmos. Physics is divided into various branches, including mechanics, thermodynamics, electromagnetism, and quantum mechanics, each focusing on specific aspects of physical phenomena.
    The Essence of Physics
    The essence of physics lies in its quest to formulate universal principles that can explain the behavior of the natural world. It uses a combination of empirical evidence, mathematical models, and theoretical reasoning to understand the fundamental forces of nature, such as gravity, electromagnetism, and nuclear forces. Through this understanding, physics aims to uncover the underlying simplicity and symmetry in the universe.
    The Role of Experimentation and Theory
    Experimentation and theory are the twin pillars of physics. Experiments involve the observation of phenomena under controlled conditions, allowing physicists to test hypotheses and measure physical quantities. Theoretical physics, on the other hand, involves the development of models and frameworks to explain these observations and predict new phenomena. The interplay between theory and experiment drives the advancement of physics, with each informing and refining the other.
    Physics and Mathematics
    Mathematics is the language of physics. It provides the tools needed to formulate physical laws in a precise and concise manner. Equations in physics not only describe how physical quantities are related but also allow predictions about future behavior. For example, Newton's second law of motion, 
    F=ma, succinctly encapsulates the relationship between force, mass, and acceleration, enabling the prediction of an object's motion under the influence of forces.
    The Impact of Physics on Technology and Society
    The discoveries of physics have profound implications beyond the scientific community. Advances in physics have led to technological innovations that shape our daily lives, from the electricity that powers our homes to the electronics at the heart of our mobile devices. Physics also plays a crucial role in addressing global challenges, such as energy sustainability and climate change, by providing the foundation for renewable energy technologies and environmental monitoring.
    The Journey Through Physics
    As we embark on this journey through physics, we will explore the fundamental concepts that underpin this discipline. From the mechanics of motion to the principles of energy and heat, and from the forces that hold atoms together to the gravitational pull that governs the orbits of planets, this exploration will reveal the elegance and complexity of the physical world. Physics is not just a pathway to understanding the universe; it is a way of thinking critically about the world and our place within it.
    This introduction serves as the gateway to the fascinating world of physics, setting the stage for a deeper exploration of its principles, laws, and the myriad ways they manifest in the natural world.
    
    Page 2: Measurements and Units
    The foundation of physics, and indeed all of science, rests on the accurate measurement of physical quantities. These measurements allow us to understand the universe in quantifiable terms, leading to the formulation of physical laws and principles. The system of measurements used in physics is standardized to ensure consistency and accuracy across the scientific community.
    The International System of Units (SI)
    The International System of Units (SI) is the standard metric system used in science and engineering. It comprises seven base units from which all other units of measurement are derived. These base units are:
    Meter (m): The unit of length, defined by the speed of light in a vacuum.
    Kilogram (kg): The unit of mass, defined by the Planck constant
    Second (s): The unit of time, defined by the transition frequency of cesium-133 atoms.
    Ampere (A): The unit of electric current, defined by the elementary charge per second.
    Kelvin (K): The unit of temperature, defined by the Boltzmann constant.
    Mole (mol): The unit of the amount of substance, defined by the number of atoms in 12 grams of carbon-12.
    Candela (cd): The unit of luminous intensity, defined by the luminous efficacy of monochromatic radiation of frequency 
    Dimensional Analysis
    Dimensional analysis is a powerful tool in physics used to check the consistency of equations and calculations. It involves the study of the dimensions of physical quantities, which are derived from the base units. By ensuring that the dimensions match on both sides of an equation, physicists can verify that their equations are dimensionally consistent, which is a crucial step in validating physical laws and formulas.
    The Importance of Units in Calculations
    Units play a critical role in physics calculations. Every physical quantity is expressed with a unit, which provides a standard for comparison and ensures that calculations are meaningful. For instance, when calculating velocity, which is distance divided by time, the units of meters per second (m/s) provide a clear understanding of the speed at which an object is moving.
    The correct use of units also facilitates the conversion between different measurement systems, such as converting temperatures from Celsius to Kelvin or distances from miles to kilometers. This is essential for communication and collaboration in the global scientific community.
    Precision and Accuracy in Measurements
    Precision and accuracy are key concepts in the measurement of physical quantities. Precision refers to the consistency of repeated measurements, while accuracy indicates how close a measurement is to the true value. Both are affected by the measurement tools and techniques used, highlighting the importance of choosing appropriate instruments and methods for scientific investigations.
    Conclusion
    Measurements and units are the fundamental building blocks of physics, providing the means to quantify and understand the physical world. The SI system offers a universal standard for these measurements, ensuring that scientific observations and calculations are precise, accurate, and globally understood. As we delve deeper into the concepts of physics, the careful measurement and analysis of physical quantities will remain a cornerstone of our exploration.
    `;
    let res = await flashCardGenerator(testText, 5, true);
    // logger.log(res); // uncomment to see the generated flash cards
})();
/////////////////// END TESTING /////////////////////////////////



// TODO: make a class that implements the flash card database. It should have methods for getting, adding, updating, and deleting cards.
// Flash cards should be stored on disk as JSON file(s). Perhaps each collection should be saved to a separate file.
// The class should load the flash cards from disk into memory when it is created.
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
    logger.log("GET /api/getCards", "debug");
    // TODO: implement
    let requestParams = req.query; // if no query parameters are given, we should get all cards
    // we should validate the query parameters and set defaults of null or 0 if they are not given
    // let cards = get cards from the flash card database class using the above parameters
    res.send({ cards: [requestParams] });
});

// endpoint: /api/getCollections
// Type: GET
// sends a JSON object with the names of the collections
app.get('/api/getCollections', (req, res) => {
    logger.log("GET /api/getCollections", "debug");
    // TODO: implement
    // get the collection names from the flash card database class
    res.send({ collections: [{name:"test"}] });
});

// endpoint: /api/saveNewCards
// Type: POST
// receives a JSON object with the card data and saves it to the database
app.post('/api/saveNewCards', (req, res) => {
    logger.log("POST /api/saveNewCards", "debug");
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
    logger.log("POST /api/deleteCard", "debug");
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
    logger.log("POST /api/updateCard", "debug");
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
    logger.log("POST /api/generateCards", "debug");
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
    logger.log("GET /api/getWrongAnswers", "debug");
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
    logger.log("GET /api/getCardCount", "debug");
    const requestParams = req.query;
    // TODO: implement this
    res.send({ count: 0 });
});

// endpoint: /api/getGPTenabled
// Type: GET
// sends a JSON object with the value of apiKeyFound
app.get('/api/getGPTenabled', (req, res) => {
    logger.log("GET /api/getGPTenabled", "debug");
    res.send({ enabled: chatbot.apiKeyFound });
});

// endpoint: /api/setGPTapiKey
// Type: POST
// receives a JSON object with the API key and sets it in ChatGPT class
app.post('/api/setGPTapiKey', (req, res) => {
    logger.log("POST /api/setGPTapiKey", "debug");
    req.on('data', (data) => {
        const apiKey = JSON.parse(data).apiKey;
        logger.log("Setting OpenAI API key, " + apiKey, "debug");
        if (isValidOpenAIKey(apiKey)) {
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
    logger.log("POST /api/addLogEntry", "debug");
    req.on('data', (data) => {
        const logEntry = JSON.parse(data).logEntry;
        logger.log(logEntry);
        res.send({ status: 'ok' });
    });
});

// Serve static files
app.get('/', (req, res) => {
    logger.log("GET /", "debug");
    // forward to /web/
    res.redirect('/web/index.html');
});
app.use('/web', express.static(adjustPathForPKG('web')));

// 404
app.use((req, res, next) => {
    logger.log("404 - " + req.originalUrl, "warn");
    // Create and send a response with a cookie that contains the requested URL, the HTTP status code of 404, and the 404.html page
    res.cookie("originUrl", req.originalUrl).status(404).sendFile(`${__dirname}/web/404.html`);
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

app.listen(port, () => {
    logger.log(`If you are using a web browser on the same computer as the app, you can use the following address:`)
    logger.log(`http://localhost:${port}`)
    logger.log(`If you are using a web browser on a different computer on the same network, you can try the following addresses:`)
    addresses.forEach((address) => {
        logger.log(`http://${address}:${port}`);
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
 * @function isValidOpenAIKey
 * @description - checks if the given key is a valid OpenAI API key
 * @param {string} key - the key to check
 * @returns {boolean} - true if the key is valid, false otherwise
 * @throws - nothing
 * @sideEffects - nothing
 * @notes - this function checks if the given key is a valid OpenAI API key
 * @notes - it uses a regular expression to check the key
 * @notes - the key must start with "sk-" and be followed by 48 alphanumeric characters
 */
function isValidOpenAIKey(key) {
    logger.log("Checking OpenAI API key", "debug");
    logger.log(key, "trace");
    if (typeof key !== 'string') return false;
    logger.log("Key is a string. Key length: " + key.length, "trace");
    // Regex explanation:
    // sk- : Starts with "sk-"
    // [a-zA-Z0-9]{48} : Followed by 48 alphanumeric characters (total length becomes 51 characters including "sk-")
    const regex = /sk-[a-zA-Z0-9]{48}/g;
    return regex.test(key);
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
    logger.log("Updating .env file", "debug");
    if (typeof key !== 'string' || typeof value !== 'string') return false;
    const fs = require('fs');
    const path = adjustPathForPKG('.env');
    logger.log("Path: " + path, "trace");
    let fileContents = "";
    if (fs.existsSync(path)) {
        fileContents = fs.readFileSync(path, 'utf8');
        logger.log("File read", "trace");
    }
    let lines = fileContents.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        logger.log("Line " + i + ": " + lines[i], "trace");
        if (lines[i].indexOf(key) === 0) {
            logger.log("Key found", "trace");
            lines[i] = key + "=" + value;
            found = true;
            break;
        }
    }
    if (!found) {
        lines.push(key + "=" + value);
    }
    fileContents = lines.join('\n');
    try {
        fs.writeFileSync(path, fileContents);
        logger.log("File written", "trace");
        return true;
    } catch (e) {
        logger.error(e);
        return false;
    }
}

/**
 * @function parseGPTjsonResponse
 * @description - parses a JSON response from the GPT chatbot
 * @param {string} response - the response to parse
 * @returns {Object} - the parsed JSON response
 * @throws - nothing
 * @notes - this function parses a JSON response from the GPT chatbot
 * @notes - if the response is not a string, it is returned as is
 * @notes - if the response is an empty string, it is returned as is
 * @notes - if the response is a string that starts with "```" and ends with "```", the response is parsed as JSON
 */
function parseGPTjsonResponse(response) {
    logger.log("Parsing GPT JSON response", "debug");
    if (response === undefined || response === null) {
        logger.log("Response is undefined or null", "warn");
        return null;
    }
    if (typeof response !== 'string') {
        logger.log("Response is not a string", "warn");
        return response;
    }
    if (response === "") {
        logger.log("Response is an empty string", "warn");
        return null;
    }
    if (response.indexOf("```") === 0) response = response.substring(response.indexOf('\n') + 1);
    if (response.indexOf("```") > 0) response = response.substring(0, response.lastIndexOf('\n'));
    try {
        let json = JSON.parse(response);
        logger.log("Response parsed", "trace");
        return json;
    } catch (e) {
        logger.error(e);
        return response;
    }
}

// wait x seconds
function wait(seconds) {
    logger.log("Waiting " + seconds + " seconds", "trace");
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Open the default web browser to the app
const browse = require("browse-url")('http://localhost:3000/');

// When the app is closed, finalize the logger
process.on('exit', async() => {
    logger.finalize();
    await wait(2); // Gives the logger time to write out the logs
});