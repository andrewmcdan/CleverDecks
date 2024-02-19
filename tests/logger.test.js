const Logger = require('../logger');
const fs = require('fs');

test('Logger class exists', () => {
    expect(Logger).toBeDefined();
});

test('Logger class has a log method', () => {
    const logger = new Logger();
    expect(logger.log).toBeDefined();
});

test('Logger class has a writeOutLogs method', () => {
    const logger = new Logger();
    expect(logger.writeOutLogs).toBeDefined();
});

test('Logger class has a finalize method', () => {
    const logger = new Logger();
    expect(logger.finalize).toBeDefined();
});

test('Logger class has a logs property', () => {
    const logger = new Logger();
    expect(logger.logs).toBeDefined();
});

test('Logger class has a consoleLogging property', () => {
    const logger = new Logger();
    expect(logger.consoleLogging).toBeDefined();
});

test('Logger class log function logs a message', () => {
    const logger = new Logger(true, 1); // true for console logging, 1 for log level
    const spy = jest.spyOn(console, 'log');
    logger.log('test message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
});

test('Logger class log function does not log a message if log level is off', () => {
    const logger = new Logger(true, 0); // true for console logging, 0 for log level
    const spy = jest.spyOn(console, 'log');
    logger.log('test message');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
});

test('Logger class logs a message if and only if the log level is high enough', () => {
    for(let i = 0; i < 6; i++) {
        const logger = new Logger(true, i); // true for console logging, i for log level
        const spy = jest.spyOn(console, 'log');
        logger.log('test message', i);
        if(i > 0) {
            expect(spy).toHaveBeenCalled();
        } else {
            expect(spy).not.toHaveBeenCalled();
        }
        spy.mockRestore();
    }
});