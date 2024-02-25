const ai = require("openai");
const flashCardMaxDifficulty = 5;
/**
 * @class ChatGPT
 * @description - a class to interface with OpenAI's GPT-4 chatbot
 * @param {string} key - the OpenAI API key
 * @param {Logger} logger - a Logger object from logger.js
 * @property {boolean} apiKeyFound - a boolean to indicate if the API key is valid
 * @property {Object} openai - an instance of the OpenAI API
 * @method setApiKey - a method to set the API key
 * @method generateResponse - a method to generate a response from the chatbot
 * @method isValidOpenAIKey - a method to check if the given key is a valid OpenAI API key
 * @method flashCardGenerator - a method to generate flash cards from text
 * @method wrongAnswerGenerator - a method to create wrong answers for cards for use in multiple choice questions
 * 
 * TODO: 
 * 1. Need to add a mechanism that interrupts the streaming results.
 */
class ChatGPT {
    constructor(key, logger) {
        this.openai = null;
        if(logger === undefined && logger === null) throw new Error("ChatGPT constructor requires a logger object as an argument");
        this.logger = logger;
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
        this.apiKeyFound = this.isValidOpenAIKey(key);
        if (this.apiKeyFound) {
            this.logger?.log("OpenAI API key found", "warn");
            this.openai = new ai.OpenAI({ apiKey: key });
        } else {
            this.logger?.log("OpenAI API key not found", "warn");
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
            this.logger?.log("OpenAI API key not found", "error");
            return "";
        }
        if (stream_enabled) {
            if (typeof stream_cb !== 'function') stream_cb = (chunk) => this.logger?.log(chunk);
            if (typeof completion_cb !== 'function') completion_cb = (response) => this.logger?.log(response);
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
    isValidOpenAIKey(key) {
        this.logger?.log("Checking OpenAI API key", "debug");
        this.logger?.log(key, "trace");
        if (typeof key !== 'string') return false;
        this.logger?.log("Key is a string. Key length: " + key.length, "trace");
        // Regex explanation:
        // sk- : Starts with "sk-"
        // [a-zA-Z0-9]{48} : Followed by 48 alphanumeric characters (total length becomes 51 characters including "sk-")
        const regex = /sk-[a-zA-Z0-9]{48}/g;
        return regex.test(key);
    }

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
    async flashCardGenerator(text, numberOfCardsToGenerate, difficulty, streamingData_cb, enableExtrapolation = false) {
        // TODO: rework this to return a promise instead of using async / await
        if (text === undefined || text === null) {
            this.logger?.log("flashCardGenerator requires a string as an argument", "error");
            return null;
        }
        if (typeof text !== 'string') {
            this.logger?.log("flashCardGenerator requires a string as an argument", "error");
            return null;
        }
        if (text.length > 16384) {
            this.logger?.log("The text is too long. Maximum length is 16,384 characters", "error");
            return null;
        }
        if (typeof streamingData_cb !== 'function') {
            this.logger?.log("streamingData_cb is not a function. Using default streaming data callback", "warn");
            streamingData_cb = (chunk) => process.stdout.write(chunk);
        }
        let prompt = "Please generate " + numberOfCardsToGenerate + " flash cards (based on the text below) with concise answers, returning the data in JSON format following the schema ";
        prompt += "{\"question\":\"the flash card question\",\"answer\":\"the flash card answer\",\"tags\":[\"tag1\",\"tag2\"],\"difficulty\":" + difficulty + ",\"collection\":\"The broad category the card belong to such as world geography\"} (difficulty is a number from 1 to " + flashCardMaxDifficulty + ").";
        prompt += " all based on the following text (it is important that the flash cards be based on the following text)" + (enableExtrapolation ? ", extrapolating on the given text to generate the desired number of cards" : "") + ": \n" + text;
        let response = "";;
        this.logger?.log("Generating flash cards from text...");
        await this.generateResponse(prompt, true, streamingData_cb, (res) => { response = res; });
        return this.parseGPTjsonResponse(response);
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
    async wrongAnswerGenerator(card, numberOfAnswers, streamingData_cb) {
        // TODO: rework this to return a promise instead of using async / await
        if (card === undefined || card === null) {
            this.logger?.log("wrongAnswerGenerator requires a FlashCard object as an argument", "error");
            throw new Error("wrongAnswerGenerator requires a FlashCard object as an argument");
        }
        if (typeof streamingData_cb !== 'function') {
            this.logger?.log("streamingData_cb is not a function. Using default streaming data callback", "warn");
            streamingData_cb = (chunk) => process.stdout.write(chunk);
        }
        let prompt = "Please generate " + numberOfAnswers + " wrong answers for the following flash card: \n";
        prompt += "Card front: " + card.question + "\nCorrect answer: " + card.answer + "\n";
        prompt += "Flash Card Tags: " + card.tags.join(", ") + "\n";
        prompt += "Flash Card Collection: " + card.collection + "\n";
        prompt += "Flash Card Difficulty: " + card.difficulty + " of " + flashCardMaxDifficulty + "\n";
        prompt += "Return the wrong answers as a JSON array of strings.";
        let response = "";
        this.logger?.log("Generating wrong answers for flash card...");
        await this.generateResponse(prompt, true, streamingData_cb, (res) => { response = res; });
        return this.parseGPTjsonResponse(response);
    }

    /**
     * @function interpretMathExpression
     * @description - interprets a mathematical expression and returns it as MathML expressions wrapped in $$...$$ delimiters which can be rendered via MathJax
     * @async - this function is asynchronous and should be used with the "await" keyword
     * @param {string} expression - the mathematical expression to interpret
     * @returns {Array} - an array of MathML expressions wrapped in $$...$$ delimiters
     * @throws {Error} - if the expression is not a string or an array of strings
     */
    async interpretMathExpression(expression) {
        let prompt = "Please convert the following mathematical expression(s) into LaTeX expression(s) for use in MathJax and wrap them in $$...$$ delimiters. I only need the wrapped expressions, nothing else.\n";
        if(Array.isArray(expression)) {
            for(let i = 0; i < expression.length; i++) {
                prompt += expression[i] + "\n";
            }
        } else if(typeof expression === 'string') {
            prompt += expression;
        } else {
            throw new Error("interpretMathExpression requires a string or an array of strings as an argument");
        }
        // let response = "";
        this.logger?.log("Interpreting math expression(s)...");
        let response = await this.generateResponse(prompt, false, () => {}, (res) => { response = res; });
        // read through response and find the MathML expressions
        let returnedExpressions = [];
        let start = response.indexOf("$$");
        let end = response.indexOf("$$", start + 2);
        while(start >= 0 && end > start) {
            returnedExpressions.push(response.substring(start, end + 2));
            start = response.indexOf("$$", end + 2);
            end = response.indexOf("$$", start + 2);
        }
        return returnedExpressions;
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
    parseGPTjsonResponse(response) {
        this.logger?.log("Parsing GPT JSON response", "debug");
        if (response === undefined || response === null) {
            this.logger?.log("Response is undefined or null", "warn");
            return null;
        }
        if (typeof response !== 'string') {
            this.logger?.log("Response is not a string", "warn");
            return response;
        }
        if (response === "") {
            this.logger?.log("Response is an empty string", "warn");
            return null;
        }
        if (response.indexOf("```") === 0) response = response.substring(response.indexOf('\n') + 1);
        if (response.indexOf("```") > 0) response = response.substring(0, response.lastIndexOf('\n'));
        try {
            let json = JSON.parse(response);
            this.logger?.log("Response parsed", "trace");
            return json;
        } catch (e) {
            this.logger?.error(e);
            return response;
        }
    }
}

module.exports = ChatGPT;