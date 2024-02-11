# CleverDecks
A modern flash card system that allows students to create flashcards using AI assistance (ChatGPT) and use this system to study flash cards using a novel progressive delivery system that allows for incremental learning of the content. The interface is web based and allows access from any device, while the backend is a locally run application that the user runs on their computer. This allows the user to save their flashcards on their computer or anywhere else.

## TODO's (in no particular order)
1. Complete each of the support classes in the /index.js file.
2. Finish all the server endpoint code. 
3. ChatGPT interfacing and related classes
4. Work on the various web pages. Pages to work on:
- /web/index.html - The main landing page. Probably needs to include something to let the user know if ChatGPT is enabled and let them add their OpenAI API key if needed.
- /web/create.html - A page for creating flash cards. Need to include functions for using ChatGPT to generate cards as well as manually creating cards. 
- /web/study.html - The flash card study page. 
- /web/quiz.html - The quiz page.

# Getting Started
To get this project running on your machine for development:
1. Install [node.js and npm](https://nodejs.org/en/download). 
2. Clone this repo
```
git clone https://github.com/andrewmcdan/CleverDecks.git
```
3. cd into the repo and npm install it
```
cd CleverDecks
npm i
```
4. At this point, you can run it as is with "npm start" but to have ChatGPT work immediately, create a .env file with the following line in it:
```
OPENAI_SECRET_KEY=your-api-key
```
5. Run it
```
npm start
```
6. Point your browser at http://localhost:3000/

## Run the binary
If you just want to run it, download the precompiled binary (if it is available), run it, and point your browser to http://localhost:3000/

Note: The binaries may be out of date.