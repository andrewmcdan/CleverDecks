const socketMessageTypes = ["CardGenerationInProgress", "WrongAnswerGenerationInProgress", "stop", "UnknownMessageType"];

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
 * @method toJSON - returns a plain object representation of the FlashCard
 * @method toString - returns a string representation of the FlashCard
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

    /**
     * @method toJSON
     * @returns {Object} - a plain object representation of the FlashCard
     */
    toJSON() {
        return {
            id: this.id,
            question: this.question,
            answer: this.answer,
            tags: this.tags,
            difficulty: this.difficulty,
            collection: this.collection,
            dateCreated: this.dateCreated,
            dateModified: this.dateModified,
            dateLastStudied: this.dateLastStudied,
            timesStudied: this.timesStudied,
            timesCorrect: this.timesCorrect,
            timesIncorrect: this.timesIncorrect,
            timesSkipped: this.timesSkipped,
            timesFlagged: this.timesFlagged
        };
    }

    /**
     * @method toString
     * @returns {String} - the question on the front of the card
     */
    toString() {
        // TODO: implement a better toString method. It should return a string representation that includes localestrings for the date properties
    }
}

function getLineNumber() {
    try {
        throw new Error();
    } catch (e) {
        let stack = e.stack;
        let stackLines = stack.split('\n');
        let line = stackLines[2];
        let lineParts = line.split(':');
        let lineNumber = lineParts[lineParts.length - 2];
        return lineNumber;
    }
}

// This weird mess is to make the FlashCard class available to both the browser and Node.js
if(typeof module !== 'undefined' && module.exports) module.exports = {FlashCard, socketMessageTypes, getLineNumber};