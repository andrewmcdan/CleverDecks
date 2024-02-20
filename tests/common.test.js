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

test('FlashCard class has a toString method', () => {
    const flashCard = new commonClasses.FlashCard(testFlashCardData);
    expect(flashCard.toString).toBeDefined();
});

test('FlashCard class has an id property', () => {
    const flashCard = new commonClasses.FlashCard(testFlashCardData);
    expect(flashCard.id).toBeDefined();
});

test('FlashCard class has a question property', () => {
    const flashCard = new commonClasses.FlashCard(testFlashCardData);
    expect(flashCard.question).toBeDefined();
});

test