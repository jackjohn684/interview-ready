# Interview Ready

The goal of this project is to prepare software engineers for coding interviews and give meaningful direction in where they should spend their preparation time.

## Readiness Criteria

If you are ready for an interview then you should be able to solve a medium to hard interview problem in the general time window that an interview gives you. Online assessments can be merciless and require 100% passing, but give you potentially more time. In person interviews allow you to talk to a person and they may accept an unfinished solution that was trending to success. Some companies may ask easy questions, but this tool is designed to prepare you for a broad range of software engineer posisitions.

# Architecture

Chrome extensions divide architecture into three parts:
- Code running on the website js (content-script.js)
- Code running in the extensions pop-up UX (home.js)

## content-script.js

Runs on every load of "leetcode.com" with the user's credentials which are stored in cookies (affecting all requests). 

The use and purpose of this script is to call leetcode apis, get data, and push it to storage.

## home.js

Show the UX to the user. Should show current state and provide launch points to study topics as needed.

## Data and Privacy

All data stays within the extension with the purpose of informing the UX and providing some guidance on studying leetcode questions.

## Contributions!

Please log an issue or create a pull request if you have suggestions that way. Thanks!