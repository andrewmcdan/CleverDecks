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
        let str = "Question: " + this.question + "\n";
        str += "Answer: " + this.answer + "\n";
        str += "Tags: " + this.tags.join(", ") + "\n";
        str += "Difficulty: " + this.difficulty + "\n";
        str += "Collection: " + this.collection + "\n";
        str += "Date Created: " + (new Date(this.dateCreated).toLocaleString()) + "\n";
        str += "Date Modified: " + (new Date(this.dateModified).toLocaleString()) + "\n";
        str += "Date Last Studied: " + (new Date(this.dateLastStudied).toLocaleString()) + "\n";
        str += "Times Studied: " + this.timesStudied + "\n";
        str += "Times Correct: " + this.timesCorrect + "\n";
        str += "Times Incorrect: " + this.timesIncorrect + "\n";
        str += "Times Skipped: " + this.timesSkipped + "\n";
        str += "Times Flagged: " + this.timesFlagged + "\n";
        return str;
    }
}

function getLineNumber() {
    // This is a hack to get the line number of the caller. It's not perfect, but it works for now.
    // A better method would be to do a sort of compiling of the code, and write the line number into the code as a string. 
    // TODO: implement this ^^. it would work with pkg then, and be more performant. maybe this is something that should only be done for the production build.
    let stack = new Error().stack;
    // console.log({stack}); // TODO: pkg gets rid of the line numbers in the stack trace. This is a minor problem.
    let stackLines = stack.split("\n");
    // find the line with common.js in it
    let lineN = 0;
    for (let i = 0; i < stackLines.length; i++) {
        if (stackLines[i].includes("common.js")) {
            lineN = i;
            break;
        }
    }
    let line = stackLines[lineN + 1];
    let lineParts = line.split(":");
    let lineNumber = lineParts[lineParts.length - 2];
    return lineNumber;
    
}

// This was a suggestion by ChatGPT
function levenshteinDistance(a, b, toLower = true, weighted = true) {
    if (toLower === true) { a = a.toLowerCase(); b = b.toLowerCase(); }
    const initialWeight = weighted ? 3 : 1; // Weight for the initial characters
    const initialCharacters = a.length / 3; // Number of initial characters considered more important
    let weightFactor = 1;
    const matrix = [];
    for (let i = 0; i <= b.length; i++)matrix[i] = [i];
    for (let j = 0; j <= a.length; j++)matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++) {
        weightFactor = (j <= initialCharacters || i <= initialCharacters) ? initialWeight : 1;
        if (b[i - 1] === a[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
        else matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + weightFactor, // substitution
            matrix[i][j - 1] + weightFactor, // insertion
            matrix[i - 1][j] + weightFactor // deletion
        );
    }
    return matrix[b.length][a.length];
}


// This weird mess is to make the FlashCard class available to both the browser and Node.js
if (typeof module !== "undefined" && module.exports) module.exports = { FlashCard, socketMessageTypes, getLineNumber, levenshteinDistance };