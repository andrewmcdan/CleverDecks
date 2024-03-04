const os = require('node:os');
const fs = require('fs');
const path = require('path');
const fuzzyMatch = require('fastest-levenshtein');
const {FlashCard, getLineNumber} = require('./web/common.js');

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
     * @throws - if the logger is not given
     * @sideEffects - calls the loadCollection method which loads the flashcards from the collection into memory
     * @sideEffects - logs a message to the console
     */
    constructor(name, filePath, logger, largestId = 0) {
        if(logger === undefined) throw new Error("Logger is required");
        this.logger = logger;
        this.name = name;
        this.logger?.log(getLineNumber() + ".dbase.js	 - Creating flash card collection: " + name, "debug");
        this.logger?.log(getLineNumber() + ".dbase.js	 - File path: " + filePath, "trace");
        this.cards = [];
        this.largestId = largestId;
        this.filePath = filePath;
        this.logger?.log(getLineNumber() + ".dbase.js	 - File path: " + this.filePath, "trace");
        // adjust the file path for the environment
        // this.filePath = adjustPathForPKG(this.filePath);
        if (!this.loadCollection()) {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Flash card collection not found: " + name, "warn");
            throw new Error("Flash card collection not found: " + name);
        }
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
        this.logger?.log(getLineNumber() + ".dbase.js	 - Loading flash card collection: " + this.name, "debug");
        this.logger?.log(getLineNumber() + ".dbase.js	 - File path: " + this.filePath, "trace");
        if (fs.existsSync(this.filePath)) {
            let data = fs.readFileSync(this.filePath, 'utf8');
            let backupPath = this.filePath + "-" + (new Date().toLocaleString().replace(/:/g, '-').replace(/ /g, '_').replace(/\//g, '-')).replace(',','') + '.bak';
            try {
                fs.copyFileSync(this.filePath, backupPath);
                this.logger?.log(getLineNumber() + ".dbase.js	 - Created backup of " + this.filePath, "debug");
                // delete old backups. We keep the 2 most recent backups
                let metadataFolder = path.join(this.dataPath, 'flashcards');
                let files = fs.readdirSync(path.join(metadataFolder));
                files = files.filter((file) => file.startsWith(this.name + '.json-'));
                if (files.length > 2) {
                    // delete the oldest backups. We keep the 2 most recent backups
                    this.logger?.log(getLineNumber() + ".dbase.js	 - Deleting old backups of " + this.name + ".json", "debug");
                    // sort the files by creation date
                    files.sort((a, b) => {
                        let aDate = new Date(a.split('-').pop().split('.').shift().replace(/_/g, ' '));
                        let bDate = new Date(b.split('-').pop().split('.').shift().replace(/_/g, ' '));
                        return aDate - bDate;
                    });
                    for (let i = 0; i < files.length - 2; i++) {
                        fs.unlinkSync(path.join(metadataFolder, files[i]));
                        this.logger?.log(getLineNumber() + ".dbase.js	 - Deleted old backup: " + files[i], "trace");
                    }
                }
            } catch (err) {
                this.logger?.log(getLineNumber() + ".dbase.js	 - Error creating backup of " + this.name + ".json: " + err, "error");
            }
            try {
                let cards = JSON.parse(data);
                this.logger?.log(getLineNumber() + ".dbase.js	 - Loaded flash card collection: " + this.name, "debug");
                cards.forEach((card) => {
                    let newCard;
                    try {
                        newCard = new FlashCard(card);
                    } catch (err) {
                        this.logger?.log(getLineNumber() + ".dbase.js	 - Error loading flash card: " + card.id + " - " + err, "error");
                    }
                    newCard.id = ++this.largestId;
                    this.cards.push(newCard);
                });
                return true;
            } catch (err) {
                this.logger?.log(getLineNumber() + ".dbase.js	 - Error loading flash card collection: " + this.name + " - " + err, "error");
                return false;
            }
        } else {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Flash card collection not found: " + this.name, "warn");
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
            this.logger?.log(getLineNumber() + ".dbase.js	 - Card does not belong to this collection: " + this.name, "error");
            return false;
        }
        if (cardData.id === undefined || cardData.id === null) {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Card id is required to update a card", "error");
            return false;
        }
        let index = this.cards.findIndex(card => card.id === cardData.id);
        if (index !== -1) {
            this.cards[index] = cardData;
            return this.saveCollection();
        } else {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Card not found in collection: " + this.name, "error");
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
            this.logger?.log(getLineNumber() + ".dbase.js	 - Card id is required to delete a card", "error");
            return false;
        }
        if (cardData.collection !== this.name) {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Card does not belong to this collection: " + this.name, "error");
            return false;
        }
        let index = this.cards.findIndex(card => card.id === cardID);
        if (index !== -1) {
            this.cards.splice(index, 1);
            return this.saveCollection();
        } else {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Card not found in collection: " + this.name, "error");
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
        this.logger?.log(getLineNumber() + ".dbase.js	 - Saving flash card collection: " + this.name, "debug");
        this.logger?.log(getLineNumber() + ".dbase.js	 - File path: " + this.filePath, "trace");
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.cards, null, 2), 'utf8');
            this.logger?.log(getLineNumber() + ".dbase.js	 - Saved flash card collection: " + this.name, "debug");
            return true;
        } catch (err) {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Error saving flash card collection: " + this.name + " - " + err, "error");
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
        this.logger?.log(getLineNumber() + ".dbase.js	 - Getting card by id: " + id, "debug");
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
            // TODO: regex search
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
    constructor(logger, dataPath, overrideLock = false) {
        if(logger === undefined) throw new Error("Logger is required");
        this.dataPath = dataPath;
        if(!fs.existsSync(this.dataPath)) throw new Error("Data path does not exist: " + this.dataPath);
        this.logger = logger;
        this.collections = [];
        this.largestId = 0;
        this.allTags = [];
        this.loadCollections(overrideLock);
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
    loadCollections(overrideLock = false) {
        let metadataFolder = path.join(this.dataPath, 'flashcards');
        if(!fs.existsSync(metadataFolder)) fs.mkdirSync(metadataFolder, { recursive: true });
        let lockFilePath = path.join(metadataFolder, 'metadata.lock');
        if (fs.existsSync(lockFilePath)) {
            this.logger?.log(getLineNumber() + ".dbase.js	 - metadata is locked", "error");
            if(!overrideLock) throw new Error("metadata is locked");
            else{
                this.logger?.log(getLineNumber() + ".dbase.js	 - metadata lock overridden", "warn");
                fs.unlinkSync(lockFilePath);
            }
        }
        fs.writeFileSync(lockFilePath, 'locked');
        let metadataPath = path.join(metadataFolder, 'metadata.json');
        // metadataPath = adjustPathForPKG(metadataPath);
        if (fs.existsSync(metadataPath)) {
            let data = fs.readFileSync(metadataPath, 'utf8');
            // save a backup of the metadata file
            let backupPath = path.join(metadataFolder, 'metadata.json-' + (new Date().toLocaleString().replace(/:/g, '-').replace(/ /g, '_').replace(/\//g, '-').replace(',','') + '.bak'));
            try {
                fs.copyFileSync(metadataPath, backupPath);
                this.logger?.log(getLineNumber() + ".dbase.js	 - Created backup of metadata.json", "debug");
                // delete old backups. We keep the 5 most recent backups
                let files = fs.readdirSync(path.join(metadataFolder));
                files = files.filter((file) => file.startsWith('metadata.json-'));
                if (files.length > 5) {
                    // delete the oldest backups
                    this.logger?.log(getLineNumber() + ".dbase.js	 - Deleting old backups of metadata.json", "debug");
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
                this.logger?.log(getLineNumber() + ".dbase.js	 - Error creating backup of metadata.json: " + err, "error");
            }
            try {
                let collections = JSON.parse(data);
                this.logger?.log(getLineNumber() + ".dbase.js	 - Loaded flash card collections metadata.json", "debug");
                collections.forEach((collection) => {
                    let newCollection = new FlashCardCollection(collection.name, collection.path, this.logger, this.largestId);
                    if (newCollection.largestId > this.largestId) this.largestId = newCollection.largestId;
                    newCollection.cards.forEach((card) => {
                        card.tags.forEach((tag) => {
                            if (!this.allTags?.includes(tag)) this.allTags.push(tag);
                        });
                    });
                    this.collections.push(newCollection);
                });
                this.logger?.log(getLineNumber() + ".dbase.js	 - Alltags: \n" + JSON.stringify(this.allTags, 2, null), "debug");
                return true;
            } catch (err) {
                this.logger?.log(getLineNumber() + ".dbase.js	 - Error loading flash card collections: " + err, "error");
                return false;
            }
        } else {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Flash card collections metadata.json not found", "warn");
            this.logger?.log(getLineNumber() + ".dbase.js	 - Creating new flash card collections metadata.json", "debug");
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
        this.logger?.log(getLineNumber() + ".dbase.js	 - Getting collection names", "debug");
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
        this.logger?.log(getLineNumber() + ".dbase.js	 - Adding card to database:", "debug");
        this.logger?.log(JSON.stringify(cardData, 2, null), "debug");
        let collection = this.collections.find(collection => collection.name === cardData.collection);
        if (collection === undefined) {
            // add a new collection
            this.logger?.log(getLineNumber() + ".dbase.js	 - Collection not found: " + cardData.collection, "warn");
            let metadataFolder = path.join(this.dataPath, 'flashcards');
            collection = new FlashCardCollection(cardData.collection, path.join(metadataFolder, cardData.collection + '.json'), this.logger);
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
            this.logger?.log(getLineNumber() + ".dbase.js	 - New path: " + path, "debug");
            // add a new collection
            collection = new FlashCardCollection(cardData.collection, newPath, this.logger);
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
            this.logger?.log(getLineNumber() + ".dbase.js	 - Collection not found: " + cardData.collection, "error");
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
            this.logger?.log(getLineNumber() + ".dbase.js	 - Collection not found: " + params.collection, "warn");
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
        this.logger?.log(getLineNumber() + ".dbase.js	 - Getting count of cards", "debug");
        this.logger?.log(getLineNumber() + ".dbase.js	 - Params: " + JSON.stringify(params), "trace");
        if(params.hasOwnProperty('all') && params.all == true || params.all == "true") return this.getCountOfAllCards();
        let collection = this.collections.find(collection => collection.name === params.collection);
        if (collection === undefined) {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Collection not found: " + params.collection, "warn");
            return 0;
        }
        this.logger?.log(getLineNumber() + ".dbase.js	 - Collection found: " + collection.name, "debug");
        return collection.getCards(params).length;
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
        this.logger?.log(getLineNumber() + ".dbase.js	 - Getting count of all cards", "debug");
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
        let metadataFolder = path.join(this.dataPath, 'flashcards');
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

    finalize() {
        this.logger?.log(getLineNumber() + ".dbase.js	 - Finalizing FlashCardDatabase", "debug");
        this.logger?.log(getLineNumber() + ".dbase.js	 - Saving collections", "trace");
        this.saveCollections();
        if(fs.existsSync(path.join(this.dataPath, 'flashcards', 'metadata.lock'))) {
            this.logger?.log(getLineNumber() + ".dbase.js	 - Removing lock file", "debug");
            fs.unlinkSync(path.join(this.dataPath, 'flashcards', 'metadata.lock'));
        }
        this.logger?.log(getLineNumber() + ".dbase.js	 - FlashCardDatabase finalized", "debug");
    }
}

module.exports = FlashCardDatabase;