const ChatGPT = require('../chatGPT');
const Logger = require('../logger');
const envVars = require("dotenv").config({ path: __dirname + "/../.env" });
const logger = new Logger();
const commonClasses = require('../web/common.js');
const FlashCard = commonClasses.FlashCard;


test('ChatGPT class exists', () => {
    expect(ChatGPT).toBeDefined();
});

// Logger class needed for ChatGPT class
test('Logger class exists', () => {
    expect(Logger).toBeDefined();
});

let testFlashCard = new FlashCard({
    id: 1,
    question: "What is the capital of France?",
    answer: "Paris",
    collection: "Countries",
    tags: ["Geography", "Europe"],
    dateCreated: "2021-09-01",
    difficulty: 3
});

let testText = `
Page 1: Introduction to Physics
Physics is a captivating and fundamental science that seeks to understand the natural world. At its core, physics is the study of matter, energy, and the interactions between them. It is a discipline that strives to uncover the laws governing the universe, from the smallest particles to the vastness of the cosmos. Physics is divided into various branches, including mechanics, thermodynamics, electromagnetism, and quantum mechanics, each focusing on specific aspects of physical phenomena.
The Essence of Physics
The essence of physics lies in its quest to formulate universal principles that can explain the behavior of the natural world. It uses a combination of empirical evidence, mathematical models, and theoretical reasoning to understand the fundamental forces of nature, such as gravity, electromagnetism, and nuclear forces. Through this understanding, physics aims to uncover the underlying simplicity and symmetry in the universe.
The Role of Experimentation and Theory
Experimentation and theory are the twin pillars of physics. Experiments involve the observation of phenomena under controlled conditions, allowing physicists to test hypotheses and measure physical quantities. Theoretical physics, on the other hand, involves the development of models and frameworks to explain these observations and predict new phenomena. The interplay between theory and experiment drives the advancement of physics, with each informing and refining the other.
Physics and Mathematics
Mathematics is the language of physics. It provides the tools needed to formulate physical laws in a precise and concise manner. Equations in physics not only describe how physical quantities are related but also allow predictions about future behavior. For example, Newton's second law of motion, 
F=ma, succinctly encapsulates the relationship between force, mass, and acceleration, enabling the prediction of an object's motion under the influence of forces.
The Impact of Physics on Technology and Society
The discoveries of physics have profound implications beyond the scientific community. Advances in physics have led to technological innovations that shape our daily lives, from the electricity that powers our homes to the electronics at the heart of our mobile devices. Physics also plays a crucial role in addressing global challenges, such as energy sustainability and climate change, by providing the foundation for renewable energy technologies and environmental monitoring.
The Journey Through Physics
As we embark on this journey through physics, we will explore the fundamental concepts that underpin this discipline. From the mechanics of motion to the principles of energy and heat, and from the forces that hold atoms together to the gravitational pull that governs the orbits of planets, this exploration will reveal the elegance and complexity of the physical world. Physics is not just a pathway to understanding the universe; it is a way of thinking critically about the world and our place within it.
This introduction serves as the gateway to the fascinating world of physics, setting the stage for a deeper exploration of its principles, laws, and the myriad ways they manifest in the natural world.

Page 2: Measurements and Units
The foundation of physics, and indeed all of science, rests on the accurate measurement of physical quantities. These measurements allow us to understand the universe in quantifiable terms, leading to the formulation of physical laws and principles. The system of measurements used in physics is standardized to ensure consistency and accuracy across the scientific community.
The International System of Units (SI)
The International System of Units (SI) is the standard metric system used in science and engineering. It comprises seven base units from which all other units of measurement are derived. These base units are:
Meter (m): The unit of length, defined by the speed of light in a vacuum.
Kilogram (kg): The unit of mass, defined by the Planck constant
Second (s): The unit of time, defined by the transition frequency of cesium-133 atoms.
Ampere (A): The unit of electric current, defined by the elementary charge per second.
Kelvin (K): The unit of temperature, defined by the Boltzmann constant.
Mole (mol): The unit of the amount of substance, defined by the number of atoms in 12 grams of carbon-12.
Candela (cd): The unit of luminous intensity, defined by the luminous efficacy of monochromatic radiation of frequency 
Dimensional Analysis
Dimensional analysis is a powerful tool in physics used to check the consistency of equations and calculations. It involves the study of the dimensions of physical quantities, which are derived from the base units. By ensuring that the dimensions match on both sides of an equation, physicists can verify that their equations are dimensionally consistent, which is a crucial step in validating physical laws and formulas.
The Importance of Units in Calculations
Units play a critical role in physics calculations. Every physical quantity is expressed with a unit, which provides a standard for comparison and ensures that calculations are meaningful. For instance, when calculating velocity, which is distance divided by time, the units of meters per second (m/s) provide a clear understanding of the speed at which an object is moving.
The correct use of units also facilitates the conversion between different measurement systems, such as converting temperatures from Celsius to Kelvin or distances from miles to kilometers. This is essential for communication and collaboration in the global scientific community.
Precision and Accuracy in Measurements
Precision and accuracy are key concepts in the measurement of physical quantities. Precision refers to the consistency of repeated measurements, while accuracy indicates how close a measurement is to the true value. Both are affected by the measurement tools and techniques used, highlighting the importance of choosing appropriate instruments and methods for scientific investigations.
Conclusion
Measurements and units are the fundamental building blocks of physics, providing the means to quantify and understand the physical world. The SI system offers a universal standard for these measurements, ensuring that scientific observations and calculations are precise, accurate, and globally understood. As we delve deeper into the concepts of physics, the careful measurement and analysis of physical quantities will remain a cornerstone of our exploration.
`;

/////////////////////////////////////////////////////////////
// ChatGPT class constructor tests
/////////////////////////////////////////////////////////////
test('ChatGPT class has a constructor', () => {
    const chatGPT = new ChatGPT(logger, envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT).toBeDefined();
});

test('ChatGPT class constructor throws an error if no logger is provided', () => {
    expect(() => {const chatGPT = new ChatGPT();}).toThrow(new Error("ChatGPT constructor requires a logger object as an argument"));
});

test('ChatGPT.openai not to be null if valid key is provided', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT.openai).not.toBeNull();
});

test('ChatGPT.openai to be null if invalid key is provided', () => {
    const chatGPT = new ChatGPT(logger,"test");
    expect(chatGPT.openai).toBeNull();
});

test('ChatGPT.openai to be null if no key is provided', () => {
    const chatGPT = new ChatGPT(logger);
    expect(chatGPT.openai).toBeNull();
});

test('ChatGPT.logger to be an instance of Logger', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT.logger).toBeInstanceOf(Logger);
});

/////////////////////////////////////////////////////////////
// ChatGPT class setApiKey method tests
/////////////////////////////////////////////////////////////
test('ChatGPT class has a setApiKey method', () => {
    const chatGPT = new ChatGPT(logger, envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT.setApiKey).toBeDefined();
});

test('ChatGPT class setApiKey method sets the openai property to null if an invalid key is provided', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    chatGPT.setApiKey("test");
    expect(chatGPT.openai).toBeNull();
});

test('ChatGPT class setApiKey method sets the openai property to null if no key is provided', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    chatGPT.setApiKey();
    expect(chatGPT.openai).toBeNull();
});

test('ChatGPT class setApiKey method sets the openai property to an instance of openai if a valid key is provided', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    chatGPT.setApiKey(envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT.openai).toBeDefined();
    expect(chatGPT.openai).not.toBeNull();
});

/////////////////////////////////////////////////////////////
// ChatGPT class generateResponse method tests
/////////////////////////////////////////////////////////////
test('ChatGPT class has a generateResponse method', () => {
    const chatGPT = new ChatGPT(logger, envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT.generateResponse).toBeDefined();
});

test('ChatGPT class generateResponse method returns a string', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse("Hello", false);
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(1);
    for(let i = 0; i < response.length; i++) {
        let emptyString = ' '.repeat(i);
        expect(response).not.toBe(emptyString);
    }
}, 60000);

test('ChatGPT class generateResponse method returns a string with a length of at least 1000 characters', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse("Please generate a body of text that is at least 1000 characters long.", false);
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(1000);
}, 60000);

test('ChatGPT class generateResponse method returns an empty string if the api key has not been set', async() => {
    const chatGPT = new ChatGPT(logger);
    const response = await chatGPT.generateResponse("Hello", false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method returns an empty string if the api key is invalid', async() => {
    const chatGPT = new ChatGPT(logger,"test");
    const response = await chatGPT.generateResponse("Hello", false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method returns an empty string if the prompt is an empty string', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse("", false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method returns an empty string if the prompt is null', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse(null, false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method returns an empty string if the prompt is undefined', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse(undefined, false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method returns an empty string if the prompt is a number', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse(123, false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method returns an empty string if the prompt is an object', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse({}, false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method returns an empty string if the prompt is an array', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse([], false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method returns an empty string if the prompt is a boolean', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse(true, false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method returns an empty string if the prompt is a function', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const response = await chatGPT.generateResponse(()=>{}, false);
    expect(response).toBe('');
});

test('ChatGPT class generateResponse method executes the stream_cb function and completion_cb function if stream_enabled is true', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const stream_cb = jest.fn();
    const completion_cb = jest.fn();
    await chatGPT.generateResponse("Hello", true, stream_cb, completion_cb);
    expect(stream_cb).toHaveBeenCalled();
    expect(completion_cb).toHaveBeenCalled();
}, 60000);

test('ChatGPT class generateResponse method does not execute the stream_cb function and completion_cb function if stream_enabled is false', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const stream_cb = jest.fn();
    const completion_cb = jest.fn();
    await chatGPT.generateResponse("Hello", false, stream_cb, completion_cb);
    expect(stream_cb).not.toHaveBeenCalled();
    expect(completion_cb).not.toHaveBeenCalled();
});

test('ChatGPT class generateResponse method does not execute the stream_cb function and completion_cb function if stream_enabled is true and the api key is invalid', async() => {
    const chatGPT = new ChatGPT(logger,"test");
    const stream_cb = jest.fn();
    const completion_cb = jest.fn();
    await chatGPT.generateResponse("Hello", true, stream_cb, completion_cb);
    expect(stream_cb).not.toHaveBeenCalled();
    expect(completion_cb).not.toHaveBeenCalled();
});

/////////////////////////////////////////////////////////////
// ChatGPT class isValidOpenAIKey method tests
/////////////////////////////////////////////////////////////
test('ChatGPT class isValidOpenAIKey method returns a boolean', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey("test");
    expect(typeof result).toBe('boolean');
});

test('ChatGPT class isValidOpenAIKey method returns true for a valid key', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey(envVars.parsed.OPENAI_SECRET_KEY);
    expect(result).toBe(true);
});

test('ChatGPT class isValidOpenAIKey method returns false for an invalid key', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey("test");
    expect(result).toBe(false);
});

test('ChatGPT class isValidOpenAIKey method returns false for no key', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey();
    expect(result).toBe(false);
});

test('ChatGPT class isValidOpenAIKey method returns false for an empty string', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey("");
    expect(result).toBe(false);
});

test('ChatGPT class isValidOpenAIKey method returns false for null', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey(null);
    expect(result).toBe(false);
});

test('ChatGPT class isValidOpenAIKey method returns false for undefined', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey(undefined);
    expect(result).toBe(false);
});

test('ChatGPT class isValidOpenAIKey method returns false for a number', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey(123);
    expect(result).toBe(false);
});

test('ChatGPT class isValidOpenAIKey method returns false for an object', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey({});
    expect(result).toBe(false);
});

test('ChatGPT class isValidOpenAIKey method returns false for an array', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey([]);
    expect(result).toBe(false);
});

test('ChatGPT class isValidOpenAIKey method returns false for a boolean', () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = chatGPT.isValidOpenAIKey(true);
    expect(result).toBe(false);
});

/////////////////////////////////////////////////////////////
// ChatGPT class flashCardGenerator method tests
/////////////////////////////////////////////////////////////
test('ChatGPT class has a flashCardGenerator method', () => {
    const chatGPT = new ChatGPT(logger, envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT.flashCardGenerator).toBeDefined();
});

test('ChatGPT class flashCardGenerator method returns an array of flashcards', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeDefined();
    expect(response).toBeInstanceOf(Array);
    expect(response.length).toBe(numberOfCards);
    for(let i = 0; i < response.length; i++) {
        expect(response[i]).toBeDefined();
        expect(response[i].question).toBeDefined();
        expect(response[i].question.length).toBeGreaterThan(0);
        expect(response[i].answer).toBeDefined();
        expect(response[i].answer.length).toBeGreaterThan(0);
        expect(response[i].collection).toBeDefined();
        expect(response[i].collection.length).toBeGreaterThan(0);
        expect(response[i].tags).toBeDefined();
        expect(response[i].tags).toBeInstanceOf(Array);
        expect(response[i].tags.length).toBeGreaterThan(0);
        expect(response[i].difficulty).toBeDefined();
    }
    expect(streaming_cb).toHaveBeenCalled();
}, 120000);

test('ChatGPT class flashCardGenerator method returns null if the input text is too long', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator('a'.repeat(1000000), numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the input text is null', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(null, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the input text is undefined', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(undefined, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the input text is an empty string', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator("", numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the input text is not a string', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(123, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the difficulty is too high', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 6;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the difficulty is too low', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 0;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the difficulty is not a number', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = "test";
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the difficulty is an empty string', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = "";
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the difficulty is null', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = null;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the difficulty is undefined', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = undefined;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the number of cards is too high', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 100;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the number of cards is too low', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 0;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the number of cards is not a number', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = "test";
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the number of cards is an empty string', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = "";
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the number of cards is null', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = null;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method returns null if the number of cards is undefined', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = undefined;
    const difficulty = 3;
    const streaming_cb = jest.fn();
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).toBeNull();
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class flashCardGenerator method writes to logger if the streaming_cb is not a function', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 3;
    const streaming_cb = null;
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).not.toBeNull();
    expect(logger.logs.length).toBeGreaterThan(0);
}, 60000);

test('ChatGPT class flashCardGenerator method writes to logger if the streaming_cb is undefined', async() => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const numberOfCards = 5;
    const difficulty = 3;
    const streaming_cb = undefined;
    const response = await chatGPT.flashCardGenerator(testText, numberOfCards, difficulty, streaming_cb, false);
    expect(response).not.toBeNull();
    expect(logger.logs.length).toBeGreaterThan(0);
}, 60000);

/////////////////////////////////////////////////////////////
// ChatGPT class wrongAnswerGenerator method tests
/////////////////////////////////////////////////////////////
test('ChatGPT class has a wrongAnswerGenerator method', () => {
    const chatGPT = new ChatGPT(logger, envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT.wrongAnswerGenerator).toBeDefined();
});

test('ChatGPT class wrongAnswerGenerator method returns an array of strings', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    const result = await chatGPT.wrongAnswerGenerator(testFlashCard, 3, streaming_cb);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(3);
    expect(streaming_cb).toHaveBeenCalled();
    for(let i = 0; i < result.length; i++) {
        expect(result[i]).toBeDefined();
        expect(typeof result[i]).toBe('string');
        expect(result[i].length).toBeGreaterThan(0);
    }
}, 120000);

test('ChatGPT class wrongAnswerGenerator method returns an array of strings when numberOfAnswers is a number as string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    const result = await chatGPT.wrongAnswerGenerator(testFlashCard, "3", streaming_cb);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(3);
    expect(streaming_cb).toHaveBeenCalled();
    for(let i = 0; i < result.length; i++) {
        expect(result[i]).toBeDefined();
        expect(typeof result[i]).toBe('string');
        expect(result[i].length).toBeGreaterThan(0);
    }
}, 120000);

test('ChatGPT class wrongAnswerGenerator method returns an array of strings and logs to the logger when the callback function is not a function', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = null;
    const result = await chatGPT.wrongAnswerGenerator(testFlashCard, 3, streaming_cb);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(3);
    expect(logger.logs.length).toBeGreaterThan(0);
    for(let i = 0; i < result.length; i++) {
        expect(result[i]).toBeDefined();
        expect(typeof result[i]).toBe('string');
        expect(result[i].length).toBeGreaterThan(0);
    }
}, 120000);

test('ChatGPT class wrongAnswerGenerator method throws if the input card is not a flashcard', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    await expect(chatGPT.wrongAnswerGenerator("test", 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card is null', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    await expect(chatGPT.wrongAnswerGenerator(null, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card is undefined', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    await expect(chatGPT.wrongAnswerGenerator(undefined, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

// input card missing properties
test('ChatGPT class wrongAnswerGenerator method throws if the input card is missing the question property', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    delete testCard.question;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card is missing the answer property', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    delete testCard.answer;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card is missing the collection property', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    delete testCard.collection;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card is missing the tags property', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    delete testCard.tags;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card is missing the difficulty property', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    delete testCard.difficulty;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

// input card properties not strings, empty strings, null, undefined
test('ChatGPT class wrongAnswerGenerator method throws if the input card question is not a string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.question = 123;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card question is an empty string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.question = "";
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card answer is not a string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.answer = 123;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card answer is an empty string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.answer = "";
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card collection is not a string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.collection = 123;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card collection is an empty string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.collection = "";
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card tags is not an array of strings', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.tags = 123;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card tags is an empty array of strings', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.tags = [];
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card tags is an array of non-strings and strings', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.tags = [123, "test"];
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card difficulty is not a number', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.difficulty = "test";
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card difficulty is an empty string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.difficulty = "";
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card difficulty is null', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.difficulty = null;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card difficulty is too high', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.difficulty = 100;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the input card difficulty is too low', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    let testCard = new FlashCard(testFlashCard);
    testCard.difficulty = 0;
    await expect(chatGPT.wrongAnswerGenerator(testCard, 3, streaming_cb)).rejects.toThrow(new Error("wrongAnswerGenerator requires a well constructed FlashCard object as an argument"));
    expect(streaming_cb).not.toHaveBeenCalled();
});

// number of wrong answers too high, too low, not a number, empty string, null, undefined
test('ChatGPT class wrongAnswerGenerator method throws if the number of wrong answers is too high', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    await expect(chatGPT.wrongAnswerGenerator(testFlashCard, 100, streaming_cb)).rejects.toThrow(new Error("numberOfAnswers is not a number or is out of range."));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the number of wrong answers is too low', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    await expect(chatGPT.wrongAnswerGenerator(testFlashCard, 0, streaming_cb)).rejects.toThrow(new Error("numberOfAnswers is not a number or is out of range."));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the number of wrong answers is not a number', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    await expect(chatGPT.wrongAnswerGenerator(testFlashCard, "test", streaming_cb)).rejects.toThrow(new Error("numberOfAnswers is not a number or is out of range."));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the number of wrong answers is an empty string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    await expect(chatGPT.wrongAnswerGenerator(testFlashCard, "", streaming_cb)).rejects.toThrow(new Error("numberOfAnswers is not a number or is out of range."));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the number of wrong answers is null', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    await expect(chatGPT.wrongAnswerGenerator(testFlashCard, null, streaming_cb)).rejects.toThrow(new Error("numberOfAnswers is not a number or is out of range."));
    expect(streaming_cb).not.toHaveBeenCalled();
});

test('ChatGPT class wrongAnswerGenerator method throws if the number of wrong answers is undefined', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const streaming_cb = jest.fn();
    await expect(chatGPT.wrongAnswerGenerator(testFlashCard, undefined, streaming_cb)).rejects.toThrow(new Error("numberOfAnswers is not a number or is out of range."));
    expect(streaming_cb).not.toHaveBeenCalled();
});



/////////////////////////////////////////////////////////////
// ChatGPT class interpretMathExpression method tests
/////////////////////////////////////////////////////////////
const mathExpArr = ["x=(-b+-sqrt(b^2-4ac))/2a", "ax^2+bx+c=0", "integral of(x^2)dx", "derivative of(x^2)", "sum of(1,2,3,4,5,6,7,8,9,10)", "integral of(x^2)dx from 0 to 1", "limit of(x^2) as x approaches 0","x^2 + 3x - 4 = 0", "2x^2 - 4x + 2 = 0","-b+-sqrt(b^2-4ac)/2a","integral((2pi*x^2)dx,0,1)"];
test('ChatGPT class has a interpretMathExpression method', () => {
    const chatGPT = new ChatGPT(logger, envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT.interpretMathExpression).toBeDefined();
});

test('ChatGPT class interpretMathExpression method returns an array of one math expression', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = await chatGPT.interpretMathExpression(mathExpArr[0]);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(1);
    for(let i = 0; i < result.length; i++) {
        expect(result[i]).toBeDefined();
        expect(typeof result[i]).toBe('string');
        expect(result[i].length).toBeGreaterThan(0);
        let regex = new RegExp(/\$\$.*?\$\$/);
        let match = result[i].match(regex);
        expect(match).not.toBeNull();
        expect(match.length).toBe(1);
    }
}, 120000);

test('ChatGPT class interpretMathExpression method returns an array of math expressions when the input is a an array of strings with multiple math expressions', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = await chatGPT.interpretMathExpression(mathExpArr);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(mathExpArr.length);
    for(let i = 0; i < result.length; i++) {
        expect(result[i]).toBeDefined();
        expect(typeof result[i]).toBe('string');
        expect(result[i].length).toBeGreaterThan(0);
        let regex = new RegExp(/\$\$.*?\$\$/);
        let match = result[i].match(regex);
        expect(match).not.toBeNull();
        expect(match.length).toBe(1);
    }
}, 120000);

// input expression not a string, empty string, null, undefined, object
test('ChatGPT class interpretMathExpression method returns an empty array if the input expression is null', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = await chatGPT.interpretMathExpression(null);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
});

test('ChatGPT class interpretMathExpression method returns an empty array if the input expression is undefined', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = await chatGPT.interpretMathExpression(undefined);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
});

test('ChatGPT class interpretMathExpression method returns an empty array if the input expression is an empty string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = await chatGPT.interpretMathExpression("");
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
});

test('ChatGPT class interpretMathExpression method returns an empty array if the input expression is not a string', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = await chatGPT.interpretMathExpression(123);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
});

test('ChatGPT class interpretMathExpression method returns an empty array if the input expression is an object', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = await chatGPT.interpretMathExpression({});
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
});

// input expression not a math expression
test('ChatGPT class interpretMathExpression method returns an empty array if the input expression is not a math expression', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = await chatGPT.interpretMathExpression("test");
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
},120000);

test('ChatGPT class interpretMathExpression method returns an empty array if the input array contains an expression that is not a math expression', async () => {
    const chatGPT = new ChatGPT(logger,envVars.parsed.OPENAI_SECRET_KEY);
    const result = await chatGPT.interpretMathExpression(["x^2 + 3x - 4 = 0", "2x^2 - 4x + 2 = 0","-b+-sqrt(b^2-4ac)/2a","test"]);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
},120000);

/////////////////////////////////////////////////////////////
// ChatGPT class parseGPTjsonResponse method tests
/////////////////////////////////////////////////////////////
test('ChatGPT class has a parseGPTjsonResponse method', () => {
    const chatGPT = new ChatGPT(logger, envVars.parsed.OPENAI_SECRET_KEY);
    expect(chatGPT.parseGPTjsonResponse).toBeDefined();
});

// TODO: input response not a string, empty string, null, undefined
// TODO: input response not a valid json string