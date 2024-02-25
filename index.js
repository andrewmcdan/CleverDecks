// TODO: Move the flashcard database to database.js. This includes the FlashCardCollection and FlashCardDatabase classes. Once that is done, tests can be written for the database.


const os = require('node:os');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = 3000;
const path = require('path');
const fs = require('fs');
const fuzzyMatch = require('fastest-levenshtein');
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
const logLevel = process.env.LOG_LEVEL; // "trace"
const Logger = require('./logger.js');
const logger = new Logger(consoleLogging, logLevel); // create a new logger object. This must remain at/near the top of the file.
///////////////////////////////////////////////////////////////////// ChatGPT /////////////////////////////////////////////////////////////////////////////////////////
const ChatGPT = require('./chatGPT.js');
const chatbot = new ChatGPT(process.env.OPENAI_SECRET_KEY, logger);
//////////////////////////// TESTING ///////////////////////////////////

(async () => {
    let mathExp = ["x=(-b+-sqrt(b^2-4ac))/2a", "a!=0", "ax^2+bx+c=0", "integral of(x^2)dx", "derivative of(x^2)", "sum of(1,2,3,4,5,6,7,8,9,10)", "integral of(x^2)dx from 0 to 1", "limit of(x^2) as x approaches 0"];
    let res2 = await chatbot.interpretMathExpression(mathExp);
    logger.log("//////////////////////////////////////////////////////////////////////////////")
    logger.log(mathExp);
    logger.log(res2);
    if (res2.length === mathExp.length) {
        logger.log("All math expressions appear to have been interpreted correctly", "debug");
    }
    logger.log("//////////////////////////////////////////////////////////////////////////////")
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
    constructor(name, filePath, largestId = 0) {
        this.name = name;
        logger.log("Creating flash card collection: " + name, "debug");
        logger.log("File path (268): " + filePath, "trace");
        this.cards = [];
        this.largestId = largestId;
        this.filePath = filePath;
        logger.log("File path (272): " + this.filePath, "trace");
        // adjust the file path for the environment
        // this.filePath = adjustPathForPKG(this.filePath);
        if (!this.loadCollection()) {
            logger.log("Flash card collection not found (380): " + name, "warn");
            // throw new Error("Flash card collection not found: " + name);
        }
    }

    // this method moved into the FlashCardDatabase class
    // moveCollectionLocation(newPath) {
    //     logger.log("Moving flash card collection: " + this.name + " to " + newPath, "debug");
    //     if(fs.existsSync(newPath)) {
    //         try{
    //             logger.log("File already exists, renaming to .bak", "debug");
    //             fs.renameSync(newPath, newPath + ".bak");
    //         }catch(err){
    //             logger.log("Error renaming file: " + err, "error");
    //         }
    //     }
    //     fs.renameSync(this.filePath, newPath);
    //     logger.log("File moved", "debug");
    // }

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
            let backupPath = this.filePath + "-" + (new Date().toLocaleString().replace(/:/g, '-').replace(/ /g, '_').replace(/\//g, '-')) + '.bak';
            try {
                fs.copyFileSync(this.filePath, backupPath);
                logger.log("Created backup of " + this.filePath, "debug");
                // delete old backups. We keep the 2 most recent backups
                let metadataFolder = path.join(os.homedir(), 'CleverDecks', 'flashcards');
                let files = fs.readdirSync(path.join(metadataFolder));
                files = files.filter((file) => file.startsWith(this.name + '.json-'));
                if (files.length > 2) {
                    // delete the oldest backups. We keep the 2 most recent backups
                    logger.log("Deleting old backups of " + this.name + ".json", "debug");
                    // sort the files by creation date
                    files.sort((a, b) => {
                        let aDate = new Date(a.split('-').pop().split('.').shift().replace(/_/g, ' '));
                        let bDate = new Date(b.split('-').pop().split('.').shift().replace(/_/g, ' '));
                        return aDate - bDate;
                    });
                    for (let i = 0; i < files.length - 2; i++) {
                        fs.unlinkSync(path.join(metadataFolder, files[i]));
                    }
                }
            } catch (err) {
                logger.log("Error creating backup of " + this.name + ".json: " + err, "error");
            }
            try {
                let cards = JSON.parse(data);
                logger.log("Loaded flash card collection: " + this.name, "debug");
                cards.forEach((card) => {
                    let newCard;
                    try {
                        newCard = new FlashCard(card);
                    } catch (err) {
                        logger.log("Error loading flash card: " + card.id + " - " + err, "error");
                    }
                    newCard.id = ++this.largestId;
                    this.cards.push(newCard);
                });
                return true;
            } catch (err) {
                logger.log("Error loading flash card collection: " + this.name + " - " + err, "error");
                return false;
            }
        } else {
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
        if (cardData.id > this.largestId) this.largestId = cardData.id;
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
        if (cardData.collection !== this.name) {
            logger.log("Card does not belong to this collection: " + this.name, "error");
            return false;
        }
        if (cardData.id === undefined || cardData.id === null) {
            logger.log("Card id is required to update a card", "error");
            return false;
        }
        let index = this.cards.findIndex(card => card.id === cardData.id);
        if (index !== -1) {
            this.cards[index] = cardData;
            return this.saveCollection();
        } else {
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
        if (cardID === undefined || cardID === null) {
            logger.log("Card id is required to delete a card", "error");
            return false;
        }
        if (cardData.collection !== this.name) {
            logger.log("Card does not belong to this collection: " + this.name, "error");
            return false;
        }
        let index = this.cards.findIndex(card => card.id === cardID);
        if (index !== -1) {
            this.cards.splice(index, 1);
            return this.saveCollection();
        } else {
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
        return this.cards.find(card => card.id == id);
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
        this.allTags = [];
        this.loadCollections();
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
        let metadataFolder = path.join(os.homedir(), 'CleverDecks', 'flashcards');
        let metadataPath = path.join(metadataFolder, 'metadata.json');
        // metadataPath = adjustPathForPKG(metadataPath);
        if (fs.existsSync(metadataPath)) {
            let data = fs.readFileSync(metadataPath, 'utf8');
            // save a backup of the metadata file
            let backupPath = path.join(metadataFolder, 'metadata.json-' + (new Date().toLocaleString().replace(/:/g, '-').replace(/ /g, '_').replace(/\//g, '-') + '.bak'));
            try {
                fs.copyFileSync(metadataPath, backupPath);
                logger.log("Created backup of metadata.json", "debug");
                // delete old backups. We keep the 5 most recent backups
                let files = fs.readdirSync(path.join(metadataFolder));
                files = files.filter((file) => file.startsWith('metadata.json-'));
                if (files.length > 5) {
                    // delete the oldest backups
                    logger.log("Deleting old backups of metadata.json", "debug");
                    // sort the files by creation date
                    files.sort((a, b) => {
                        let aDate = new Date(a.split('-').pop().split('.').shift().replace(/_/g, ' '));
                        let bDate = new Date(b.split('-').pop().split('.').shift().replace(/_/g, ' '));
                        return aDate - bDate;
                    });
                    for (let i = 0; i < files.length - 5; i++) {
                        fs.unlinkSync(path.join(metadataFolder, files[i]));
                    }
                }
            } catch (err) {
                logger.log("Error creating backup of metadata.json: " + err, "error");
            }
            try {
                let collections = JSON.parse(data);
                logger.log("Loaded flash card collections metadata.json", "debug");
                collections.forEach((collection) => {
                    let newCollection = new FlashCardCollection(collection.name, collection.path, this.largestId);
                    if (newCollection.largestId > this.largestId) this.largestId = newCollection.largestId;
                    newCollection.cards.forEach((card) => {
                        card.tags.forEach((tag) => {
                            if (!this.allTags?.includes(tag)) this.allTags.push(tag);
                        });
                    });
                    this.collections.push(newCollection);
                });
                logger.log("Alltags: \n" + JSON.stringify(this.allTags, 2, null), "debug");
                return true;
            } catch (err) {
                logger.log("Error loading flash card collections: " + err, "error");
                return false;
            }
        } else {
            logger.log("Flash card collections metadata.json not found", "warn");
            logger.log("Creating new flash card collections metadata.json", "debug");
            // get current directory
            if (!fs.existsSync(metadataFolder)) {
                // recursively create the directory
                fs.mkdirSync(metadataFolder, { recursive: true });
            }
            fs.writeFileSync(metadataPath, "[]", 'utf8');
            return true;
        }
    }

    // TODO: add a method to move a collection to a new location and update the metadata.json file

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
    getCollectionNames() {
        logger.log("Getting collection names", "debug");
        let names = [];
        if (this.collections === undefined || this.collections === null || this.collections.length == 0) return names;
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
        logger.log(JSON.stringify(cardData, 2, null), "debug");
        let collection = this.collections.find(collection => collection.name === cardData.collection);
        if (collection === undefined) {
            // add a new collection
            logger.log("Collection not found (715): " + cardData.collection, "warn");
            let metadataFolder = path.join(os.homedir(), 'CleverDecks', 'flashcards');
            collection = new FlashCardCollection(cardData.collection, path.join(metadataFolder, cardData.collection + '.json'));
            this.collections.push(collection);
        }
        cardData.id = ++this.largestId;
        collection.addCard(cardData);
        this.saveCollections(true);
        // add tags
        cardData.tags.forEach((tag) => {
            if (!this.allTags.includes(tag)) this.allTags.push(tag);
        });
        return true;
    }

    /**
     * @method updateCard
     * @description - updates a card in the database
     * @param {Object} cardData - a FlashCard or FlashCard-like object. must contain an id property and at least one other property to update
     * @returns {boolean} - true if the card was updated, false if it was not
     * @sideEffects - calls saveCollections(true)
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
        let metadataFolder = path.join(os.homedir(), 'CleverDecks', 'flashcards');
        let metadataPath = path.join(metadataFolder, 'metadata.json');
        // metadataPath = adjustPathForPKG(metadataPath);
        let collectionNames = this.collections.map(collection => collection.name);
        let collectionPaths = this.collections.map(collection => collection.filePath);
        let collections = collectionNames.map((name, index) => {
            return { name: name, path: collectionPaths[index] };
        });
        fs.writeFileSync(metadataPath, JSON.stringify(collections, null, 2), 'utf8');
        if (onlySaveMetadata) return;
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
        this.collections.forEach((collection) => {
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
        logger.log("Saving new flash card: \n" + JSON.stringify(cardData, 2, null), "debug");
        // TODO: fix so that this iterates over all the cards in the array
        let card = new FlashCard(cardData[0]);
        if (flashcard_db.addCard(card)) {
            res.send({ status: 'ok' });
        } else {
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
    req.on('data', async (data) => {
        const dataObj = JSON.parse(data);
        if (dataObj.text === undefined) res.send({ status: 'error' });
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
    logger.log("GET /api/getWrongAnswers", "debug");
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
            logger.log("Error generating wrong answers: " + err, "error");
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
    logger.log("GET /api/getCardCount", "debug");
    const requestParams = req.query;
    if (requestParams.collection === undefined) requestParams.collection = null;
    if (requestParams.tags === undefined) requestParams.tags = null;
    if (requestParams.difficulty === undefined) requestParams.difficulty = null;
    if (requestParams.search === undefined) requestParams.search = null;
    if (requestParams.dateCreatedRange === undefined) requestParams.dateCreatedRange = null;
    if (requestParams.dateModifiedRange === undefined) requestParams.dateModifiedRange = null;
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
    if (typeof tag !== 'string') {
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

var ioServer = null;
var connectedCount = 0;
io.on('connection', (socket) => {
    ioServer = socket;
    connectedCount++;
    logger.log('A user connected', "debug");
    socket.on('disconnect', () => {
        connectedCount--;
        if(connectedCount === 0) ioServer = null;
        logger.log('User disconnected', "debug");
    });
    socket.on('message', (msg) => {
        logger.log('Message: ' + msg, "debug");
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
    // logger.log(`If you are using a web browser on the same computer as the app, you can use the following address:`)
    // logger.log(`http://localhost:${port}`)
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
        logger.log("File written", "trace");
        return true;
    } catch (e) {
        logger.error(e);
        return false;
    }
}

// wait x seconds
function wait(seconds) {
    logger.log("Waiting " + seconds + " seconds", "trace");
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

(() => {
    // Open the default web browser to the app
    logger.log("Opening the default web browser to the app", "info");
    let child_process = require("child_process");
    let _url = require("url");
    function browseURL(url) {
        logger.log("Browsing URL: " + url, "debug");
        var validatePath = isValidateUrl(url);
        logger.log("Is URL valid: " + validatePath, "debug");
        if (!validatePath) { return null; }
        logger.log("Process platform: " + process.platform, "debug");
        var start = (process.platform == "darwin" ? "open" : process.platform == "win32" ? "start" : "xdg-open");
        logger.log("Start command: " + start, "trace");
        var childProcess = child_process.exec(start + " " + validatePath, function (err) {
            if (err) { console.error("\r\n", err); }
        });
        return childProcess;

    }
    function isValidateUrl(url) {
        let strPath = _url.toString(url);
        logger.log("URL: " + strPath, "trace");
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
    logger.log("Saving FlashCards...", "info");
    flashcard_db.saveCollections();
    logger.log("Exiting...", "info");
    logger.finalize();
    process.exit();
}

// Catch all the ways the program can exit
process.on('SIGINT', EXIT);
process.on('SIGTERM', EXIT);
process.on('uncaughtException', EXIT);
process.on('SIGHUP', EXIT);
process.on('exit', async () => {
});