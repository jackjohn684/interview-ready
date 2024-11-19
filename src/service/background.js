importScripts("/shared/action-keys.js");
importScripts("/shared/data-keys.js");
importScripts("/shared/functions.js");

delog("background.js Loading " + new Date());

// In memory cache (rather than using storage)
const cache = {};

  
/**
 * Static and generic successResponse
 */
const successResponse = {success:true};


/**
 * Function to send a message to a specific instance of leetcode site scripts. 
 */
function queryDataFromTab(tabId, key, data, queryFunc) {
  delog("queryDataFromTab");
  delog(tabId);
  delog(data);

  let message = {
    action: DATA_ACTION_QUERY,
    key: key,
    query: queryFunc(data)
  };
  delog(message);

  chrome.tabs.sendMessage(
    tabId, 
    message,
    (response) => {
      delog(`Response from tabId ${tabId} for key ${key}`);
      delog(response);
    }
  );
}

/**
 * Controller APIs that either can be called from on site scripts or UX scripts
*/ 
const APIS={};

/**
 * API called when a leetcode page is loaded
 */
APIS[DATA_KEY_PAGE_LOADED] = (msg, sender, sendResponse) => {
  queryForNewDataIfNeeded(DATA_KEY_USER_STATUS, sender.tab.id, 1);
  queryForNewDataIfNeeded(DATA_KEY_ALL_PROBLEMS, sender.tab.id, 1);
  //queryForNewDataIfNeeded(DATA_KEY_SUBMISSIONS, sender.tab.id, 1);
  sendResponse(successResponse);
}

/**
 * Generic Cache Update Responses
 */
APIS[DATA_KEY_USER_STATUS] = genericUpdateCache;
APIS[DATA_KEY_ALL_PROBLEMS] = genericUpdateCache;
APIS[DATA_KEY_SUBMISSIONS] = genericUpdateCache;

function genericUpdateCache(msg, _sender, sendResponse) {
  updateCache(msg.key, msg.data);
  sendResponse(successResponse);
}

/**
 * APIs called by UX to retrieve data needed to render
 */
APIS[DATA_KEY_GET_USER_IS_SIGNED_IN] = (_msg, _sender, sendResponse) => {
  delog(DATA_KEY_GET_USER_IS_SIGNED_IN);
  sendResponse(
    {
      success: true, 
      result: cache[DATA_KEY_USER_STATUS] ? 
        cache[DATA_KEY_USER_STATUS].data.userStatus.isSignedIn : 
        false
    }
)};

APIS[DATA_KEY_GET_TOPIC_READINESS] = (_msg, _sender, sendResponse) => {
  delog(DATA_KEY_GET_TOPIC_READINESS);
  sendResponse(
    {
      success: true, 
      result: cache[DATA_KEY_TOPIC_READINESS] 
    }
)};

APIS[DATA_KEY_GET_TOPIC_NEXT_TARGET_QUESTION] = (msg, _sender, sendResponse) => {
  delog(DATA_KEY_GET_TOPIC_NEXT_TARGET_QUESTION);
  let response = {
    success:true, 
    result: `https://leetcode.com/problems/${GetNextPracticeProblem(msg.data.topic)}/`
  };
  delog("Response: ");
  delog(response);
  sendResponse(response);
}

/**
 * API infrastructure that listens for messages from content-scripts and UX scripts
 */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  delog("Controller recieved message!");
  delog(msg);
  delog(sender);
  if(msg.key in APIS) {
    APIS[msg.key](msg, sender, sendResponse);
  } else {
    let message = `Unsupported key! ${msg.key}`;
    sendResponse({success: false}, message);
    return;
  }
});



/**
 * Sends message to UX that it needs to rerender
 */
function sendUxReRenderMessage() {
  delog(sendUxReRenderMessage.name);
  chrome.runtime.sendMessage({key: DATA_KEY_RERENDER}, function (data) {
    delog(`Messaged ${DATA_KEY_RERENDER} acknowledged. Data:`);
    delog(data);
  });
}


/**
 * Query funcs. These functions given some data will produce the necessary query body.
 */

const queryFuncs = [];

function registerQueryFunc(key, func) {
  delog(registerQueryFunc.name);
  delog(key);

  if(key in queryFuncs) {
    throw new Error(`Already registered: ${key}`);
  }

  queryFuncs[key] = func;
}

function getQueryFunc(key) {
  delog(getQueryFunc.name);
  return queryFuncs[key];
}

//Signed-In User Profile Data
registerQueryFunc(
  DATA_KEY_USER_STATUS,
  () => JSON.stringify({
    operationName: "globalData",
    query: "query globalData {userStatus {isSignedIn isPremium username realName avatar}}",
    variables: {}
  })
);

// Submission Times
registerQueryFunc(
  DATA_KEY_SUBMISSIONS,
  (data) => JSON.stringify({
    operationName: "Submissions",
    query: `query Submissions($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!) {
        submissionList(offset: $offset, limit: $limit, lastKey: $lastKey, questionSlug: $questionSlug) {
          lastKey
          hasNext
          submissions {
            titleSlug
            statusDisplay
            timestamp
          }
        }
      }`,
    variables: { offset: 0, limit: 200, lastKey: null, questionSlug: data.titleSlug }
  })
);

// All Questions Data
registerQueryFunc(
  DATA_KEY_ALL_PROBLEMS,
  () => "{\"query\":\"query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {problemsetQuestionList: questionList(categorySlug: $categorySlug limit: $limit skip: $skip filters: $filters) {total: totalNum questions: data {acRate difficulty frontendQuestionId: questionFrontendId isFavor paidOnly: isPaidOnly status title titleSlug topicTags {name id slug} hasSolution hasVideoSolution}}}\",\"variables\":{\"categorySlug\":\"\",\"skip\":0,\"limit\":3000,\"filters\":{}}}",
);

/**
 * Queries for data by sending messages to the content scripts which call leetcode directly using user's credentials
 */
function queryForNewDataIfNeeded(data_key, tabId, secondsFresh, data) {
  //if(!(data_key in cache) || !cache[data_key].lastUpdated || cache[data_key].lastUpdated + 1000 * secondsFresh < Date.now()) {
    queryDataFromTab(tabId, data_key, data, getQueryFunc(data_key));
  //}
}

/**
 * Helper function for updating submission cache.
 */
function updateSumissionsCache(key, value) {
  if(!cache[key]) {
    cache[key] = {};
  }

  let slug = value.data.questionSubmissionList.submissions[0].titleSlug;
  cache[key][slug] = value;
}

/**
 * Updates the in memory cache
 */
function updateCache(key, value) {
  delog(`updateCache: ${key}`);
  delog(value);
  let prevValue = cache[key];
  cache[key] = value;
  cache[key].lastUpdated = Date.now();
  processUpdates(key, prevValue, value);
}

/**
 * Global callback for all cache updates
 */
function processUpdates(key, _prevValue, _value) {
  if(key == DATA_KEY_ALL_PROBLEMS) {
    createAndCacheReadinessData();
  }
 
  sendUxReRenderMessage();
}

/**
 * Legacy mode readiness constants
 */
const READINESS_MODE_LEGACY = "legacy";
const READINESS_TARGET_UPPER_AC_RATE = 60.0;
const READINESS_TARGET_LOWER_AC_RATE = 40.0;


/**
 * Logic for determining whether you are not ready, almost ready, or ready per topic.
 */
function createAndCacheReadinessData() {
  const allProblems = cache[DATA_KEY_ALL_PROBLEMS];
  /*const allSubmissions = cache[DATA_KEY_SUBMISSIONS];
  const questionStartTimes = cache[DATA_KEY_TIMESTAMP_QUESTION];
  const solutionViewTimes = cache[DATA_KEY_TIMESTAMP_SOLUTIONS];*/

  const readinessMode = READINESS_MODE_LEGACY;
  const targetTopics = ['hash-table','string','linked-list','queue','dynamic-programming','array','sorting','heap-priority-queue',
        'depth-first-search','breadth-first-search', 'binary-search'];
  
  let readinessData = {};

  switch(readinessMode) {
    case READINESS_MODE_LEGACY:
      readinessData = buildLegacyReadinessMode(allProblems, targetTopics);
      break;
  }

  cache[DATA_KEY_TOPIC_READINESS] = readinessData;
}

/**
 * Legacy readiness calculator
 */
function buildLegacyReadinessMode(allProblems, targetTopics) {
  delog(buildLegacyReadinessMode);
  delog(allProblems);
  // Build Topic Points
  let topicPoints = {};
  allProblems.data.problemsetQuestionList.questions.forEach((question) => {
    if(question.status == "ac") {
      let points = .1;
      if(question.difficulty == 'Easy') {
        points = .35;
      } else if(question.difficulty == 'Medium' && 
        question.acRate >= READINESS_TARGET_UPPER_AC_RATE) {
        points = .75;
      } else if(question.difficulty == 'Medium' && 
          question.acRate < READINESS_TARGET_UPPER_AC_RATE && 
          question.acRate > READINESS_TARGET_UPPER_AC_RATE) {
        points = 1;
      } else if(question.difficulty == 'Medium') {
        points = 1.5;
      } else if (question.difficulty == 'Hard') {
        points = 2;
      }
  
      for(var j=0; j<question.topicTags.length; j++) {
        var topic = question.topicTags[j].slug;
        if(!topicPoints[topic]) {
          topicPoints[topic] = 0;
        }
  
        topicPoints[topic] += points;
      }
    }
  });

  // Normalize and classify as ready/almost/notReady
  let readinessData = {};

  // Initialize all as not ready in case they have done no problems in that topic.
  targetTopics.forEach((topic) => {
    readinessData[topic] = ["notReady", 0.0];
  });
  
  Object.entries(topicPoints).forEach(element => {
    var topic = element[0];
    if(targetTopics.includes(topic)) {
        var readinessScore = element[1];
        var normalizedReadinessScore = readinessScore / 5.0;
        var readinessScoreFormattedAsPercent = 100.0*normalizedReadinessScore;

        delog(`${normalizedReadinessScore} == ${readinessScore} / 125.0`)

        if(normalizedReadinessScore >= 1.0) {
          readinessData[topic] = ["ready", readinessScoreFormattedAsPercent];
        } else if (normalizedReadinessScore > .7) {
          readinessData[topic] = ["almost", readinessScoreFormattedAsPercent];
        } else {
          readinessData[topic] = ["notReady", readinessScoreFormattedAsPercent];
        }
    }
  });

  return readinessData;
}

/**
 * Get the next suggested practice problem
 */
function GetNextPracticeProblem(topic) {
  delog(`GetNextPracticeProblem(${topic})`);
  const allProblems = cache[DATA_KEY_ALL_PROBLEMS];
  const userHasPremium = cache[DATA_KEY_USER_STATUS].data.userStatus.isPremium;
  const unsolvedProblemsMediumMoreDifficultThanTarget = []
  const unsolvedProblemsMediumAtTarget = [];
  const unsolvedProblemsMediumEasierThanTarget = [];
  const unsolvedProblemsHard = [];
  const unsolvedProblemsEasy = [];

  const solvedProblems = []; // If they've solved everything give them a target one to repeat.

  allProblems.data.problemsetQuestionList.questions.forEach((question) => {
    let relatedToTargetTopic = question.topicTags.find(t => t.slug == topic);
    if(relatedToTargetTopic && (!question.paidOnly || userHasPremium)) {
      if(question.status != "ac") {
        if(question.difficulty == 'Easy') {
          unsolvedProblemsEasy.push(question.titleSlug);
        } else if(question.difficulty == 'Medium' && question.acRate >= READINESS_TARGET_UPPER_AC_RATE) {
          unsolvedProblemsMediumEasierThanTarget.push(question.titleSlug);
        } else if(question.difficulty == 'Medium' 
            && question.acRate < READINESS_TARGET_UPPER_AC_RATE
            && question.acRate > READINESS_TARGET_LOWER_AC_RATE) {
          unsolvedProblemsMediumAtTarget.push(question.titleSlug);
        } else if(question.difficulty == 'Medium') {
          unsolvedProblemsMediumMoreDifficultThanTarget.push(question.titleSlug)
        } else if (question.difficulty == 'Hard') {
          unsolvedProblemsHard.push(question.titleSlug)
        }
      } else {
        solvedProblems.push(question.titleSlug);
      }
    }
  });

  const randomElementInArray = (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  const numberOfEasyProblemsFirst = Math.min(8, unsolvedProblemsEasy.length);
  const numberOfBeforeTargetFirst = Math.min(10, unsolvedProblemsEasy.length + unsolvedProblemsMediumEasierThanTarget.length);

  if (numberOfEasyProblemsFirst > solvedProblems.length) {
    return randomElementInArray(unsolvedProblemsEasy);
  } else if (numberOfBeforeTargetFirst > solvedProblems.length) {
    return randomElementInArray(unsolvedProblemsMediumEasierThanTarget);
  }

  if(unsolvedProblemsMediumAtTarget.length > 0) {
    return randomElementInArray(unsolvedProblemsMediumAtTarget);
  } else if(unsolvedProblemsMediumEasierThanTarget.length > 0) {
    return randomElementInArray(unsolvedProblemsMediumEasierThanTarget);
  } else if(unsolvedProblemsMediumMoreDifficultThanTarget.length > 0) {
    return randomElementInArray(unsolvedProblemsMediumMoreDifficultThanTarget);
  } else if(unsolvedProblemsHard.length > 0) {
    return randomElementInArray(unsolvedProblemsHard);
  } else if (unsolvedProblemsEasy.length > 0) {
    return randomElementInArray(unsolvedProblemsEasy);
  } else {
    return randomElementInArray(solvedProblems);
  }
}

/**
 * Helper function for decoding messages sent to leetcode APIs.
 */
const payloadDecoder = new TextDecoder("utf-8");
function getPayload(request) {
  return JSON.parse(payloadDecoder.decode(request.requestBody.raw[0].bytes));
}

/**
 * Generic helper function for writing to sync storage any data that has a timestamp.
 */
function writeTimeStampData(dataName, itemId) {
  chrome.storage.sync.get([dataName], (data) => {
    if(!data[dataName]) {
      data[dataName] = {};
    }

    if(!data[dataName][itemId]) {
      data[dataName][itemId] = new Date().toJSON();
    }

    chrome.storage.sync.set(data);
    delog(dataName);
    delog(itemId);
    delog(data);
  });
}

/**
 * Infrastructure for listening to requests made by the page. This is intended to listen to APIs made 
 * by the site, not by the extension. These events are sometimes more reliable and durable then looking
 * at the UX for clicks.
 */
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    var payload = getPayload(details);
    delog(`graphQlCallback operationName: ${payload.operationName}`);
    switch (payload.operationName) {
      case "questionTopicsList":
        // Record views on discussion tab
        writeTimeStampData("discussion_tab", payload.variables.questionId);
        break;
      case "questionData":
        // Record views on problem
        writeTimeStampData("question_viewed", payload.variables.titleSlug);
        break;
      case "submitModalInfo":
        // Update solved data status if there any updates to submissions
        chrome.tabs.sendMessage(details.tabId, { msg: "solved_problem" });
        break;
      default:
        delog(`ignored operationName: ${payload.operationName}`);
    }
  },
  { urls: ["https://leetcode.com/graphql"] },
  ["requestBody"]
);

delog("background.js Loaded " + new Date());
