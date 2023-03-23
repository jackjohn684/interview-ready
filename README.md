# Interview Ready

The goal of this project is to prepare software engineers for coding interviews and give meaningful direction in where they should spend their preparation time.


## Readiness Criteria

If you are ready for an interview then you should be able to solve a medium to hard interview problem in the general time window that an interview gives you. Online assessments can be merciless and require 100% passing, but give you potentially more time. In person interviews allow you to talk to a solution and they may accept an unfinished solution that was trending to success. Some companies may ask easy questions, but this tool is designed to prepare you for all types of software engineer posisitions.

This is the default. A "difficult" problem is defined as Medium difficutly level with acceptance rate under 55% or Hard difficulty level.

- Easy questions count for 10 points
- Medium questions over 55 acceptance rate count for 25 points.
- Medium under accept rate 55 and Hard questions count for 100 points
- If you look at the discussion tab first you only get one quarter of your points.
- If you look at the discussion tab *after* succeeding on a question you get a bonus 10 points.

20% of the score is reserved for questions completed within 60 minutes and having no view of the discussions tab beforehand.

Points are tallied and normalized by target topics. Once you have 500 points you get your "ready status". However, if you haven't
solved any "difficult" problem in under an hour than your score can only be 80%. To get to 90% you at least need to have solved one
"difficult" problem in under an hour. To get to 100% or "Ready" you must have solved at least two.

# Architecture

Chrome extensions divide architecture into three parts:
- Code running on the website js (content-script.js)
- Code running in a persistent worker (background.js)
- Code running in the extensions pop-up UX (home.js)

## content-script.js

content-script.js runs on every load of "leetcode.com" with the user's credentials which are stored in cookies (affecting all requests). 
This script has the access to call APIs of leetcode.com as the leetcode user. Also, it can detect when the user is *not* signed in.

Logical operations do not belong here. Only the fetching of data that is not available to the service worker. 

## background.js

All business logic should be encapsulated in the service worker. 

## home.js

All UX logic should be in the UX layer (which only exists when being viewed). Data needed to render should be fetched from the controller (background.js).

## Data

Data that can be queried from the leetcode server does not need to be sync'd to multiple devices (use local storage rather than sync storage). Querying for solved question data can be expensive though and it is worth at least not redundantly fetching on the same device. Which problems are available only changes weekly. 