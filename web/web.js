const _apiBase = '../api/';

class CleverDecks{
    constructor(){
        this.socket = null;
        if (typeof io === 'function') {
            this.setSocket(io());
        }else{
            console.log("io() is not available");
        }
    }

    /**
     * @method setSocket
     * @description - sets the socket.io socket
     * @param {object} socket - a socket.io socket
     * @returns - nothing
     */
    setSocket(socket){
        this.socket = socket;
        this.socketIoConnected = false;
        this.socketMessageHandlers = [];
        this.socket?.on('connect', () => {
            console.log('Connected to socket.io server');
            this.socketIoConnected = true;
        });
    
        this.socket?.on('disconnect', () => {
            console.log('Disconnected from socket.io server');
            this.socketIoConnected = false;
        });
    
        this.socket?.on('message', (message) => {
            // console.log('Received message:', message);
            if (message?.type in this.socketMessageHandlers) {
                this.socketMessageHandlers[message.type](message.data);
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
    getCollectionNames(){
        return new Promise((resolve, reject) => {
            fetch(_apiBase + 'getCollections').then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error fetching collections");
                }
            }).then(data => {
                if(data.status == 'ok') resolve(data.collections);
                else reject(data.reason);
            }).catch(err => {
                reject(err);
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
     */
    getCards(params = {}){
        return new Promise((resolve, reject) => {
            // if the params object is empty, reject the promise
            if(Object.keys(params).length === 0){
                reject("Provided object must have at least one key-value pair.");
            }
            // parse params object into a query string
            let queryString = '';
            for(let key in params){
                queryString += key + '=' + params[key] + '&';
            }
            // remove the trailing ampersand
            queryString = queryString.slice(0, -1);
            // get card count
            this.getCardCount(params).then(count => {
                // if the count is 0, resolve with an empty array
                if(count === 0){
                    resolve([]);
                }
                // if the count is greater than 100, loop through the cards in groups of 100, adding numberOfCards to end of query string
                if(count > 100){
                    let cards = [];
                    let numberOfCards = 100;
                    for(let i = 0; i < count; i += 100){
                        fetch(_apiBase + 'getCards?' + queryString + '&numberOfCards=' + numberOfCards + '&offset=' + i).then(response => {
                            if(response.ok){
                                return response.json();
                            }else{
                                reject("Error fetching cards");
                            }
                        }).then(data => {
                            if(data.status == 'ok'){
                                cards = cards.concat(data.cards);
                                if(cards.length === count){
                                    resolve(cards);
                                }
                            }else{
                                reject(data.reason);
                            }
                        }).catch(err => {
                            reject(err);
                        });
                    }
                }else{
                    // if the count is less than 100, fetch the cards adding numberOfCards to end of query string
                    fetch(_apiBase + 'getCards?' + queryString + '&numberOfCards=' + count).then(response => {
                        if(response.ok){
                            return response.json();
                        }else{
                            reject("Error fetching cards");
                        }
                    }).then(data => {
                        if(data.status == 'ok') resolve(data.cards);
                        else reject(data.reason);
                    }).catch(err => {
                        reject(err);
                    });
                }
            }).catch(err => {
                reject(err);
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
    saveNewCards(cards){
        return new Promise((resolve, reject) => {
            if(Array.isArray(cards) === false) cards = [cards];
            fetch(_apiBase + 'saveNewCards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cards)
            }).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error saving cards");
                }
            }).then(data => {
                if(data.status == 'ok') resolve();
                else reject(data.reason);
            }).catch(err => {
                reject(err);
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
    updateCard(params){
        return new Promise((resolve, reject) => {
            if(typeof params.id === 'undefined'){
                reject("id is required");
            }
            fetch(_apiBase + 'updateCard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            }).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error updating card");
                }
            }).then(data => {
                if(data.status == 'ok') resolve();
                else reject(data.reason);
            }).catch(err => {
                reject(err);
            });
        });
    }

    /**
     * @method deleteCard
     * @description - deletes a card from a collection
     * @param {number} id - the id of the card to delete
     */
    deleteCard(id){
        return new Promise((resolve, reject) => {
            fetch(_apiBase + 'deleteCard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: id })
            }).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error deleting card");
                }
            }).then(data => {
                if(data.status == 'ok') resolve();
                else reject(data.reason);
            }).catch(err => {
                reject(err);
            });
        });
    }

    /**
     * @method generateCardsFromText
     * @description - generates cards from a text
     * @param {string} text - the text to generate cards from
     * @param {number} numberOfCards - the number of cards to generate
     * @returns - an array of FlashCards
     */
    generateCardsFromText(text){
        return new Promise((resolve, reject) => {
            fetch(_apiBase + 'generateCards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            }).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error generating cards");
                }
            }).then(data => {
                if(data.status == 'ok'){
                    let cards = [];
                    data.cards.forEach(card => {
                        cards.push(new FlashCard(card));
                    });
                    resolve(cards);
                }else{
                    reject(data.reason);
                }
            }).catch(err => {
                reject(err);
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
    generateWrongAnswersFromCard(id, numberOfAnswers){
        return new Promise((resolve, reject) => {
            // if the id is not a number, reject the promise
            if(typeof id !== 'number'){
                reject("id must be a number");
            }
            let queryString = 'id=' + id;
            queryString += '&numberOfAnswers=' + numberOfAnswers;
            fetch(_apiBase + 'getWrongAnswers?' + queryString).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error generating wrong answers");
                }
            }).then(data => {
                if(data.status == 'ok') resolve(data.answers);
                else reject(data.reason);
            }).catch(err => {
                reject(err);
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
    getCardCount(params = {}){
        return new Promise((resolve, reject) => {
            // if the params object is empty, reject the promise
            if(Object.keys(params).length === 0){
                reject("Provided object must have at least one key-value pair.");
            }
            // parse params object into a query string
            let queryString = '';
            for(let key in params){
                queryString += key + '=' + params[key] + '&';
            }
            // remove the trailing ampersand
            queryString = queryString.slice(0, -1);
            // get card count
            fetch(_apiBase + 'getCardCount?' + queryString).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error fetching card count");
                }
            }).then(data => {
                if(data.status == 'ok') resolve(data.count);
                else reject(data.reason);
            }).catch(err => {
                reject(err);
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
    tagMatch(tag){
        return new Promise((resolve, reject) => {
            fetch(_apiBase + 'tagMatch?tag=' + tag).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error fetching tag match");
                }
            }).then(data => {
                if(data.status == 'ok') resolve(data);
                else reject(data.reason);
            }).catch(err => {
                reject(err);
            });
        });
    }

    /**
     * @method getGPTenabled
     * @description - gets whether or not the OpenAI API is enabled
     * @returns - a promise that resolves with a boolean, true if the OpenAI API is enabled, false if it is not
     */
    getGPTenabled(){
        return new Promise((resolve, reject) => {
            fetch(_apiBase + 'getGPTenabled').then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error fetching GPT enabled");
                }
            }).then(data => {
                if(data.status == 'ok') resolve(data.enabled);
                else reject(data.reason);
            }).catch(err => {
                reject(err);
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
    setGPTapiKey(key){
        return new Promise((resolve, reject) => {
            // fetch post
            fetch(_apiBase + 'setGPTapiKey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiKey: key })
            }).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error setting GPT key");
                }
            }).then(data => {
                if(data.status == 'ok') resolve(true);
                else reject(data.reason);
            }).catch(err => {
                reject(err);
            });
        });
    }

    /**
     * @method logEntry
     * @description - logs a message with a log level
     * @param {string} message - the message to log
     * @param {string} level - the log level, one of "info", "warn", "error", "debug", "trace" 
     */
    logEntry(message, level){
        if(typeof level === 'undefined') level = "info";
        if(level !== "info" && level !== "warn" && level !== "error" && level !== "debug" && level !== "trace"){
            level = "info";
        }
        fetch(_apiBase + 'addLogEntry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message, level: level })
        }).then(response => {
            if(response.ok){
                return response.json();
            }else{
                console.log("Error logging entry");
            }
        }).then(data => {
            if(data.status !== 'ok'){
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
    setLogLevel(level){
        return new Promise((resolve, reject) => {
            if(level !== "off" && level !== "info" && level !== "warn" && level !== "error" && level !== "debug" && level !== "trace"){
                reject("Invalid log level");
            }
            fetch(_apiBase + 'setLogLevel?level=' + level).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    reject("Error setting log level");
                }
            }).then(data => {
                if(data.status == 'ok') resolve(true);
                else reject(data.reason);
            }).catch(err => {
                reject(err);
            });
        });
    }
}