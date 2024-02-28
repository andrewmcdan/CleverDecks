const commonClasses = require('../web/common.js');
const testFlashCardData = {
    id: 1,
    question: "What is the capital of France?",
    answer: "Paris",
    collection: "Countries",
    tags: ["Geography", "Europe"],
    dateCreated: "2021-09-01",
    difficulty: 3
};
test('commonClasses exists', () => {
    expect(commonClasses).toBeDefined();
});

test('commonClasses has a FlashCard class', () => {
    expect(commonClasses.FlashCard).toBeDefined();
});

test('FlashCard class has a constructor', () => {
    const flashCard = new commonClasses.FlashCard(testFlashCardData);
    expect(flashCard.id).toBe(1);
    expect(flashCard.question).toBe("What is the capital of France?");
    expect(flashCard.answer).toBe("Paris");
    expect(flashCard.collection).toBe("Countries");
    expect(flashCard.tags).toStrictEqual(["Geography", "Europe"]);
    expect(flashCard.dateCreated).toBe("2021-09-01");
    expect(flashCard.difficulty).toBe(3);
    expect(()=>{const tempCard = new commonClasses.FlashCard()}).toThrow(new Error("FlashCard constructor requires an object as an argument"));
    expect(flashCard.constructor).toBeDefined();
});

test('FlashCard class has a toJSON method', () => {
    const flashCard = new commonClasses.FlashCard(testFlashCardData);
    expect(flashCard.toJSON).toBeDefined();
});

test('FlashCard class toJSON method returns an object', () => {
    const flashCard = new commonClasses.FlashCard(testFlashCardData);
    const result = flashCard.toJSON();
    expect(typeof result).toBe('object');
});

test('FlashCard class toJSON method returns an object with the correct properties', () => {
    const flashCard = new commonClasses.FlashCard(testFlashCardData);
    const result = flashCard.toJSON();
    expect(result.id).toBe(1);
    expect(result.question).toBe("What is the capital of France?");
    expect(result.answer).toBe("Paris");
    expect(result.collection).toBe("Countries");
    expect(result.tags).toStrictEqual(["Geography", "Europe"]);
    expect(result.dateCreated).toBe("2021-09-01");
    expect(result.difficulty).toBe(3);
});



