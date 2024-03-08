// TODO: Add logs destination parameter to constructor

const fs = require("fs");
const logLevels = ["off", "info", "warn", "error", "debug", "trace"];
const longestLogLevelsLength = logLevels.reduce((max, str) => Math.max(max, str.length), 0);
/**
 * "off" - no logging
 * "info" - logs info messages that should be shown all the time
 * "warn" - logs info and warning messages
 * "error" - logs info, warning, and error messages
 * "debug" - logs info, warning, error, and debug messages
 * "trace" - logs everything, including trace messages. this is the most verbose level.
 */

/**
 * @class Logger
 * @description - a class to log messages to the console and to a file
 * @param {boolean} con - a boolean to indicate if console logging is enabled
 * @property {Array} logs - an array of log entries
 * @property {boolean} consoleLogging - a boolean to indicate if console logging is enabled
 * @method log - a method to log a message
 * @method writeOutLogs - a method to write out the logs to a file
 * @method finalize - a method to write out the logs to a file when the object is destroyed
 * @notes - Because this is used for logging, this class must remain at the top of the file, and the logger object must be created before any other objects are created.
 */
class Logger {
    constructor(con = true, logLevel = 1, logsDestination = "logs.txt") {
        if(typeof con !== "boolean") con = true;
        if(typeof logLevel === "string") logLevel = logLevels.indexOf(logLevel);
        if(typeof logLevel !== "number") logLevel = 1;
        if(logLevel < 0) logLevel = 0;
        this.logs = [];
        this.consoleLogging = con;
        this.logLevel = logLevel;
        this.writeLogInterval = null;
        this.noLogFile = false;
        if(logsDestination === null) this.noLogFile = true;
        if(typeof logsDestination !== "string") logsDestination = "logs.txt";
        this.logsDestination = logsDestination;
        this.prefixLength = 0;
        this.writeInProcess = false;
    }

    /**
     * @method log
     * @description - logs a message
     * @param {string} message - the message to log
     * @param {string} level - the log level, one of "info", "warn", "error", "debug", "trace"
     * @returns - nothing
     * @throws - nothing
     * @sideEffects - adds a log entry to the logs array
     * @sideEffects - writes out the logs to a file if the logs array has 10 or more entries
     * @sideEffects - writes out the logs to the console if consoleLogging is true
     */
    log(message, level = "info") {
        if(typeof level === "string") level = logLevels.indexOf(level); // convert level to a number
        if(level > this.logLevel) return; // if the level is higher than the log level, don't log the message
        if(this.logLevel === 0) return; // if the log level is 0, don't log the message (this is the "off" level)
        let prefix = message.substring(0, message.indexOf("-")); // get the prefix of the message
        if(prefix.length > this.prefixLength) this.prefixLength = prefix.length; // get the new longest prefix length
        let newPrefix = prefix.replace(/[\s\t]/g, ""); // remove spaces from the prefix
        message = message.replace(prefix, newPrefix); // replace the prefix with the new prefix
        // insert padding between prefix and message with a colon
        message = message.replace("-", ":".padEnd(this.prefixLength - newPrefix.length + 1, " "), 1);
        let newEntry = { date: new Date().toLocaleString(), message: message, level: logLevels[level] }; // create a new log entry
        this.logs.push(newEntry); // add the new log entry to the logs array
        if (this.consoleLogging) console.log(newEntry.date + " - " + newEntry.level.padEnd(longestLogLevelsLength," ") + " - " + newEntry.message); // log the message to the console
        if(this.logs.length >= 50 && !this.writeInProcess) this.writeOutLogs(); // write out the logs to a file if there are 10 or more entries in the logs buffer array
        // if the writeLogInterval is not set, set it to write out the logs every 30 seconds if there are any logs to write out
        if(this.writeLogInterval == null) this.writeLogInterval = setInterval(() => { 
            if(this.logs.length > 0 && !this.writeInProcess) this.writeOutLogs(); 
        }, 30 * 1000);
    }

    /**
     * @method setLogLevel
     * @description - sets the log level
     * @param {string|number} level - the log level, one of "off", "info", "warn", "error", "debug", "trace"
     * @returns - true if the log level was set, false if it was not set
     */
    setLogLevel(level) {
        if(typeof level === "string") level = logLevels.indexOf(level);
        if(typeof level !== "number") return false;
        if(level < 0) level = 0;
        if(level > 5) level = 5;
        this.logLevel = level;
        return true;
    }

    /**
     * @method writeOutLogs
     * @description - writes out the logs to a file
     * @returns - nothing
     * @throws - nothing
     * @sideEffects - writes out the logs to a file
     * @sideEffects - clears the logs array
     * @sideEffects - writes a message to the logs array if there is an error writing out the logs
     * @sideEffects - writes a message to the console if there is an error writing out the logs
     */
    writeOutLogs() {
        if(this.noLogFile) return;
        if(this.writeInProcess) return;
        this.writeInProcess = true;
        let localLogs = this.logs;
        this.logs = [];
        let logString = "";
        localLogs.forEach((entry) => {
            logString += entry.date + " - " + entry.level.padEnd(longestLogLevelsLength," ") + " - " + entry.message + "\n";
        });
        fs.appendFile(this.logsDestination, logString, (err) => {
            if (err) {
                console.error(err);
                let tempLog = this.logs;
                this.logs = localLogs.concat(tempLog);
                this.logs.push({ date: new Date().toLocaleString(), message: "Failed to write logs to file" });
            }else{
                if(this.consoleLogging) console.log("Logs written to file");
                let logFile = fs.readFileSync(this.logsDestination, "utf8");
                let logLines = logFile.split("\n");
                if(logLines.length > 10000) {
                    fs.writeFileSync(this.logsDestination, logLines.slice(logLines.length - 10000).join("\n"));
                }
            }
        });
        this.writeInProcess = false;
    }
    
    /**
     * @method finalize
     * @description - writes out the logs to a file when the object is destroyed
     * @returns - nothing
     * @throws - nothing
     * @sideEffects - writes out the logs to a file
     */
    finalize() {
        if(this.noLogFile) return;
        let logString = "";
        this.logs.forEach((entry) => {
            logString += entry.date + " - " + entry.message + "\n";
        });
        try{
            fs.appendFileSync(this.logsDestination, logString); 
        }catch(err){
            console.error(err);
        }
    }
}
module.exports = {Logger, logLevels};