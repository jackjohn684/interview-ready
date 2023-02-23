/*
content-script.js runs on every load of "leetcode.com" with the user's credentials which are stored in cookies (affecting all requests). 
This script has the access to call APIs of leetcode.com as the leetcode user. Also, it can detect when the user is *not* signed in.

Logical operations do not belong here. Only the fetching of data that is not available to the service worker. All business logic should 
be encapsulated in the service worker. All UX logic should be in the UX layer (which only exists when being viewed). Data that can be 
queried from the leetcode server does not need to be sync'd to multiple devices (use local storage rather than sync storage). Querying for
solved question data can be expensive though and it worth at least not redundantly fetching on the same device. Which problems are 
available only changes weekly. 

*/

// Signal that this instance of the leetcode site has been loaded.
chrome.runtime.sendMessage({key: DATA_KEY_PAGE_LOADED}, function (data) {
  delog(`Messaged ${DATA_KEY_PAGE_LOADED} acknowledged:`);
  delog(data);
});

/**
 * API Service
 */
const APIS = {};

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  delog('Message recieved!');
  delog(msg);
  delog(sender);
  if(msg.key in APIS) {
    APIS[msg.key](msg.data);
    sendResponse({success: true});
  } else {
    sendResponse({success: false, error: `Unknown API ${msg.key}`});
  }
});

/**
 * API Register given a key and a function that will return a query it will
 * register an API that can be called from the background service. This let's
 * the background service choose if/when APIs are called. Additionally, the background
 * service can provide data for the query.
 */
function RegisterPageAPI(key, queryBodyFunc) {
  if(key in APIS) {
    throw new Error(`Cannot re-register API ${key}`);
  }

  APIS[key] = async (data) => {
    let queryBody = queryBodyFunc(data);
    delog(`key:${key}, queryBody:${queryBody}`);
    const response = await fetch(
      "https://leetcode.com/graphql/",
      {
        "headers": {
          "content-type": "application/json",
        },
        "body": queryBody,
        "method": "POST"
      });
    const results = await response.json();
    delog(`Messaged key: ${key}`);
    delog(results);
    chrome.runtime.sendMessage(
      {
        key: key,
        data: results
      }, 
      function () {
        delog(`Messaged ${key} acknowledged.`);
      }
    );
  };
}


/*
 * Register APIs
 */

//Signed-In User Profile Data
RegisterPageAPI(
  DATA_KEY_USER_STATUS,
  ()=>JSON.stringify({
    operationName: "globalData",
    query: "query globalData {userStatus {isSignedIn username realName avatar}}",
    variables: {}
  })
);

// Submission Times
RegisterPageAPI(
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
RegisterPageAPI(
  DATA_KEY_ALL_PROBLEMS,
  ()=>"{\"query\":\"query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {problemsetQuestionList: questionList(categorySlug: $categorySlug limit: $limit skip: $skip filters: $filters) {total: totalNum questions: data {acRate difficulty frontendQuestionId: questionFrontendId isFavor paidOnly: isPaidOnly status title titleSlug topicTags {name id slug} hasSolution hasVideoSolution}}}\",\"variables\":{\"categorySlug\":\"\",\"skip\":0,\"limit\":3000,\"filters\":{}}}",
);