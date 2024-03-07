/* eslint-disable no-undef */
const _apiBase = "../api/";

class CleverDecks_class {
    constructor() {
        this.socket = null;
        if (typeof io === "function") {
            this.setSocket(io());
        } else {
            console.log("io() is not available");
        }
        this.socketId = null;
    }

    async waitReady() {
        return new Promise((resolve) => {
            (async () => {
                while (this.socketId === null) {
                    await new Promise(r => setTimeout(r, 100));
                }
                resolve();
            })();
        });
    }

    /**
     * @method setSocket
     * @description - sets the socket.io socket
     * @param {object} socket - a socket.io socket
     * @returns - nothing
     */
    setSocket(socket) {
        this.socket = socket;
        this.socketIoConnected = false;
        this.socketMessageHandlers = [];
        this.socket?.on("connect", () => {
            console.log("Connected to socket.io server");
        });

        this.socket?.on("disconnect", () => {
            console.log("Disconnected from socket.io server");
            this.socketIoConnected = false;
        });

        this.socket?.on("message", (message) => {
            // console.log("Received message:", message);
            if (message?.type in this.socketMessageHandlers) {
                this.socketMessageHandlers[message.type](message.data);
            }
            if (message?.type === "socketId") {
                this.socketId = message.data;
                // set cookie for socketId
                this.socketIoConnected = true;
                document.cookie = "socketId=" + this.socketId + "; path=/" + "; max-age=" + 60 * 60 * 24 * 365;
                console.log(this.socketId);
            }
        });
    }

    subscribeToSocketMessage(type, handler) {
        this.socketMessageHandlers[type] = handler;
    }

    /**
     * @method getCollectionNames
     * @description - gets the names of all available collections
     * @returns - an array of strings, each string is the name of a collection
     */
    getCollectionNames() {
        return new Promise((resolve, reject) => {
            fetch(_apiBase + "getCollections").then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error fetching collections: " + "Error fetching collections", "error");
                    reject("Error fetching collections");
                }
            }).then(data => {
                if (data.status == "ok") resolve(data.collections);
                else reject(data.reason);
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error fetching collections: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method getCards
     * @description - gets the cards from a collection
     * @param {object} params - an object with at least one of the following keys:
     *   collection - the name of the collection to get cards from
     *   tags - an array of tags to filter the cards by
     *   difficulty - a number from 1 to 5, the difficulty level of the cards to get
     *   search - a string to search the cards for
     *   dateCreatedRange: a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date created
     *   dateModifiedRange: a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date modified
     * @returns - an array of FlashCards
     */
    getCards(params = {}) {
        return new Promise((resolve, reject) => {
            // if the params object is empty, reject the promise
            if (Object.keys(params).length === 0) {
                reject("Provided object must have at least one key-value pair.");
            }
            // parse params object into a query string
            let queryString = "";
            for (let key in params) {
                queryString += key + "=" + params[key] + "&";
            }
            // remove the trailing ampersand
            queryString = queryString.slice(0, -1);
            // get card count
            this.getCardCount(params).then(count => {
                // if the count is 0, resolve with an empty array
                if (count === 0) {
                    resolve([]);
                }
                // if the count is greater than 100, loop through the cards in groups of 100, adding numberOfCards to end of query string
                if (count > 100) {
                    let cards = [];
                    let numberOfCards = 100;
                    for (let i = 0; i < count; i += 100) {
                        fetch(_apiBase + "getCards?" + queryString + "&numberOfCards=" + numberOfCards + "&offset=" + i).then(response => {
                            if (response.ok) {
                                return response.json();
                            } else {
                                this.logEntry(getLineNumber() + ".web.js - Error fetching cards: " + "Error fetching cards", "error");
                                reject("Error fetching cards");
                            }
                        }).then(data => {
                            if (data.status == "ok") {
                                cards = cards.concat(data.cards);
                                if (cards.length === count) {
                                    resolve(cards);
                                }
                            } else {
                                this.logEntry(getLineNumber() + ".web.js - Error fetching cards: " + data.reason, "error");
                                reject(data.reason);
                            }
                        }).catch(err => {
                            this.logEntry(getLineNumber() + ".web.js - Error fetching cards: " + err, "error");
                            reject(err + getLineNumber());
                        });
                    }
                } else {
                    // if the count is less than 100, fetch the cards adding numberOfCards to end of query string
                    fetch(_apiBase + "getCards?" + queryString + "&numberOfCards=" + count).then(response => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            this.logEntry(getLineNumber() + ".web.js - Error fetching cards: " + "Error fetching cards", "error");
                            reject("Error fetching cards");
                        }
                    }).then(data => {
                        if (data.status == "ok") resolve(data.cards);
                        else {
                            this.logEntry(getLineNumber() + ".web.js - Error fetching cards: " + data.reason, "error");
                            reject(data.reason);
                        }
                    }).catch(err => {
                        this.logEntry(getLineNumber() + ".web.js - Error fetching cards: " + err, "error");
                        reject(err + getLineNumber());
                    });
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error fetching cards: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method saveNewCards
     * @description - saves new card(s) to a collection
     * @param {object|array} cards - an object or array of objects representing the cards to save
     * @returns - an object with the following
     *  status - "ok" or "error"
     *  reason - a string with the reason for the status if the status is "error"
     * 
     */
    saveNewCards(cards) {
        return new Promise((resolve, reject) => {
            if (Array.isArray(cards) === false) cards = [cards];
            fetch(_apiBase + "saveNewCards", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(cards)
            }).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error saving new cards: " + "Error saving new cards", "error");
                    reject("Error saving cards");
                }
            }).then(data => {
                if (data.status == "ok") resolve("ok");
                else {
                    this.logEntry(getLineNumber() + ".web.js - Error saving cards: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error saving cards: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method updateCard
     * @description - updates a card in a collection
     * @param {object} params - an object with the following keys:
     * id - (required) the id of the card to update
     * collection - (optional) the name of the collection to update the card in
     * tags - (optional) an array of tags to update the card with
     * difficulty - (optional) a number from 1 to 5, the difficulty level of the card
     * question - (optional) the question of the card
     * answer - (optional) the answer of the card
     */
    updateCard(params) {
        return new Promise((resolve, reject) => {
            if (typeof params.id === "undefined") {
                this.logEntry(getLineNumber() + ".web.js - Error updating card: " + "id is required", "error");
                reject("id is required");
            }
            fetch(_apiBase + "updateCard", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(params)
            }).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error updating card: " + "Error updating card", "error");
                    reject("Error updating card");
                }
            }).then(data => {
                if (data.status == "ok") resolve("ok");
                else {
                    this.logEntry(getLineNumber() + ".web.js - Error updating card: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error updating card: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method deleteCard
     * @description - deletes a card from a collection
     * @param {number} id - the id of the card to delete
     */
    deleteCard(id) {
        return new Promise((resolve, reject) => {
            fetch(_apiBase + "deleteCard", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ id: id })
            }).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error deleting card: " + "Error deleting card", "error");
                    reject("Error deleting card");
                }
            }).then(data => {
                if (data.status == "ok") resolve("ok");
                else {
                    this.logEntry(getLineNumber() + ".web.js - Error deleting card: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error deleting card: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method generateCardsFromText
     * @description - generates cards from a text
     * @param {string} text - the text to generate cards from
     * @param {number} numberOfCards - the number of cards to generate
     * @param {number} difficulty - the difficulty level of the cards to generate
     * @returns - an array of FlashCards
     */
    generateCardsFromText(text, numberOfCards, difficulty = 3) {
        return new Promise((resolve, reject) => {
            if (!this.socketIoConnected) {
                reject("Socket.io is not connected");
            }
            fetch(_apiBase + "generateCards", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    credentials: "include"
                },
                body: JSON.stringify({ text: text, numberOfCards: numberOfCards, difficulty: difficulty })
            }).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error generating cards: " + "Error generating cards", "error");
                    reject("Error generating cards");
                }
            }).then(data => {
                if (data.status == "ok") {
                    let cards = [];
                    let id = 1;
                    data.cards.forEach(card => {
                        card.id = id++;
                        cards.push(new FlashCard(card));
                    });
                    resolve(cards);
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error generating cards: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error generating cards: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method generateWrongAnswersFromCard
     * @description - generates wrong answers from a card
     * @param {number} id - a FlashCard id
     * @param {number} numberOfAnswers - the number of wrong answers to generate
     * @returns - an array of strings, each string is a wrong answer
     */
    generateWrongAnswersFromCard(id, numberOfAnswers) {
        return new Promise((resolve, reject) => {
            if (!this.socketIoConnected) {
                reject("Socket.io is not connected");
            }
            // if the id is not a number, reject the promise
            if (typeof id !== "number") {
                this.logEntry(getLineNumber() + ".web.js - Error generating wrong answers: " + "id must be a number", "error");
                reject("id must be a number");
            }
            let queryString = "cardId=" + id;
            queryString += "&numberOfAnswers=" + numberOfAnswers;
            fetch(_apiBase + "getWrongAnswers?" + queryString,
                {
                    headers: {
                        credentials: "include"
                    }
                }
            ).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error generating wrong answers: " + "Error generating wrong answers", "error");
                    reject("Error generating wrong answers");
                }
            }).then(data => {
                if (data.status == "ok") resolve(data.answers);
                else {
                    this.logEntry(getLineNumber() + ".web.js - Error generating wrong answers: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error generating wrong answers: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method getCardCount
     * @description - gets the count of cards from a collection
     * @param {object} params - an object with at least one of the following keys:
     *  all - a boolean, true if the count of all cards is desired
     *  collection - the name of the collection to get cards from
     *  tags - an array of tags to filter the cards by
     *  difficulty - a number from 1 to 5, the difficulty level of the cards to get
     *  search - a string to search the cards for
     *  dateCreatedRange: a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date created
     *  dateModifiedRange: a string in the format "YYYY-MM-DD,YYYY-MM-DD" to filter by date modified
     */
    getCardCount(params = {}) {
        return new Promise((resolve, reject) => {
            // if the params object is empty, reject the promise
            if (Object.keys(params).length === 0) {
                if (this.socketIoConnected === true) {
                    this.logEntry(getLineNumber() + ".web.js - Error fetching card count: " + "Provided object must have at least one key-value pair.", "error");
                }
                reject("Provided object must have at least one key-value pair.");
            }
            // parse params object into a query string
            let queryString = "";
            for (let key in params) {
                queryString += key + "=" + params[key] + "&";
            }
            // remove the trailing ampersand
            queryString = queryString.slice(0, -1);
            // get card count
            fetch(_apiBase + "getCardCount?" + queryString).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error fetching card count: " + "Error fetching card count", "error");
                    reject("Error fetching card count");
                }
            }).then(data => {
                if (data.status == "ok") resolve(data.count);
                else {
                    this.logEntry(getLineNumber() + ".web.js - Error fetching card count: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error fetching card count: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method tagMatch
     * @description - checks if a tag matches any tags in any collections
     * @param {string} tag - the tag or partial tag to check
     * @returns - a promise that resolves with an object with the following
     * tagsMatchFuzzy - an array of strings, each string is a tag that fuzzy matches the provided tag
     * tagsMatchFirstChars - an array of strings, each string is a tag that matches the provided string in the first characters
     * tagsExistsExact - boolean, true if the provided tag matches exactly a tag in a collection, false if it does not
     * tagsExistFuzzy - boolean, true if the provided tag matches fuzzily a tag in a collection, false if it does not
     * @rejects - a string with the reason for the rejection
     */
    tagMatch(tag) {
        return new Promise((resolve, reject) => {
            fetch(_apiBase + "tagMatch?tag=" + tag).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error fetching tag match: " + "Error fetching tag match", "error");
                    reject("Error fetching tag match");
                }
            }).then(data => {
                if (data.status == "ok") {
                    let tagsMatchFuzzy = data.tagsMatchFuzzy;
                    let tagsMatchFirstChars = data.tagsMatchFirstChars;
                    // concatenate the two arrays and remove duplicates
                    let tagsMatch = tagsMatchFuzzy.concat(tagsMatchFirstChars.filter(tag => tagsMatchFuzzy.indexOf(tag) === -1));
                    // order the array starting with the one most like the provided tag
                    tagsMatch.sort((a, b) => levenshteinDistance(tag, a.substring(0, tag.length)) - levenshteinDistance(tag, b.substring(0, tag.length)));
                    data.tagsMatch = tagsMatch;
                    resolve(data);
                }
                else {
                    this.logEntry(getLineNumber() + ".web.js - Error fetching tag match: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error fetching tag match: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method getGPTenabled
     * @description - gets whether or not the OpenAI API is enabled
     * @returns - a promise that resolves with a boolean, true if the OpenAI API is enabled, false if it is not
     */
    getGPTenabled() {
        return new Promise((resolve, reject) => {
            fetch(_apiBase + "getGPTenabled").then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error fetching GPT enabled: " + "Error fetching GPT enabled", "error");
                    reject("Error fetching GPT enabled");
                }
            }).then(data => {
                if (data.status == "ok") resolve(data.enabled);
                else {
                    this.logEntry(getLineNumber() + ".web.js - Error fetching GPT enabled: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error fetching GPT enabled: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method setGPTapiKey
     * @description - sets the OpenAI API key
     * @param {string} key - the OpenAI API key
     * @returns - a promise that resolves with a boolean, true if the key was set, false if it was not set
     * @rejects - a string with the reason for the rejection
     */
    setGPTapiKey(key) {
        return new Promise((resolve, reject) => {
            // fetch post
            fetch(_apiBase + "setGPTapiKey", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ apiKey: key })
            }).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error setting GPT key: " + "Error setting GPT key", "error");
                    reject("Error setting GPT key");
                }
            }).then(data => {
                if (data.status == "ok") resolve(true);
                else {
                    this.logEntry(getLineNumber() + ".web.js - Error setting GPT key: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error setting GPT key: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }

    /**
     * @method logEntry
     * @description - logs a message with a log level
     * @param {string} message - the message to log
     * @param {string} level - the log level, one of "info", "warn", "error", "debug", "trace" 
     */
    logEntry(message, level) {
        if (typeof level === "undefined") level = "info";
        if (level !== "info" && level !== "warn" && level !== "error" && level !== "debug" && level !== "trace") {
            level = "info";
        }
        if (this.socketIoConnected !== true) {
            console.log(message);
            return;
        }
        fetch(_apiBase + "addLogEntry", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message, level: level })
        }).then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.log("Error logging entry");
            }
        }).then(data => {
            if (data.status !== "ok") {
                console.log(data.reason);
            }
        }).catch(err => {
            console.log(err);
        });
    }

    /**
     * @method setLogLevel
     * @description - sets the log level for the logger on the backend
     * @param {string} level - the log level, one of "off", "info", "warn", "error", "debug", "trace"
     * @returns - a promise that resolves with a boolean, true if the log level was set, false if it was not set
     */
    setLogLevel(level) {
        return new Promise((resolve, reject) => {
            if (level !== "off" && level !== "info" && level !== "warn" && level !== "error" && level !== "debug" && level !== "trace") {
                reject("Invalid log level");
            }
            fetch(_apiBase + "setLogLevel?level=" + level).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.logEntry(getLineNumber() + ".web.js - Error setting log level: " + "Error setting log level", "error");
                    reject("Error setting log level");
                }
            }).then(data => {
                if (data.status == "ok") resolve(true);
                else {
                    this.logEntry(getLineNumber() + ".web.js - Error setting log level: " + data.reason, "error");
                    reject(data.reason);
                }
            }).catch(err => {
                this.logEntry(getLineNumber() + ".web.js - Error setting log level: " + err, "error");
                reject(err + getLineNumber());
            });
        });
    }
}

class TextStreamer {
    constructor(max) {
        this.maxSize = max;
        this.text = "";
    }

    setText(text) {
        this.text = text;
    }

    addText(text) {
        this.text += text;
    }

    getText() {
        if (this.text.length > this.maxSize) {
            this.text = this.text.slice(this.text.length - this.maxSize);
        }
        return this.text;
    }
}

// create a CleverDecks object
const CleverDecks = new CleverDecks_class();

/**
 * @function setStatusMessage
 * @description - sets the status message that appears at the bottom of the page
 * @param {string} message - the message to set
 * @param {string} bgcolor - the background color of the status message
 * @returns - nothing
 * @notes - this function is set to an empty function and is later set to a function that sets the status message
 */
let setStatusMessage = () => { };

// This next line creates a closure around this part of the file so that the variables and functions are not in the global scope
(async () => {
    // wait for page to finish loading
    let pageCompletedLoading = false;
    document.addEventListener("DOMContentLoaded", () => {
        pageCompletedLoading = true;
    });
    while (pageCompletedLoading === false) {
        await new Promise(r => setTimeout(r, 100));
    }
    CleverDecks.logEntry(getLineNumber() + ".web.js - Page completed loading", "debug");
    // set up the "Study a Collection(Quick Load)" drop down menu
    const collectionSelect = document.getElementById("collectionSelect");
    collectionSelect.addEventListener("change", (event) => {
        let collection = event.target.value;
        if (collection === "Select a Collection") {
            return;
        }
        window.location.href = `study.html?collection=${collection}`;
    });

    // load the collection names into the collection select
    let collectionNames = [];
    CleverDecks.logEntry(getLineNumber() + ".web.js - Fetching collection names", "debug");
    CleverDecks.getCollectionNames().then((collections) => {
        CleverDecks.logEntry(getLineNumber() + ".web.js - Collection names fetched", "trace");
        CleverDecks.logEntry(getLineNumber() + ".web.js - Collection names: " + collections, "trace");
        let collectionCount = collections.length;
        for (let i = 0; i < collectionCount; i++) {
            let option = document.createElement("option");
            option.value = collections[i];
            option.text = collections[i];
            collectionNames.push(collections[i]);
            collectionSelect.appendChild(option);
        }
    }).catch((error) => {
        CleverDecks.logEntry(getLineNumber() + ".web.js - Error fetching collection names: " + error, "error");
    });

    // create a textStreamer for the status messages that come from the backend
    CleverDecks.logEntry(getLineNumber() + ".web.js - Creating status message streamer", "debug");
    const statusMessageStreamer = new TextStreamer(100);
    let statusMessageTimeout = null;
    let connectedMessageInterval = setInterval(() => {
        const statusMessageGreenAndGone = () => {
            document.getElementById("status").classList.add("gone");
            document.getElementById("statusMessageContainer").classList.remove("bg-green-500");
        };
        const statusMessageFadeout = () => {
            document.getElementById("status").classList.add("fade-out");
            setTimeout(statusMessageGreenAndGone, 1000);
        };
        if (CleverDecks.socketIoConnected === true) {
            clearInterval(connectedMessageInterval);
            setTimeout(statusMessageFadeout, 500);
            document.getElementById("statusMessageContainer").classList.remove("bg-red-500");
            document.getElementById("statusMessageContainer").classList.add("bg-green-500");
            document.getElementById("statusMessage").innerHTML = "Status: Connected";
        }
    }, 250);

    // set the status message function
    CleverDecks.logEntry(getLineNumber() + ".web.js - Setting status message function", "debug");
    setStatusMessage = (message, bgcolor = "black") => {
        let statusMessageContainer = document.getElementById("statusMessageContainer");
        // remove all the bg classes
        let classes = statusMessageContainer.classList;
        for (let i = classes.length - 1; i >= 0; i--) {
            if ((classes[i].startsWith("bg-") && classes[i].endsWith("-500")) || classes[i] === "bg-black") {
                statusMessageContainer.classList.remove(classes[i]);
            }
        }
        // add the new class
        let newBgClass = `bg-${bgcolor}-500`;
        statusMessageContainer.classList.add(newBgClass);
        // set the new message
        document.getElementById("statusMessage").innerHTML = `Status: ${message}`;
        // fade in the status div
        if (document.getElementById("status").classList.contains("gone")) {
            document.getElementById("status").classList.remove("gone");
        }
        if (document.getElementById("status").classList.contains("fade-out")) {
            document.getElementById("status").classList.remove("fade-out");
        }
        // set a timeout to fade out the status div
        if (statusMessageTimeout !== null) {
            clearTimeout(statusMessageTimeout);
        }
        statusMessageTimeout = setTimeout(() => {
            document.getElementById("status").classList.add("fade-out");
            setTimeout(() => {
                document.getElementById("status").classList.add("gone");
                statusMessageContainer.classList.remove(newBgClass);
            }, 1000);
        }, 1000);
    };

    // set up the socket message handlers
    CleverDecks.logEntry(getLineNumber() + ".web.js - Setting up socket message handlers", "debug");
    CleverDecks.subscribeToSocketMessage(socketMessageTypes[0], (message) => {
        statusMessageStreamer.addText(message.chunk);
        setStatusMessage("Generating - " + statusMessageStreamer.getText(), "blue");
    });
    CleverDecks.subscribeToSocketMessage(socketMessageTypes[1], (message) => {
        statusMessageStreamer.addText(message.chunk);
        setStatusMessage("Generating - " + statusMessageStreamer.getText(), "blue");
    });
    CleverDecks.subscribeToSocketMessage(socketMessageTypes[2], () => {
        statusMessageStreamer.setText("");
        setStatusMessage("Generating complete.", "green");
    });

    // set up the search box
    CleverDecks.logEntry(getLineNumber() + ".web.js - Setting up search box", "debug");
    let searchIndex = 0;
    const searchBox = document.getElementById("search");
    document.addEventListener("click", (event) => {
        if (event.target.id === "searchResultsList") return;
        if (event.target.id === "searchResultsContainer") return;
        if (event.target.classList.contains("searchResult")) return;
        if (event.target === searchBox) return;
        document.getElementById("searchResultsContainer").classList.add("gone");
    });
    searchBox.addEventListener("focus", () => {
        document.getElementById("searchResultsContainer").classList.remove("gone");
    });
    searchBox.addEventListener("input", (event) => {
        const thisSearchIndex = searchIndex++;
        // create a drop down area that shows suggested tags and collections
        let search = event.target.value;
        if (search.length === 0) {
            return;
        }
        // use levenshtein distance to find the closest match to the search string from collection array
        let closestMatch = collectionNames.reduce((acc, curr) => {
            let distance = levenshteinDistance(search, curr);
            if (distance < acc.distance) {
                acc.distance = distance;
                acc.match = curr;
            }
            return acc;
        }, { distance: 100, match: "" });

        CleverDecks.tagMatch(search).then(data => {
            const searchResultsContainer = document.getElementById("searchResultsContainer");
            const searchResultsList = document.getElementById("searchResultsList");
            [...searchResultsList.childNodes].forEach((child) => {
                if (child.nodeType === Node.ELEMENT_NODE && child.getAttribute("searchIndex") !== thisSearchIndex.toString()) {
                    searchResultsList.removeChild(child);
                }
            });
            searchResultsList.innerHTML = "";
            data.tagsMatch.forEach(tag => {
                let li = document.createElement("li");
                li.setAttribute("searchIndex", thisSearchIndex.toString());
                li.classList.add("searchResult");
                li.innerHTML = tag;
                li.addEventListener("click", (event) => {
                    searchBox.value = event.target.innerHTML;
                    searchBox.dispatchEvent(new Event("input"));
                });
                searchResultsList.appendChild(li);
            });

            let li = document.createElement("li");
            li.setAttribute("searchIndex", thisSearchIndex.toString());
            li.classList.add("searchResult");
            li.innerHTML = "Collection: " + closestMatch.match;
            li.addEventListener("click", (event) => {
                searchBox.value = event.target.innerHTML;
                searchBox.dispatchEvent(new Event("input"));
            });
            searchResultsList.appendChild(li);
            searchResultsContainer.classList.remove("gone");
        }).catch(err => {
            if (CleverDecks.socketIoConnected === true) {
                CleverDecks.logEntry(getLineNumber() + ".web.js - Error fetching tag match: " + err, "error");
            } else {
                console.error(getLineNumber() + ".web.js - Error fetching tag match: " + err);
            }
        });
    });
    CleverDecks.logEntry(getLineNumber() + ".web.js - Page setup complete", "debug");
})();

// This was a suggestion by ChatGPT
function levenshteinDistance(a, b, lower = true) {
    if (lower === true) {
        a = a.toLowerCase();
        b = b.toLowerCase();
    }
    const initialWeight = 3; // Weight for the initial characters
    const initialCharacters = a.length / 3; // Number of initial characters considered more important
    let weightFactor = 1;
    const matrix = [];
    for (let i = 0; i <= b.length; i++)matrix[i] = [i];
    for (let j = 0; j <= a.length; j++)matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++) {
        weightFactor = (j <= initialCharacters || i <= initialCharacters) ? initialWeight : 1;
        if (b[i - 1] === a[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
        else {
            matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + weightFactor, // substitution
                matrix[i][j - 1] + weightFactor, // insertion
                matrix[i - 1][j] + weightFactor // deletion
            );
        }
    }
    return matrix[b.length][a.length];
}