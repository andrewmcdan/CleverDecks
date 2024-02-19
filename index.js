const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const ai = require("openai");
const fs = require('fs');
const fuzzyMatch = require('fastest-levenshtein');

const commonClasses = require('./web/common.js');
const FlashCard = commonClasses.FlashCard;

const flashCardMaxDifficulty = 5; // Flash card difficulty is a number from 1 to 5

// this loads the API key from the .env file. 
// For development, you should create a .env file in the root directory of the project and add the following line to it:
// OPENAI_SECRET_KEY=your-api-key
require("dotenv").config();

const consoleLogging = true;
// const logFile = 'logs.txt';
// logLevel, 0-5 or "off", "info", "warn", "error", "debug", "trace"
const logLevel = process.env.LOG_LEVEL; // "trace"
const Logger = require('./logger.js');
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
    let res = await flashCardGenerator(testText, 5, ()=>{}, false);
    // logger.log(res); // uncomment to see the generated flash cards
})();
/////////////////// END TESTING /////////////////////////////////

/**
 * @class FlashCardCollection
 * @description - a class to handle flash card collections
 * @param {string} name - the name of the collection
 * @property {string} name - the name of the collection
 * @property {Array} cards - an array of flash cards
 * @property {number} largestId - the largest id number used so far
 * @property {string} filePath - the path to the file where the collection is stored
 * @method loadCollection - loads the flashcards from the collection into memory
 * @method addCard - adds a card to the collection
 * @method updateCard - updates a card in the collection
 * @method deleteCard - deletes a card from the collection
 * @method saveCollection - saves the collection to disk
 * @method getCardById - gets a card from the collection by id
 * @method getCards - gets an array of cards that match the given parameters
 */
class FlashCardCollection {
    /**
     * @constructor
     * @description - creates a new flash card collection
     * @param {string} name - the name of the collection
     * @param {string} filePath - the path to the file where the collection is stored
     * @property {string} name - the name of the collection
     * @property {Array} cards - an array of flash cards
     * @property {number} largestId - the largest id number used so far
     * @property {string} filePath - the path to the file where the collection is stored
     * @returns - a FlashCardCollection object
     * @throws - if the collection is not found
     * @sideEffects - calls the loadCollection method which loads the flashcards from the collection into memory
     * @sideEffects - logs a message to the console
     */
    constructor(name, filePath) {
        this.name = name;
        logger.log("Creating flash card collection: " + name, "debug");
        logger.log("File path (268): " + filePath, "trace");
        this.cards = [];
        this.largestId = 0;
        this.filePath = filePath;
        logger.log("File path (272): " + this.filePath, "trace");
        // adjust the file path for the environment
        // this.filePath = adjustPathForPKG(this.filePath);
        if(!this.loadCollection()) {
            logger.log("Flash card collection not found (380): " + name, "warn");
            // throw new Error("Flash card collection not found: " + name);
        }
    }

    moveCollectionLocation(newPath) {
        logger.log("Moving flash card collection: " + this.name + " to " + newPath, "debug");
        if(fs.existsSync(newPath)) {
            try{
                logger.log("File already exists, renaming to .bak", "debug");
                fs.renameSync(newPath, newPath + ".bak");
            }catch(err){
                logger.log("Error renaming file: " + err, "error");
            }
        }
        fs.renameSync(this.filePath, newPath);
        logger.log("File moved", "debug");
    }

    /**
     * @method loadCollection
     * @description - loads the flashcards from the collection into memory
     * @returns {boolean} - true if the collection was loaded, false if it was not
     * @throws - nothing
     * @sideEffects - logs a message to the console
     * @sideEffects - sets the cards property to an array of the flash cards in the collection
     * @sideEffects - sets the largestId property to the largest id number used so far
     */
    loadCollection() {
        logger.log("Loading flash card collection: " + this.name, "debug");
        logger.log("File path: " + this.filePath, "trace");
        if (fs.existsSync(this.filePath)) {
            let data = fs.readFileSync(this.filePath, 'utf8');
            try {
                let cards = JSON.parse(data);
                logger.log("Loaded flash card collection: " + this.name, "debug");
                cards.forEach( (card) => {
                    let newCard;
                    try{
                        newCard = new FlashCard(card);
                    }catch(err){
                        logger.log("Error loading flash card: " + card.id + " - " + err, "error");
                    }
                    if (newCard.id > this.largestId) this.largestId = newCard.id;
                    this.cards.push(newCard);
                });
                return true;
            } catch (err) {
                logger.log("Error loading flash card collection: " + this.name + " - " + err, "error");
                return false;
            }
        }else{
            logger.log("Flash card collection not found (415): " + this.name, "warn");
            return false;
        }
    }

    /**
     * @method addCard
     * @description - adds a card to the collection
     * @param {Object} cardData - a FlashCard object
     * @returns {boolean} - true if the card was added, false if it was not
     * @throws - nothing
     * @sideEffects - adds the card to the cards array
     * @sideEffects - calls the saveCollection method which saves the collection to disk
     * @sideEffects - logs a message to the console
     */
    addCard(cardData) {
        // TODO: do a search to see if the card or a similar one already exists
        this.cards.push(cardData);
        if(cardData.id > this.largestId) this.largestId = cardData.id;
        return this.saveCollection();
    }

    /**
     * @method updateCard
     * @description - updates a card in the collection
     * @param {Object} cardData - a FlashCard object
     * @returns {boolean} - true if the card was updated, false if it was not
     * @throws - nothing
     * @sideEffects - updates the card in the cards array
     * @sideEffects - calls the saveCollection method which saves the collection to disk
     */
    updateCard(cardData) {
        if(cardData.collection !== this.name) {
            logger.log("Card does not belong to this collection: " + this.name, "error");
            return false;
        }
        if(cardData.id === undefined || cardData.id === null) {
            logger.log("Card id is required to update a card", "error");
            return false;
        }
        let index = this.cards.findIndex(card => card.id === cardData.id);
        if (index !== -1) {
            this.cards[index] = cardData;
            return this.saveCollection();
        }else{
            logger.log("Card not found in collection: " + this.name, "error");
            return false;
        }
    }

    /**
     * @method deleteCard
     * @description - deletes a card from the collection
     * @param {number} cardID - the id of the card to delete
     * @returns {boolean} - true if the card was deleted, false if it was not
     * @throws - nothing
     * @sideEffects - deletes the card from the cards array
     * @sideEffects - calls the saveCollection method which saves the collection to disk
     */
    deleteCard(cardID) {
        if(cardID === undefined || cardID === null) {
            logger.log("Card id is required to delete a card", "error");
            return false;
        }
        if(cardData.collection !== this.name) {
            logger.log("Card does not belong to this collection: " + this.name, "error");
            return false;
        }
        let index = this.cards.findIndex(card => card.id === cardID);
        if (index !== -1) {
            this.cards.splice(index, 1);
            return this.saveCollection();
        }else{
            logger.log("Card not found in collection: " + this.name, "error");
            return false;
        }
    }

    /**
     * @method saveCollection
     * @description - saves the collection to disk
     * @returns {boolean} - true if the collection was saved, false if it was not
     * @throws - nothing
     * @sideEffects - writes the collection to disk
     * @sideEffects - logs a message to the console
     */
    saveCollection() {
        logger.log("Saving flash card collection: " + this.name, "debug");
        logger.log("File path: " + this.filePath, "trace");
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.cards, null, 2), 'utf8');
            logger.log("Saved flash card collection: " + this.name, "debug");
            return true;
        } catch (err) {
            logger.log("Error saving flash card collection: " + this.name + " - " + err, "error");
            return false;
        }
    }

    /**
     * @method getCardById
     * @description - gets a card from the collection by id
     * @param {number} id - the id of the card to get
     * @returns {Object} - a FlashCard object
     * @throws - nothing
     * @sideEffects - logs a message to the console
     */
    getCardById(id) {
        logger.log("Getting card by id: " + id, "debug");
        return this.cards.find(card => card.id === id);
    }

    /**
     * @method getCards
     * @description - gets an array of cards that match the given parameters
     * @param {Object} params - an object with any of the following properties:
     * - tags: an array of strings to filter by
     * - difficulty: a number from 1 to 5 to filter by
     * - search: a string to search for in the question or answer
     * - dateCreatedRange: an array of two Date objects to filter by date created
     * - dateModifiedRange: an array of two Date objects to filter by date modified
     * @returns {Array} - an array of FlashCard objects
     * @throws - nothing
     * @sideEffects - logs a message to the console
     * @notes - This method filters the cards based on the given parameters and returns an array of cards that match the parameters.
     * @notes - If no parameters are given, this method returns all the cards in the collection.
     * @notes - If the tags parameter is given, this method returns cards that have at least one of the given tags.
     * @notes - If the difficulty parameter is given, this method returns cards that have the given difficulty.
     * @notes - If the search parameter is given, this method returns cards that have the given string in the question or answer. Fuzzy matching not implemented.
     * @notes - If the dateCreatedRange parameter is given, this method returns cards that were created between the two given dates.
     * @notes - If the dateModifiedRange parameter is given, this method returns cards that were modified between the two given dates.
     */
    getCards(params) {
        let cards = this.cards;
        if (params.tags !== undefined && params.tags !== null) {
            cards = cards.filter(card => card.tags.some(tag => params.tags.includes(tag)));
        }
        if (params.difficulty !== undefined && params.difficulty !== null) {
            cards = cards.filter(card => card.difficulty === params.difficulty);
        }
        if (params.search !== undefined && params.search !== null) {
            // TODO: use fuzzy matching
            // fuzzyMatch.distance('string1', 'string2'); returns the number of changes needed to make string1 equal to string2
            cards = cards.filter(card => card.question.includes(params.search) || card.answer.includes(params.search));
        }
        if (params.dateCreatedRange !== undefined && params.dateCreatedRange !== null) {
            cards = cards.filter(card => card.dateCreated >= params.dateCreatedRange[0] && card.dateCreated <= params.dateCreatedRange[1]);
        }
        if (params.dateModifiedRange !== undefined && params.dateModifiedRange !== null) {
            cards = cards.filter(card => card.dateModified >= params.dateModifiedRange[0] && card.dateModified <= params.dateModifiedRange[1]);
        }
        return cards;
    }
}


class FlashCardDatabase {
    /**
     * @constructor
     * @description - creates a new flash card database
     * @property {Array} collections - an array of flash card collections
     * @property {number} largestId - the largest id number used so far
     * @returns - a FlashCardDatabase object
     */
    constructor() {
        this.collections = [];
        this.largestId = 0;
        this.loadCollections();
        this.allTags = [];
    }

    /**
     * @method loadCollections
     * @description - loads the flash card collections from disk
     * @returns {boolean} - true if the collections were loaded, false if they were not
     * @throws - nothing
     * @sideEffects - logs a message to the console
     * @sideEffects - sets the collections property to an array of flash card collections
     * @sideEffects - sets the largestId property to the largest id number used so far
     * @notes - This method loads the flash card collections from disk and sets the collections property to an array of flash card collections.
     * @notes - If the metadata.json file is not found, this method creates a new metadata.json file.
     */
    loadCollections() {
        let metadataPath = path.join(__dirname, 'flashcards', 'metadata.json');
        metadataPath = adjustPathForPKG(metadataPath);
        if (fs.existsSync(metadataPath)) {
            let data = fs.readFileSync(metadataPath, 'utf8');
            try {
                let collections = JSON.parse(data);
                logger.log("Loaded flash card collections metadata.json", "debug");
                collections.forEach((collection) => {
                    let newCollection = new FlashCardCollection(collection.name, collection.path);
                    if (newCollection.largestId > this.largestId) this.largestId = newCollection.largestId;
                    newCollection.cards.forEach((card) => {
                        card.tags.forEach((tag) => {
                            if(this.allTags !== undefined && !this.allTags.includes(tag)) this.allTags.push(tag);
                        });
                    });
                    logger.log("Alltags: \n"+JSON.stringify(this.allTags,2,null), "debug");
                    this.collections.push(newCollection);
                });
                return true;
            } catch (err) {
                logger.log("Error loading flash card collections: " + err, "error");
                return false;
            }
        }else{
            logger.log("Flash card collections metadata.json not found", "warn");
            logger.log("Creating new flash card collections metadata.json", "debug");
            fs.writeFileSync(metadataPath, "[]", 'utf8');
            return true;
        }
    }

    /**
     * @method tagExistsExact
     * @description - checks if a tag exists in the database
     * @param {string} tag - the tag to check
     * @returns {boolean} - true if the tag exists, false if it does not
     * @throws - nothing
     * @notes - This method checks if a tag exists in the database. It does an exact match.
     * @notes - This method is case sensitive.
     * @notes - This method does not use fuzzy matching.
     */
    tagExistsExact(tag) {
        return this.allTags.includes(tag);
    }

    /**
     * @method tagExistsFuzzy
     * @description - checks if a tag exists in the database using fuzzy matching
     * @param {string} tag - the tag to check
     * @returns {boolean} - true if the tag exists, false if it does not
     * @throws - nothing
     * @notes - This method checks if a tag exists in the database using fuzzy matching.
     * @notes - This method is case sensitive.
     */
    tagExistsFuzzy(tag) {
        return this.allTags.some((t) => t.includes(fuzzyMatch.closest(tag, ...this.allTags)));
    }

    /**
     * @method tagMatchFirstChars
     * @description - gets an array of tags that match the given tag based on the first characters
     * @param {string} tag - the tag to match
     * @returns {Array} - an array of strings
     * @throws - nothing
     * @notes - This method gets an array of tags that match the given tag based on the first characters.
     * @notes - This method is case sensitive.
     * @notes - This method does not use fuzzy matching.
     */
    tagMatchFirstChars(tag) {
        return this.allTags.filter((t) => t.startsWith(tag));
    }

    /**
     * @method tagMatchFuzzy
     * @description - gets an array of tags that match the given tag using fuzzy matching
     * @param {string} tag - the tag to match
     * @returns {Array} - an array of strings
     * @throws - nothing
     * @notes - This method gets an array of tags that match the given tag using fuzzy matching.
     * @notes - This method is case sensitive.
     * @notes - This method uses fuzzy matching.
     */
    tagMatchFuzzy(tag) {
        return this.allTags.filter((t) => t.includes(fuzzyMatch.closest(tag, ...this.allTags)));
    }

    /**
     * @method getCollectionNames
     * @description - gets an array of collection names
     * @returns {Array} - an array of strings
     * @throws - nothing
     * @sideEffects - logs a message to the console
     * @notes - This method gets an array of collection names from the collections in the database 
     */
    getCollectionNames(){
        logger.log("Getting collection names", "debug");
        let names = [];
        if(this.collections === undefined || this.collections === null || this.collections.length==0) return names;
        this.collections.forEach((collection) => {
            names.push(collection.name);
        });
        return names;
    }

    /**
     * @method addCard
     * @description - adds a card to the database
     * @param {Object} cardData - a FlashCard object
     * @returns {boolean} - true if the card was added, false if it was not
     * @throws - nothing
     * @sideEffects - calls the addCard method of the FlashCardCollection class
     * @sideEffects - logs a message to the console
     * @notes - This method adds a card to the database by calling the addCard method of the FlashCardCollection class.
     */
    addCard(cardData) {
        logger.log("Adding card to database (711):", "debug");
        logger.log(JSON.stringify(cardData,2,null), "debug");
        let collection = this.collections.find(collection => collection.name === cardData.collection);
        if (collection === undefined) {
            // add a new collection
            logger.log("Collection not found (715): " + cardData.collection, "warn");
            collection = new FlashCardCollection(cardData.collection, path.join(__dirname, 'flashcards', cardData.collection + '.json'));
            this.collections.push(collection);
        }
        cardData.id = ++this.largestId;
        collection.addCard(cardData);
        this.saveCollections(true);
        // add tags
        cardData.tags.forEach((tag) => {
            if(!this.allTags.includes(tag)) this.allTags.push(tag);
        });
        return true;
    }

    /**
     * @method updateCard
     * @description - updates a card in the database
     * @param {Object} cardData - a FlashCard or FlashCard-like object. must contain an id property and at least one other property to update
     * @returns {boolean} - true if the card was updated, false if it was not
     */
    updateCard(cardData) {
        // TODO: maybe rewrite this function so that it finds the card by id first, then checks if the collection exists, then updates the card
        let collection = this.collections.find(collection => collection.name === cardData.collection);
        if (collection === undefined) {
            let newPath = path.join(__dirname, 'flashcards', cardData.collection + '.json');
            logger.log("New path (655): " + path, "debug");
            // add a new collection
            collection = new FlashCardCollection(cardData.collection, newPath);
            this.collections.push(collection);
            // temporarily hold the card here
            let tempCard = this.getCardById(cardData.id);
            // delete the card from the old collection
            this.deleteCard(cardData);
            // update the collection name
            tempCard.collection = cardData.collection;
            // add the card to the new collection
            this.addCard(tempCard);
        }
        this.saveCollections(true);
        return collection.updateCard(cardData);
    }

    /**
     * @method deleteCard
     * @description - deletes a card from the database
     * @param {Object} cardData - a FlashCard object
     * @returns {boolean} - true if the card was deleted, false if it was not
     * @throws - nothing
     * @sideEffects - calls the deleteCard method of the FlashCardCollection class
     */
    deleteCard(cardData) {
        // TODO: if the collection is empty, delete the collection
        let collection = this.collections.find(collection => collection.name === cardData.collection);
        if (collection === undefined) {
            logger.log("Collection not found (760): " + cardData.collection, "error");
            return false;
        }
        this.saveCollections(true);
        return collection.deleteCard(cardData.id);
    }

    /**
     * @method getCards
     * @description - gets an array of cards that match the given parameters
     * @param {Object} params - an object with any of the following properties:
     * - collection: the name of the collection to get cards from
     * - tags: an array of strings to filter by
     * - difficulty: a number from 1 to 5 to filter by
     * - search: a string to search for in the question or answer
     * - dateCreatedRange: an array of two Date objects to filter by date created
     * - dateModifiedRange: an array of two Date objects to filter by date modified
     * @returns {Array} - an array of FlashCard objects
     * @throws - nothing
     * @sideEffects - logs a message to the console
     * @notes - This method gets an array of cards that match the given parameters from the collections in the database.
     */
    getCards(params) {
        let collection = this.collections.find(collection => collection.name === params.collection);
        if (collection === undefined) {
            logger.log("Collection not found (785): " + params.collection, "warn");
            return [];
        }
        return collection.getCards(params);
    }

    /**
     * @method getCountOfCards
     * @description - gets the number of cards that match the given parameters
     * @param {Object} params - an object with any of the following properties:
     * - collection: the name of the collection to get cards from
     * - tags: an array of strings to filter by
     * - difficulty: a number from 1 to 5 to filter by
     * - search: a string to search for in the question or answer
     * - dateCreatedRange: an array of two Date objects to filter by date created
     * - dateModifiedRange: an array of two Date objects to filter by date modified
     * @returns {number} - the number of cards that match the given parameters
     * @throws - nothing
     * @sideEffects - logs a message to the console
     * @notes - This method gets the number of cards that match the given parameters from the collections in the database.
     */
    getCountOfCards(params) {
        logger.log("Getting count of cards", "debug");
        logger.log("Params: " + JSON.stringify(params), "trace");
        let cards = [];
        this.collections.forEach((collection) => {
            if (collection.name === params.collection) {
                cards.push(collection.getCards(params));
            }
        });
        return cards.length;
    }

    /**
     * @method getCountOfAllCards
     * @description - gets the number of all the cards in the database
     * @returns {number} - the number of all the cards in the database
     * @throws - nothing
     * @sideEffects - logs a message to the console
     * @notes - This method gets the number of all the cards in the database.
     */
    getCountOfAllCards() {
        logger.log("Getting count of all cards", "debug");
        let count = 0;
        this.collections.forEach((collection) => {
            count += collection.cards.length;
        });
        return count;
    }

    /**
     * @method saveCollections
     * @description - saves the collections to disk
     * @returns - nothing
     * @throws - nothing
     * @sideEffects - calls the saveCollection method of each FlashCardCollection in the collections array
     * @sideEffects - logs a message to the console
     */
    saveCollections(onlySaveMetadata = false) {
        let metadataPath = path.join(__dirname, 'flashcards', 'metadata.json');
        metadataPath = adjustPathForPKG(metadataPath);
        let collectionNames = this.collections.map(collection => collection.name);
        let collectionPaths = this.collections.map(collection => collection.filePath);
        let collections = collectionNames.map((name, index) => {
            return { name: name, path: collectionPaths[index] };
        });
        fs.writeFileSync(metadataPath, JSON.stringify(collections, null, 2), 'utf8');
        if(onlySaveMetadata) return;
        this.collections.forEach(collection => collection.saveCollection());
    }

    /**
     * @method getCardById
     * @description - gets a card from the database by id
     * @param {number} id - the id of the card to get
     * @returns {Object} - a FlashCard object
     * @throws - nothing
     * @sideEffects - logs a message to the console
     * @notes - This method gets a card from the database by id.
     * @notes - If the card is not found, this method returns null.
     * @notes - This method searches all the collections in the database for the card.
     */
    getCardById(id) {
        let card = null;
        forEach(this.collections, (collection) => {
            card = collection.getCardById(id);
            if (card !== null) return;
        });
        return card;
    }
}

const flashcard_db = new FlashCardDatabase();

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
    let requestParams = req.query;
    if(requestParams.numberOfCards === undefined) requestParams.numberOfCards = 10;
    if(requestParams.offset === undefined) requestParams.offset = 0;
    if(requestParams.collection === undefined) requestParams.collection = null;
    if(requestParams.tags === undefined) requestParams.tags = null;
    if(requestParams.difficulty === undefined) requestParams.difficulty = null;
    if(requestParams.search === undefined) requestParams.search = null;
    if(requestParams.dateCreatedRange === undefined) requestParams.dateCreatedRange = null;
    if(requestParams.dateModifiedRange === undefined) requestParams.dateModifiedRange = null;
    let cards = flashcard_db.getCards(requestParams);
    let offset = requestParams.offset;
    let numberOfCards = requestParams.numberOfCards;
    cards = cards.slice(offset, offset + numberOfCards);
    res.send({ cards: cards , count: flashcard_db.getCountOfCards(requestParams) , total: flashcard_db.getCountOfAllCards() });
});

// endpoint: /api/getCollections
// Type: GET
// sends a JSON object with the names of the collections
app.get('/api/getCollections', (req, res) => {
    logger.log("GET /api/getCollections", "debug");
    // get the collection names from the flash card database class
    let collectionNames = flashcard_db.getCollectionNames();
    res.send({ collections: collectionNames });
});

// endpoint: /api/saveNewCards
// Type: POST
// receives a JSON object with the card data and saves it to the database
app.post('/api/saveNewCards', (req, res) => {
    logger.log("POST /api/saveNewCards", "debug");
    req.on('data', (data) => {
        const cardData = JSON.parse(data);
        logger.log("Saving new flash card: \n" + JSON.stringify(cardData,2,null), "debug");
        let card = new FlashCard(cardData[0]);
        if(flashcard_db.addCard(card)){
            res.send({ status: 'ok' });
        }else{
            res.send({ status: 'error' });
        }
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
    if(requestParams.collection === undefined) requestParams.collection = null;
    if(requestParams.tags === undefined) requestParams.tags = null;
    if(requestParams.difficulty === undefined) requestParams.difficulty = null;
    if(requestParams.search === undefined) requestParams.search = null;
    if(requestParams.dateCreatedRange === undefined) requestParams.dateCreatedRange = null;
    if(requestParams.dateModifiedRange === undefined) requestParams.dateModifiedRange = null;
    let count = flashcard_db.getCountOfCards(requestParams);
    res.send({ count: count });
});

// endpoint: /api/tagMatch
// Type: GET
// sends a JSON object with the tags that match the given tag/partial tag
// query parameters:
// - tag: the tag or partial tag to match
app.get('/api/tagMatch', (req, res) => {
    logger.log("GET /api/tagMatch", "debug");
    logger.log("Query: " + JSON.stringify(req.query), "trace");
    const tag = req.query.tag;
    if(typeof tag !== 'string') {
        logger.log("Invalid tag: " + tag, "error");
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
            lines[i] = key + (typeof value=="string"?"=\"":"=")  + value + (typeof value=="string"?"\"":"");
            found = true;
            break;
        }
    }
    if (!found) {
        lines.push(key + (typeof value=="string"?"=\"":"=")  + value + (typeof value=="string"?"\"":""));
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
const EXIT = async() => {
    logger.log("Saving FlashCards...", "info");
    flashcard_db.saveCollections();
    logger.log("Exiting...", "info");
    logger.finalize();
    await wait(2); // Gives the logger time to write out the logs
}

// Catch all the ways the program can exit
process.on('SIGINT', async() => {
    await EXIT();
    process.exit();
});
process.on('SIGTERM', async() => {
    await EXIT();
    process.exit();
});
process.on('uncaughtException', async() => {
    await EXIT();
    process.exit();
});
process.on('SIGHUP', async() => {
    await EXIT();
    process.exit();
});
process.on('exit', async() => {
    // await EXIT();
});