const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const ai = require("openai");

const flashCardMaxDifficulty = 5; // Flash card difficulty is a number from 1 to 5

// this loads the API key from the .env file. 
// For development, you should create a .env file in the root directory of the project and add the following line to it:
// OPENAI_SECRET_KEY=your-api-key
require("dotenv").config();


/**
 * @class ChatGPT
 * @description - a class to interface with OpenAI's GPT-4 chatbot
 * @param {string} key - the OpenAI API key
 * @property {boolean} apiKeyFound - a boolean to indicate if the API key is valid
 * @property {Object} openai - an instance of the OpenAI API
 * @method setApiKey - a method to set the API key
 * @method generateResponse - a method to generate a response from the chatbot
 */
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

    async generateResponse(inputText, stream_enabled, stream_cb, completion_cb) {
        if (!this.apiKeyFound) return null;
        if (stream_enabled) {
            if (typeof stream_cb !== 'function') stream_cb = (chunk) => console.log(chunk);
            if (typeof completion_cb !== 'function') completion_cb = (response) => console.log(response);
            let response = "";
            const stream = await this.openai.chat.completions.create({
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
            const chatCompletion = await this.openai.chat.completions.create({
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
    if (text === undefined || text === null) return null;
    if (typeof text !== 'string') return null;
    if (text.length > 16384) return null;
    if(typeof streamingData_cb !== 'function') streamingData_cb = (chunk) => process.stdout.write(chunk);
    let prompt = "Please generate " + numberOfCardsToGenerate + " flash cards (based on the text below) with concise answers, returning the data in JSON format following the schema ";
    prompt += "{\"question\":\"the flash card question\",\"answer\":\"the flash card answer\",\"tags\":[\"tag1\",\"tag2\"],\"difficulty\":N,\"collection\":\"The broad category the card belong to such as world geography\"} (difficulty is a number from 1 to " + flashCardMaxDifficulty + ").";
    prompt += " all based on the following text (it is important that the flash cards be based on the following text)" + (enableExtrapolation?", extrapolating on the given text to generate the desired number of cards":"") + ": \n" + text;
    let response = "";
    console.log("Generating flash cards from text...\n");
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
    if (card === undefined || card === null) throw new Error("wrongAnswerGenerator requires a FlashCard object as an argument");
    if(typeof streamingData_cb !== 'function') streamingData_cb = (chunk) => process.stdout.write(chunk);
    let prompt = "Please generate " + numberOfAnswers + " wrong answers for the following flash card: \n";
    prompt += "Card front: " + card.question + "\nCorrect answer: " + card.answer + "\n";
    prompt += "Flash Card Tags: " + card.tags.join(", ") + "\n";
    prompt += "Flash Card Collection: " + card.collection + "\n";
    prompt += "Flash Card Difficulty: " + card.difficulty + " of " + flashCardMaxDifficulty + "\n";
    prompt += "Return the wrong answers as a JSON array of strings.";
    let response = "";
    console.log("Generating wrong answers for flash card...\n");
    await chatbot.generateResponse(prompt, true, streamingData_cb, (res)=>{response = res;});
    return parseGPTjsonResponse(response);
}


/**
 * @class FlashCard
 * @param {Object} data - an object with the following properties:
 * - id: a unique identifier for the card
 * - question: the question on the front of the card
 * - answer: the answer on the back of the card
 * - tags: an array of strings that describe the card. used for searching, sorting, and filtering
 * - difficulty: a number from 1 to 5 that represents the difficulty of the card
 * - collection: the name of the collection the card belongs to
 * - dateCreated: the date the card was created
 * - dateModified: the date the card was last modified
 * - dateLastStudied: the date the card was last studied
 * - timesStudied: the number of times the card has been studied
 * - timesCorrect: the number of times the card has been answered correctly
 * - timesIncorrect: the number of times the card has been answered incorrectly
 * - timesSkipped: the number of times the card has been skipped
 * - timesFlagged: the number of times the card has been flagged
 * @throws {Error} - if the data object is not given or if it is missing required properties
 * @returns {FlashCard} - a new FlashCard object
 */
class FlashCard {
    constructor(data) {
        if (data === undefined || data === null) throw new Error("FlashCard constructor requires an object as an argument");
        if (data.id === undefined || data.id === null) throw new Error("FlashCard constructor requires an id property in the object");
        this.id = data.id;
        if (data.question === undefined || data.question === null) throw new Error("FlashCard constructor requires a question property in the object");
        this.question = data.question;
        if (data.answer === undefined || data.answer === null) throw new Error("FlashCard constructor requires an answer property in the object");
        this.answer = data.answer;
        if (data.tags === undefined || data.tags === null) throw new Error("FlashCard constructor requires a tags property in the object");
        this.tags = data.tags;
        if (data.difficulty === undefined || data.difficulty === null) data.difficulty = 3;
        this.difficulty = data.difficulty;
        if (data.collection === undefined || data.collection === null) data.collection = "Uncategorized";
        this.collection = data.collection;
        if (data.dateCreated === undefined || data.dateCreated === null) data.dateCreated = new Date();
        this.dateCreated = data.dateCreated;
        if (data.dateModified === undefined || data.dateModified === null) data.dateModified = new Date();
        this.dateModified = data.dateModified;
        if (data.dateLastStudied === undefined || data.dateLastStudied === null) data.dateLastStudied = "";
        this.dateLastStudied = data.dateLastStudied;
        if (data.timesStudied === undefined || data.timesStudied === null) data.timesStudied = 0;
        this.timesStudied = data.timesStudied;
        if (data.timesCorrect === undefined || data.timesCorrect === null) data.timesCorrect = 0;
        this.timesCorrect = data.timesCorrect;
        if (data.timesIncorrect === undefined || data.timesIncorrect === null) data.timesIncorrect = 0;
        this.timesIncorrect = data.timesIncorrect;
        if (data.timesSkipped === undefined || data.timesSkipped === null) data.timesSkipped = 0;
        this.timesSkipped = data.timesSkipped;
        if (data.timesFlagged === undefined || data.timesFlagged === null) data.timesFlagged = 0;
        this.timesFlagged = data.timesFlagged;
    }
}


//////////////////////////// TESTING ///////////////////////////////////
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
    let res = await flashCardGenerator(testText, 50, true);
    // console.log(res); // uncomment to see the generated flash cards
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
        if (isValidOpenAIKey(apiKey)) {
            chatbot.setApiKey(apiKey);
            writeApiKeyToFile(apiKey); // TODO: remove this line and use the "updateEnvFile" function instead
            res.send({ status: 'ok' });
        } else {
            res.send({ status: 'invalid' });
        }
    });
});

// Serve static files
app.get('/', (req, res) => {
    // forward to /web/
    res.redirect('/web/index.html');
});
app.use('/web', express.static(adjustPathForPKG('web')));

// 404
app.use((req, res, next) => {
    res.status(404).sendFile(__dirname + '/web/404.html');
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
    console.log(`If you are using a web browser on the same computer as the app, you can use the following address:`)
    console.log(`http://localhost:${port}`)
    console.log(`If you are using a web browser on a different computer on the same network, you can try the following addresses:`)
    addresses.forEach((address) => {
        console.log(`http://${address}:${port}`);
    });
});

////////////////////////////////////////////////////////////////////////////////////////////
/// Helper functions
////////////////////////////////////////////////////////////////////////////////////////////

// This function is used to adjust the path when running the app as a standalone executable
function adjustPathForPKG(filePath) {
    if (process.pkg) {
        return path.join(path.dirname(process.cwd()), filePath);
    }
    return filePath;
}

function isValidOpenAIKey(key) {
    if (typeof key !== 'string') return false;
    // Regex explanation:
    // ^sk- : Starts with "sk-"
    // [a-zA-Z0-9]{54} : Followed by 54 alphanumeric characters (total length becomes 57 characters including "sk-")
    const regex = /sk-[a-zA-Z0-9]{48}/g;
    return regex.test(key);
}

// TODO: remove this function and use the "updateEnvFile" function instead
function writeApiKeyToFile(key) {
    const fs = require('fs');
    fs.writeFileSync(adjustPathForPKG('.env'), `OPENAI_SECRET_KEY=${key}`);
}


// TODO: implement a function "updateEnvFile" that updates the .env file with the given key / value pair
// parameters:
// - key: the key to update
// - value: the value to set
// returns:
// - true if the key / value pair was updated, false otherwise
// 
// This function should read the .env file, update the key / value pair, and write the file back to disk.
// If the key does not exist in the file, it should be added to the end of the file.
// If the file does not exist, it should be created with the key / value pair.

function parseGPTjsonResponse(response) {
    if (response === undefined || response === null) return null;
    if (typeof response !== 'string') return response;
    if (response === "") return null;
    if (response.indexOf("```") === 0) response = response.substring(response.indexOf('\n') + 1);
    if (response.indexOf("```") > 0) response = response.substring(0, response.lastIndexOf('\n'));
    try {
        let json = JSON.parse(response);
        return json;
    } catch (e) {
        console.error(e);
        return response;
    }
}

// wait x seconds
function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Open the default web browser to the app
const browse = require("browse-url")('http://localhost:3000/');


/////