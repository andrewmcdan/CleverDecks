const FlashCardDB = require('../database');
const Logger = require('../logger');
const logger = new Logger();

test('FlashCardDB class exists', ()=> {
    expect(FlashCardDB).toBeDefined();
});