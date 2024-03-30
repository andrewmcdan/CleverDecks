/* eslint-disable no-prototype-builtins */
const fs = require("fs"); // import the fs module, which is a module for interacting with the file system
const os = require("node:os"); // import the os module, which is a module for interacting with the operating system
const express = require("express"); // import the express module, which is a module for creating web servers
const http = require("http"); // import the http module, which is a module for creating an HTTP server
const _url = require("url"); // import the url module, which is a module for working with URLs
const socketio = require("socket.io"); // import the socket.io library, which is a library for real-time web applications. It enables real-time, bidirectional and event-based communication between web clients and servers.
const app = express(); // create an express app, which is a web server framework for Node.js
const cookieParser = require("cookie-parser");
app.use(cookieParser()); // cookie parser middleware, for parsing browser cookies
const server = http.createServer(app);
const io = socketio(server);
const net = require("net"); // import the net module, which is a module for creating TCP servers and clients
const path = require("path"); // import the path module, which is a module for working with file paths
const bonjour = require("bonjour")(); // import the bonjour module, which is a module for creating and publishing mDNS services
const cleverDecksHostname = "cleverdecks.local";
(async () => {
    // this loads the API key from the .env file. 
    // For development, you should create a .env file in the root directory of the project and add the following line to it:
    // OPENAI_SECRET_KEY=your-api-key
    require("dotenv").config();
    // determine what ports are available
    let tempPort = 0;
    let portRange = [1024, 49151];
    const checkPortAvailability = (port) => {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.listen(port, () => {
                server.close();
                resolve(true); // Port is available
            });
            server.on("error", (e) => {
                if (e.code === "EADDRINUSE") {
                    resolve(false); // Port is in use
                } else {
                    reject(e); // Some other error occurred
                }
            });
        });
    };
    console.log("Checking for available ports...");
    process.stdout.write("Checking port: ");
    for (let i = portRange[0]; i < portRange[1]; i++) {
        process.stdout.write(i + " ".repeat(6 - String(i).length));
        process.stdout.moveCursor(-6, 0);
        let available = false;
        try {
            available = await checkPortAvailability(i);
        } catch (err) {
            // just eat the error, om nom nom
        }
        if (available) {
            tempPort = i;
            break;
        }
    }
    // if no ports are available, exit the app
    if (tempPort === 0) {
        console.error("No ports available");
        process.exit();
    }
    const port = process.env.PORT || tempPort; // set the port to the value of the PORT environment variable, or to the first available port in the range of 1024 to 49151
    const { FlashCard, socketMessageTypes, getLineNumber } = require("./web/common.js");
    process.title = "CleverDecks";
    ////////////////////////////////////////////////////////////////// Create data directory //////////////////////////////////////////////////////////////////////////////
    if (!fs.existsSync(path.join(os.homedir(), "CleverDecks"))) {
        fs.mkdirSync(path.join(os.homedir(), "CleverDecks"), { recursive: true });
    }
    if (!fs.existsSync(path.join(os.homedir(), "CleverDecks"))) {
        throw new Error("Failed to create the CleverDecks directory");
    }
    //////////////////////////////////////////////////////////////////// Logging //////////////////////////////////////////////////////////////////////////////////////////
    const consoleLogging = true;
    // const logFile = 'logs.txt';
    // logLevel, 0-5 or "off", "info", "warn", "error", "debug", "trace"
    const logLevel = process.env.LOG_LEVEL;
    const { Logger, logLevels } = require("./logger.js");
    const logLevelNumber = logLevels.indexOf(logLevel);
    const logPath = path.join(os.homedir(), "CleverDecks", "logs.txt");
    const logger = logLevelNumber > 0 ? new Logger(consoleLogging, logLevel, logPath) : null; // create a new logger object. This must remain at/near the top of the file. If the logger is off, the logger object will be null and no logs will be created.
    ///////////////////////////////////////////////////////////////////// ChatGPT /////////////////////////////////////////////////////////////////////////////////////////
    const fakeGPT = process.env.CHATGPT_DEV_MODE === true || process.env.CHATGPT_DEV_MODE === "true";
    const ChatGPT = require("./chatGPT.js");
    const chatbot = new ChatGPT(logger, process.env.OPENAI_SECRET_KEY, fakeGPT);
    //////////////////////////////////////////////////////////////// FlashCardDatabase ////////////////////////////////////////////////////////////////////////////////////
    const FlashCardDatabase = require("./dbase.js"); // import the FlashCardDatabase class
    const defaultDataPath = path.join(os.homedir(), "CleverDecks"); // set the default data path to the user's home directory
    const dataPath = process.env.DATA_PATH || defaultDataPath; // set the data path to the value of the DATA_PATH environment variable, or to the defaultDataPath if the environment variable is not set
    const dataBaseProgressCallback = (progress) => {
        logger?.log(getLineNumber() + ".index.js	 - FlashCardDatabase loading progress: " + Math.floor(progress) + "%", "info");
    };
    let flashcard_db; // create a variable to hold the flashcard database
    try {
        flashcard_db = new FlashCardDatabase(logger, dataPath, dataBaseProgressCallback); // create a new FlashCardDatabase object
    } catch (err) {
        logger?.log(getLineNumber() + ".index.js	 - Error creating FlashCardDatabase: " + err, "error");
        if (err.message === "metadata is locked") process.stdout.write("The flashcard database is locked. Please close any other instances of the app and try again.\n");
        process.exit();
        // exit the app if there was an error creating the FlashCardDatabase object. 
        // This is a fatal error and was likely due to there being a lock on the metadata file.
    }


    //////////////////////////////////////////////////////////////// Server endpoints /////////////////////////////////////////////////////////////////////////////////////
    // TODO: Add metadata location changing endpoint

    /**
     * @description - api endpoint to set the server port and update the .env file
     * @listens GET /api/setNewServerPort
     * @param {number} newPort - the new port to set
     * @returns {object} - JSON object with the status of the request
     */
    app.get("/api/setNewServerPort", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /api/setNewServerPort", "debug");
        req.on("data", (data) => {
            const newPort = data.newPort;
            if (newPort === undefined) {
                res.send({ status: "error", reason: "newPort not found" });
                logger?.log(getLineNumber() + ".index.js	 - newPort not found", "error");
                return;
            }
            if (typeof newPort !== "number") {
                res.send({ status: "error", reason: "newPort is not a number" });
                logger?.log(getLineNumber() + ".index.js	 - newPort is not a number", "error");
                return;
            }
            if (newPort <= 1024 || newPort >= 49151) {
                res.send({ status: "error", reason: "newPort is out of range" });
                logger?.log(getLineNumber() + ".index.js	 - newPort is out of range", "error");
                return;
            }
            logger?.log(getLineNumber() + ".index.js	 - Setting new server port: " + newPort, "debug");
            if (updateEnvFile("PORT", newPort)) {
                server.close(() => {
                    server.listen(newPort);
                });
                res.send({ status: "ok" });
            } else {
                res.send({ status: "error", reason: "error updating .env file" });
                logger?.log(getLineNumber() + ".index.js	 - Error updating .env file", "error");
            }
        });
    });

    /**
     * @description - api endpoint to interpret a math expression or array of math expressions
     * @listens GET /api/interpretMath
     * @param {string|Array} expression - the math expression to interpret or an array of math expressions
     * @returns {object} - JSON object with the interpreted math expression(s)
     */
    app.get("/api/interpretMath", async (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /api/interpretMath", "debug");
        const data = req.query;
        let inExpression = data.expression;
        if (inExpression === undefined) {
            res.send({ status: "error", reason: "expression not found" });
            logger?.log(getLineNumber() + ".index.js	 - Expression not found", "error");
            return;
        }
        logger?.log(getLineNumber() + ".index.js	 - Interpreting math expression: " + inExpression, "trace");
        let result = null;
        try {
            result = await chatbot.interpretMathExpression(inExpression);
        } catch (err) {
            logger?.log(getLineNumber() + ".index.js	 - Error interpreting math expression: " + err, "error");
            res.send({ status: "error", reason: err });
        }
        logger?.log(getLineNumber() + ".index.js	 - Math expression interpreted: " + result, "trace");
        res.send({ status: "ok", result: result });
    });

    /**
     * @description - api endpoint to get flash cards
     * @listens GET /api/getCards
     * @param {number} numberOfCards - the number of cards to get
     * @param {number} offset - the number of cards to skip
     * @param {string} collection - the name of the collection to get cards from
     * @param {string} tags - a comma separated list of tags to filter by
     * @param {number} difficulty - a number from 1 to 5 to filter by
     * @param {string} search - a string to search for in the question or answer
     * @param {string} dateCreatedRange - a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date created
     * @param {string} dateModifiedRange - a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date modified
     * @returns {object} - JSON object with the card data, array of flash cards
     */
    app.get("/api/getCards", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /api/getCards", "debug");
        let requestParams = req.query;
        if (requestParams.numberOfCards === undefined) requestParams.numberOfCards = 10;
        if (requestParams.offset === undefined) requestParams.offset = 0;
        if (requestParams.collection === undefined) requestParams.collection = null;
        if (requestParams.tags === undefined) requestParams.tags = null;
        if (typeof requestParams.tags === "string") requestParams.tags = requestParams.tags.split(",");
        if (requestParams.difficulty === undefined) requestParams.difficulty = null;
        if (requestParams.search === undefined) requestParams.search = null;
        if (requestParams.dateCreatedRange === undefined) requestParams.dateCreatedRange = null;
        if (requestParams.dateModifiedRange === undefined) requestParams.dateModifiedRange = null;
        if (requestParams.all === undefined) requestParams.all = false;
        // if (requestParams.method === undefined) requestParams.method = "AND";
        let cards = flashcard_db.getCards(requestParams, requestParams.method);
        let offset = requestParams.offset;
        let numberOfCards = requestParams.numberOfCards;
        cards = cards.slice(offset, offset + numberOfCards);
        res.send({ status: "ok", cards: cards });
    });

    /**
     * @description - api endpoint to get the names of the collections
     * @listens GET /api/getCollections
     * @returns {object} - JSON object with the names of the collections
     * @requires - none
     */
    app.get("/api/getCollections", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /api/getCollections", "debug");
        // get the collection names from the flash card database class
        let collectionNames = flashcard_db.getCollectionNames();
        res.send({ status: "ok", collections: collectionNames });
    });

    /**
     * @description - api endpoint to save new flash cards
     * @listens POST /api/saveNewCards
     * @param {Array} cardData - the card data to save
     * @returns {object} - JSON object with the status of the request
     * @requires - cardData - an array of flash cards
     */
    app.post("/api/saveNewCards", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - POST /api/saveNewCards", "debug");
        req.on("data", (data) => {
            const cardData = JSON.parse(data);
            logger?.log(getLineNumber() + ".index.js	 - Saving new flash card: " + JSON.stringify(cardData, 2, null).substring(0, 100) + "...", "debug");
            if (!Array.isArray(cardData)) {
                res.send({ status: "error", reason: "Invalid data. Expected an array of cards." });
                logger?.log(getLineNumber() + ".index.js	 - Invalid card data", "error");
                return;
            }
            logger?.log(getLineNumber() + ".index.js	 - Number of cards being saved: " + cardData.length, "trace");
            let success = true;
            let newCard;
            for (let i = 0; i < cardData.length; i++) {
                newCard = new FlashCard(cardData[i]);
                logger?.log(getLineNumber() + ".index.js	 - Saving card: " + JSON.stringify(cardData[i], 2, null).substring(0, 100), "trace");
                if (!flashcard_db.addCard(newCard)) {
                    success = false;
                    logger?.log(getLineNumber() + ".index.js	 - Error saving card: " + JSON.stringify(cardData[i], 2, null), "error");
                }
            }
            if (success) {
                res.send({ status: "ok" , card: newCard });
            } else {
                res.send({ status: "error", reason: "error saving card" });
            }
        });
    });

    /**
     * @description - api endpoint to delete a flash card
     * @listens POST /api/deleteCard
     * @param {object} cardData - the card data to delete
     * @returns {object} - JSON object with the status of the request
     */
    app.post("/api/deleteCard", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - POST /api/deleteCard", "debug");
        req.on("data", (data) => {
            const cardData = JSON.parse(data);
            // find the card in the database and delete it
            const id = parseInt(cardData.id);
            logger?.log(getLineNumber() + ".index.js	 - Deleting flashcard with id: " + id, "trace");
            if (Number.isNaN(id) || id < 0) {
                logger?.log(getLineNumber() + ".index.js	 - Invalid card id", "error");
                res.send({ status: "error", reason: "invalid id" });
                return;
            }
            const card = flashcard_db.getCardById(cardData.id);
            if (card === null || card === undefined) {
                res.send({ status: "error", reason: "card not found" });
                logger?.log(getLineNumber() + ".index.js	 - Card not found", "error");
                return;
            }
            const success = flashcard_db.deleteCard(id);
            logger?.log(getLineNumber() + ".index.js	 - Card deleted: " + success, "debug");
            res.send({ status: "ok", card: card, success: success });
        });
    });

    /**
     * @description - api endpoint to update a flash card
     * @listens POST /api/updateCard
     * @param {object} cardData - the card data to update
     * @returns {object} - JSON object with the status of the request
     * @requires - cardData.id - the id of the card to update
     */
    app.post("/api/updateCard", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - POST /api/updateCard", "debug");
        req.on("data", (data) => {
            const cardData = JSON.parse(data);
            const id = parseInt(cardData.id);
            logger?.log(getLineNumber() + ".index.js	 - Updating flashcard with id: " + id, "trace");
            if (Number.isNaN(id) || id < 0) {
                res.send({ status: "error", reason: "invalid id" });
                logger?.log(getLineNumber() + ".index.js	 - Invalid card id", "error");
                return;
            }
            const oldCard = flashcard_db.getCardById(cardData.id);
            if (oldCard === null || oldCard === undefined) {
                res.send({ status: "error", reason: "card not found" });
                logger?.log(getLineNumber() + ".index.js	 - Card not found", "error");
                return;
            }
            const success = flashcard_db.updateCard(cardData);
            const newCard = flashcard_db.getCardById(cardData.id);
            logger?.log(getLineNumber() + ".index.js	 - Card updated: " + success, "debug");
            logger?.log(getLineNumber() + ".index.js	 - Old card: " + JSON.stringify(oldCard, 2, null), "trace");
            logger?.log(getLineNumber() + ".index.js	 - New card: " + JSON.stringify(newCard, 2, null), "trace");
            res.send({ status: "ok", oldCard: oldCard, newCard: newCard, success: success });
        });
    });

    /**
     * @description - api endpoint to generate flash cards from a given text
     * @listens POST /api/generateCards
     * @param {string} text - the text to generate flash cards from
     * @param {number} numberOfCards - the number of flash cards to generate
     * @param {number} difficulty - the difficulty of the flash cards to generate
     * @returns {Array} - an array of flash cards
     * @requires - socketId cookie
     */
    app.post("/api/generateCards", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - POST /api/generateCards", "debug");
        req.on("data", async (data) => {
            const dataObj = JSON.parse(data);
            const socketId = req.cookies.socketId;
            if (dataObj.text === undefined) res.send({ status: "error", reason: "text property not found" });
            else if (dataObj.text === "") res.send({ status: "empty" });
            else {
                console.log({ dataObj });
                const text = dataObj.text;
                const numberOfCards = parseInt(dataObj.numberOfCards);
                const difficulty = parseInt(dataObj.difficulty);
                const server = ioServers.find((server) => server.id === socketId);
                let streaming_cb = (chunk) => {
                    if (server !== undefined) server.socket.emit("message", { type: socketMessageTypes[0], data: { status: "working", chunk: chunk } });
                    else streaming_cb = null;
                };
                let cards = await chatbot.flashCardGenerator(text, numberOfCards, difficulty, streaming_cb, true);
                if (server !== undefined) server.socket.emit("message", { type: socketMessageTypes[2], data: { status: "done" } });
                res.send({ cards: cards, status: "ok" });
            }
        });
    });

    /**
     * @description - api endpoint to get wrong answers for a given card
     * @listens GET /api/getWrongAnswers
     * @param {string} cardId - the id of the card to get wrong answers for
     * @param {number} numberOfAnswers - the number of wrong answers to get
     * @returns {Array} - an array of wrong answers
     * @requires - socketId cookie
     */
    app.get("/api/getWrongAnswers", async (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /api/getWrongAnswers", "debug");
        const requestParams = req.query;
        const cookies = req.cookies;
        const socketId = cookies.socketId;
        // call the wrongAnswerGenerator function and send the generated wrong answers
        const numberOfAnswers = requestParams.numberOfAnswers;
        const cardId = requestParams.cardId;
        const card = flashcard_db.getCardById(cardId);
        if (card !== null && card !== undefined) {
            let chatRes;
            try {
                let server = ioServers.find((server) => server.id === socketId);
                let streaming_cb = (chunk) => {
                    if (server !== undefined) server.socket.emit("message", { type: socketMessageTypes[1], data: { status: "working", chunk: chunk } });
                    else streaming_cb = null;
                };
                chatRes = await chatbot.wrongAnswerGenerator(card, numberOfAnswers, streaming_cb);
                if (server !== undefined) server.socket.emit("message", { type: socketMessageTypes[2], data: { status: "done" } });
            } catch (err) {
                logger?.log(getLineNumber() + ".index.js	 - Error generating wrong answers: " + err, "error");
                res.send({ status: "error", reason: err, answers: [] });
            }
            res.send({ answers: chatRes, status: "ok" });
        } else {
            res.send({ answers: [], status: "error", reason: "card not found" });
        }
    });

    /**
     * @description - api endpoint to rephrase a given text
     * @listens GET /api/rephrase
     * @param {string} text - the text to rephrase
     * @returns {string} - the rephrased text
     * @requires - socketId cookie
     */
    app.get("/api/rephrase", async (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /api/rephrase", "debug");
        const requestParams = req.query;
        const cookies = req.cookies;
        const socketId = cookies.socketId;
        const text = requestParams.text;
        const server = ioServers.find((server) => server.id === socketId);
        let streaming_cb = (chunk) => {
            if (server !== undefined) server.socket.emit("message", { type: socketMessageTypes[0], data: { status: "working", chunk: chunk } });
            else streaming_cb = null;
        };
        let chatRes = await chatbot.rephraseText(text, streaming_cb);
        if (server !== undefined) server.socket.emit("message", { type: socketMessageTypes[2], data: { status: "done" } });
        res.send({ rephrased: chatRes, status: "ok" });
    });

    /**
     * @description - api endpoint to get the number of cards that match the given parameters
     * @listens GET /api/getCardCount
     * @param {boolean} all - if true, returns the total number of cards in the database
     * @param {string} collection - the name of the collection to get cards from
     * @param {string} tags - a comma separated list of tags to filter by
     * @param {number} difficulty - a number from 1 to 5 to filter by
     * @param {string} search - a string to search for in the question or answer
     * @param {string} dateCreatedRange - a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date created
     * @param {string} dateModifiedRange - a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date modified
     * @returns {object} - JSON object with the number of cards that match the given parameters
     */
    app.get("/api/getCardCount", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /api/getCardCount", "debug");
        let requestParams = req.query;
        if (requestParams.collection === undefined) requestParams.collection = null;
        if (requestParams.tags === undefined) requestParams.tags = null;
        if (typeof requestParams.tags === "string") requestParams.tags = requestParams.tags.split(",");
        if (requestParams.difficulty === undefined) requestParams.difficulty = null;
        if (requestParams.search === undefined) requestParams.search = null;
        if (requestParams.dateCreatedRange === undefined) requestParams.dateCreatedRange = null;
        if (requestParams.dateModifiedRange === undefined) requestParams.dateModifiedRange = null;
        if (requestParams.all === undefined) requestParams.all = false;
        if (requestParams.method === undefined) requestParams.method = "AND";
        if (requestParams.hasOwnProperty("id")) {
            if (flashcard_db.getCardById(requestParams.id) === null) {
                logger?.log(getLineNumber() + ".index.js	 - Card not found", "warn");
                res.send({ status: "ok", count: 0 });
                return;
            } else {
                logger?.log(getLineNumber() + ".index.js	 - Card " + requestParams.id + " found", "debug");
                res.send({ status: "ok", count: 1 });
                return;
            }
        }
        let count = flashcard_db.getCountOfCards(requestParams, requestParams.method);
        logger?.log(getLineNumber() + ".index.js	 - Returning count: " + count, "debug");
        res.send({ status: "ok", count: count });
    });

    /**
     * @description - api endpoint to get tags that match the given tag/partial tag
     * @listens GET /api/tagMatch
     * @param {string} tag - the tag or partial tag to match
     * @returns {object} - JSON object with the tags that match the given tag/partial tag
     */
    app.get("/api/tagMatch", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /api/tagMatch", "debug");
        logger?.log(getLineNumber() + ".index.js	 - Query: " + JSON.stringify(req.query), "trace");
        const tag = req.query.tag;
        if (typeof tag !== "string") {
            logger?.log(getLineNumber() + ".index.js	 - Invalid tag: " + tag, "error");
            res.send({ status: "error", reason: "invalid data type" });
        }
        let tagsMatchFuzzy = flashcard_db.tagMatchFuzzy(tag);
        let tagsMatchFirstChars = flashcard_db.tagMatchFirstChars(tag);
        let tagsExistExact = flashcard_db.tagExistsExact(tag);
        let tagsExistFuzzy = flashcard_db.tagExistsFuzzy(tag);
        res.send({ status: "ok", tagsMatchFuzzy: tagsMatchFuzzy, tagsMatchFirstChars: tagsMatchFirstChars, tagsExistExact: tagsExistExact, tagsExistFuzzy: tagsExistFuzzy });
    });

    /**
     * @description - api endpoint to get the value of apiKeyFound
     * @listens GET /api/getGPTenabled
     * @returns {object} - JSON object with the value of apiKeyFound
     */
    app.get("/api/getGPTenabled", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /api/getGPTenabled", "debug");
        res.send({ status: "ok", enabled: chatbot.apiKeyFound });
    });

    /**
     * @description - api endpoint to set the OpenAI API key
     * @listens POST /api/setGPTapiKey
     * @param {string} apiKey - the OpenAI API key
     * @returns {object} - JSON object with the status of the request
     */
    app.post("/api/setGPTapiKey", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - POST /api/setGPTapiKey", "debug");
        req.on("data", (data) => {
            const apiKey = JSON.parse(data).apiKey;
            logger?.log(getLineNumber() + ".index.js	 - Setting OpenAI API key, " + apiKey, "debug");
            if (chatbot.isValidOpenAIKey(apiKey)) {
                chatbot.setApiKey(apiKey);
                updateEnvFile("OPENAI_SECRET_KEY", apiKey);
                res.send({ status: "ok" });
            } else {
                res.send({ status: "error", reason: "invalid" });
            }
        });
    });

    /**
     * @description - api endpoint to add a log entry
     * @listens POST /api/addLogEntry
     * @param {string} message - the message to log
     * @param {string} level - the log level, one of "info", "warn", "error", "debug", "trace"
     */
    app.post("/api/addLogEntry", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - POST /api/addLogEntry", "trace");
        req.on("data", (data) => {
            const logEntry = JSON.parse(data);
            logger?.log(logEntry.message, logEntry.level);
            res.send({ status: "ok" });
        });
    });

    /**
     * @description - api endpoint to set the log level
     * @listens POST /api/setLogLevel
     * @param {string} logLevel - the log level, one of "off", "info", "warn", "error", "debug", "trace"
     * @returns {object} - JSON object with the status of the request
     */
    app.post("/api/setLogLevel", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - POST /api/setLogLevel", "debug");
        req.on("data", (data) => {
            let logLevel = null;
            const dataObj = JSON.parse(data);
            if (dataObj.hasOwnProperty("logLevel")) logLevel = dataObj.logLevel;
            else if (dataObj.hasOwnProperty("level")) logLevel = dataObj.level;
            if (logLevel === null) {
                res.send({ status: "error", reason: "log level not found" });
                logger?.log(getLineNumber() + ".index.js	 - Log level not found in request data", "error");
                return;
            }
            logger?.log(getLineNumber() + ".index.js	 - Attempting to set log level to " + logLevel, "debug");
            let success = logger?.setLogLevel(logLevel);
            if (success) {
                updateEnvFile("LOG_LEVEL", logLevel);
                res.send({ status: "ok" });
                logger?.log(getLineNumber() + ".index.js	 - Log level set to " + logLevel, "debug");
            } else {
                res.send({ status: "error", reason: "invalid log level" });
                logger?.log(getLineNumber() + ".index.js	 - Error setting log level to " + logLevel, "error");
            }
        });
    });

    /**
     * @description - 404 page
     * @listens GET /web/404.html
     * @returns {file} - the 404.html file
     */
    app.get("/web/404.html", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /web/404.html", "debug");
        res.sendFile(__dirname + "/web/404.html");
    });

    /**
     * @description - serve static files
     * @listens GET /
     * @listens GET /web/*
     * @returns {file} - the index.html file
     */
    app.get("/", (req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - GET /", "debug");
        // forward to /web/
        res.redirect("/web/index.html");
    });
    app.use("/web", express.static(adjustPathForPKG("web")));

    /**
     * @description - Not found handler
     * @listens GET *
     * @returns - redirect to 404.html
     */
    app.use((req, res) => {
        logger?.log(getLineNumber() + ".index.js	 - 404 - " + req.originalUrl, "warn");
        res.status(404).redirect(`/web/404.html?originalUrl=${req.originalUrl}`);
    });

    var ioServers = []; // use of var is intentional.

    /**
     * @description - socket.io connection
     * @listens connection
     * @param {object} socket - the socket object
     * @returns - nothing
     * @requires - ioServers (array of objects with socket and id properties)
     */
    io.on("connection", (socket) => {
        // generate random id
        let id = Math.random().toString(36).substring(7);
        socket.emit("message", { type: "socketId", data: id });
        ioServers.push({ socket: socket, id: id });
        // ioServer = socket;
        logger?.log(getLineNumber() + ".index.js	 - A user connected", "debug");
        socket.on("disconnect", () => {
            ioServers = ioServers.filter((server) => server.id !== id); // remove the disconnected server from the list
            logger?.log(getLineNumber() + ".index.js	 - User disconnected", "debug");
        });
        socket.on("message", (msg) => {
            logger?.log(getLineNumber() + ".index.js	 - Message: " + msg, "debug");
        });
    });



    // Get the local IP addresses of the computer
    const interfaces = require("os").networkInterfaces();
    let addresses = [];
    for (let k in interfaces) {
        for (let k2 in interfaces[k]) {
            let address = interfaces[k][k2];
            if (address.family === "IPv4" && !address.internal) {
                addresses.push(address.address);
            }
        }
    }

    /**
     * @description - start the server
     * @listens listen
     * @param {number} port - the port to listen on
     * @returns - nothing
     * @requires - server
     */
    server.listen(port, () => {
        // logger?.log(`If you are using a web browser on the same computer as the app, you can use the following address:`)
        // logger?.log(`http://localhost:${port}`)
        logger?.log(getLineNumber() + ".index.js	 - If you are using a web browser on a different computer (or mobile device) on the same network, open your browser to " + cleverDecksHostname + ":" + port);
        logger?.log(getLineNumber() + "If that doesn't work, you can try the following addresses:");
        addresses.forEach((address) => {
            logger?.log(`${getLineNumber()}.index.js \t- http://${address}:${port}`);
        });
    });

    bonjour.publish({ name: "CleverDecks", type: "http", port: port, host: cleverDecksHostname, txt: { "path": "/web/index.html" } });


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
        logger?.log(getLineNumber() + ".index.js	 - Updating .env file", "debug");
        if (typeof key !== "string" || typeof value !== "string") return false;
        const path = adjustPathForPKG(".env");
        logger?.log(getLineNumber() + ".index.js	 - Path: " + path, "trace");
        let fileContents = "";
        if (fs.existsSync(path)) {
            fileContents = fs.readFileSync(path, "utf8");
            logger?.log(getLineNumber() + ".index.js	 - File read", "trace");
        }
        let lines = fileContents.split("\n");
        let found = false;
        for (let i = 0; i < lines.length; i++) {
            logger?.log(getLineNumber() + ".index.js	 - Line " + i + ": " + lines[i], "trace");
            if (lines[i].indexOf(key) === 0) {
                logger?.log(getLineNumber() + ".index.js	 - Key found", "trace");
                lines[i] = key + (typeof value == "string" ? "=\"" : "=") + value + (typeof value == "string" ? "\"" : "");
                found = true;
                break;
            }
        }
        if (!found) {
            lines.push(key + (typeof value == "string" ? "=\"" : "=") + value + (typeof value == "string" ? "\"" : ""));
        }
        fileContents = lines.join("\n");
        try {
            fs.writeFileSync(path, fileContents);
            logger?.log(getLineNumber() + ".index.js	 - File written", "trace");
            return true;
        } catch (e) {
            logger?.error(e);
            return false;
        }
    }
    // Open the default web browser to the app
    logger?.log(getLineNumber() + ".index.js	 - Opening the default web browser to the app", "info");
    const child_process = require("child_process");
    /**
     * @function browseURL
     * @description - opens the default web browser to the given URL
     * @param {string} url - the URL to open
     * @returns {object} - the child process object
     */
    function browseURL(url) {
        logger?.log(getLineNumber() + ".index.js	 - Browsing URL: " + url, "debug");
        const validatePath = isValidateUrl(url);
        logger?.log(getLineNumber() + ".index.js	 - Is URL valid: " + validatePath, "debug");
        if (!validatePath) { return null; }
        logger?.log(getLineNumber() + ".index.js	 - Process platform: " + process.platform, "debug");
        const start = (process.platform == "darwin" ? "open" : process.platform == "win32" ? "start" : "xdg-open");
        logger?.log(getLineNumber() + ".index.js	 - Start command: " + start, "trace");
        const childProcess = child_process.exec(start + " " + validatePath, function (err) {
            if (err) { console.error("\r\n", err); }
        });
        return childProcess;

    }
    /**
     * @function isValidateUrl
     * @description - validates the given URL
     * @param {string} url - the URL to validate
     * @returns {string} - the validated URL
     */
    function isValidateUrl(url) {
        let strPath = _url.toString(url);
        logger?.log(getLineNumber() + ".index.js	 - URL: " + strPath, "trace");
        try { strPath = decodeURI(strPath); } catch (err) { return false; }
        if (strPath.indexOf("\0") !== -1) { return false; }
        if (strPath.indexOf("..") !== -1) { return false; }
        if (strPath.indexOf("/.") !== -1) { return false; }
        if (strPath.indexOf("\\.") !== -1) { return false; }
        if (strPath === "/") { return url; }
        strPath = path.normalize(strPath);
        if (strPath.indexOf("\\.") !== -1) { return false; }
        return url;
    }
    browseURL("http://" + cleverDecksHostname + ":" + port + "/");

    // When the app is closed, finalize the logger
    const EXIT = () => {
        logger?.log(getLineNumber() + ".index.js	 - Saving FlashCards...", "info");
        flashcard_db.finalize();
        logger?.log(getLineNumber() + ".index.js	 - Exiting...", "info");
        logger?.finalize();
        process.exit();
    };

    // Catch all the ways the program can exit
    process.on("SIGINT", EXIT);
    process.on("SIGTERM", EXIT);
    process.on("uncaughtException", EXIT);
    process.on("SIGHUP", EXIT);
    process.on("exit", () => { });
})();