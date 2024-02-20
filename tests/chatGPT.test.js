const ChatGPT = require('../chatGPT');

test('ChatGPT class exists', () => {
    expect(ChatGPT).toBeDefined();
});

test('ChatGPT class has a generateResponse method', () => {
    const chatGPT = new ChatGPT();
    expect(chatGPT.generateResponse).toBeDefined();
});

test('ChatGPT class generateResponse method returns a string', async() => {
    const chatGPT = new ChatGPT();
    const response = await chatGPT.generateResponse("Hello", false);
    expect(typeof response).toBe('string');
});

test('ChatGPT class isValidOpenAIKey method returns a boolean', () => {
    const chatGPT = new ChatGPT();
    const result = chatGPT.isValidOpenAIKey("test");
    expect(typeof result).toBe('boolean');
});

test('ChatGPT class isValidOpenAIKey method returns true for a valid key', () => {
    const chatGPT = new ChatGPT();
    const result = chatGPT.isValidOpenAIKey("sk-1234567890abcdefg1234567890abcdefg12345678902345");
    expect(result).toBe(true);
});