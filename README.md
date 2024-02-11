# SWE-Group4-Project
Intro to SWE Group 4 Project

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
git clone https://github.com/andrewmcdan/SWE-Group4-Project.git
```
3. cd into the repo and npm install it
```
cd SWE-Group4-Project
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