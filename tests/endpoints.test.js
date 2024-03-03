// these test should be run with the server running
// TODO: need to write all the tests for all the endpoints

const server = 'http://localhost:3000';
const apiBase = '/api/';
const webBase = '/web/';
const request = require('supertest');


test('server is running', () => {
    expect(true).toBe(true);
    // TODO: check if server is running
});

test('GET /', async () => {
    const response = await request(server).get('/');
    expect(response.statusCode).toBe(302); // redirect
});

test('GET /web/index.html', async () => {
    const response = await request(server).get(webBase + 'index.html');
    expect(response.statusCode).toBe(200);
    expect(response.type).toBe('text/html');
});

test('GET /api/getCards?options', async () => {
    const response = await request(server).get(apiBase + 'getCards?collection=Geography&tags=Europe');
    expect(response.statusCode).toBe(200);
    expect(response.type).toBe('application/json');
    expect(response.body).toBeDefined();
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

test('POST /api/generateCards', async () => {
    const response = await request(server).post(apiBase + 'generateCards').send({text: testText, numberOfCards: 5, difficulty: 3});
    expect(response.statusCode).toBe(200);
    expect(response.type).toBe('application/json');
    expect(response.body).toBeDefined();
    try{
        let cards = response.body.cards;
        expect(cards).toBeDefined();
        expect(cards.length).toBe(5);
        for(let i = 0; i < cards.length; i++){
            expect(cards[i].question).toBeDefined();
            expect(cards[i].answer).toBeDefined();
            expect(cards[i].tags).toBeDefined();
            expect(cards[i].difficulty).toBeDefined();
            expect(cards[i].collection).toBeDefined();
        }
    }catch(e){
        expect(e).toBe(null);
    }
}, 60000);

