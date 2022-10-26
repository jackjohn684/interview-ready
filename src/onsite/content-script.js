console.log("onsite 01");

function updateProficiencies(questions, submissionTimes, discussionTimes, viewTimes) {

  console.log("updateProficiencies");
  console.log(submissionTimes);
  console.log(discussionTimes);
  console.log(viewTimes);

  var myTagProficiencyCount = {};
  for(var i=0; i<questions.length; i++) {
      var value = .1;
      var question = questions[i];
      if(question.difficulty != 'Easy' && question.acRate < 55.0) {
          value = 1;
      }
  
      for(var j=0; j<question.topicTags.length; j++) {
          var topic = question.topicTags[j].slug;
          if(!myTagProficiencyCount[topic]) {
              myTagProficiencyCount[topic] = 0;
          }
  
          myTagProficiencyCount[topic] += value;
      }
  }
  
  var sortedTopicProficiency = Object.entries(myTagProficiencyCount).sort((a,b) => {
                  return b[1] - a[1];
  });

  var retPromise = chrome.storage.sync.set({solved: sortedTopicProficiency}, () => {
    console.log("Solved problems set to:");
    console.log(sortedTopicProficiency);
  });

  chrome.runtime.sendMessage({msg: "data_updated"});

  return retPromise;
}

async function getFirstSuccessfulSubmission(titleSlug, data, firstSuccessSubmissionField) {
  console.log(`getFirstSuccessfulSubmission ${titleSlug}`);

  return fetch("https://leetcode.com/graphql/", {
    "headers": {
      "content-type": "application/json",
    },
    "body": JSON.stringify({
      operationName: "Submissions",
      query: `query Submissions($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!) {
        submissionList(offset: $offset, limit: $limit, lastKey: $lastKey, questionSlug: $questionSlug) {
          lastKey
          hasNext
          submissions {
            statusDisplay
            timestamp
          }
        }
      }`,
      variables: {offset: 0, limit: 200, lastKey: null, questionSlug: titleSlug}
    }),
    "method": "POST"
  }).then((response) => response.json())
    .then((results) => {
      var submissions = results.data.submissionList.submissions;

      for(let i=submissions.length - 1; i>=0; i--) {
        if(submissions[i].statusDisplay == "Accepted") {
          data[firstSuccessSubmissionField] = new Date(submissions[i].timestamp * 1000).toJSON();
          break;
        }
      }
  });
}

async function writeSolvedQuestionsToStorage(questions) {
  console.log("writeSolvedQuestionsToStorage");
  var solvedQuestionsDataName = "solved_questions";
  return chrome.storage.local.get([solvedQuestionsDataName],async (data) => {
    if(!data[solvedQuestionsDataName]) {
      data[solvedQuestionsDataName] = {};
    }

    let getSubmissionTimesPromises = [];

    for(let i=0; i<questions.length; i++) { 
      let question = questions[i];
      if(!data[solvedQuestionsDataName][question.titleSlug]) {
        data[solvedQuestionsDataName][question.titleSlug] = {
          id: question.frontendQuestionId,
        };
      }

      let questionData = data[solvedQuestionsDataName][question.titleSlug];

      var firstSuccessSubmissionField = "firstSuccessSubmission"
      if(!questionData[firstSuccessSubmissionField]) {
        var promise = getFirstSuccessfulSubmission(question.titleSlug, questionData, firstSuccessSubmissionField);
        // slow down how quickly we request these or we could send 100's
        // of requests in parallel and get 429's from leetcode.
        await promise;
        getSubmissionTimesPromises.push(promise);
      }
    }

    await Promise.all(getSubmissionTimesPromises);
      chrome.storage.local.set(data, () => {
        console.log("setting solved_questions");
        console.log(data);
      });

      return data;
  });
}

function updateSolvedProblems() {
  fetch("https://leetcode.com/graphql/", {
    "headers": {
      "content-type": "application/json",
    },
    "body": "{\"query\":\"query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {problemsetQuestionList: questionList(categorySlug: $categorySlug limit: $limit skip: $skip filters: $filters) {total: totalNum questions: data {acRate difficulty frontendQuestionId: questionFrontendId isFavor paidOnly: isPaidOnly status title titleSlug topicTags {name id slug} hasSolution hasVideoSolution}}}\",\"variables\":{\"categorySlug\":\"\",\"skip\":0,\"limit\":1000,\"filters\":{\"status\":\"AC\"}}}",  
    "method": "POST"
  }).then((response) => response.json())
    .then(async (results) => {
      var questions = results.data.problemsetQuestionList.questions;
      var questionSubmissionTimes = await writeSolvedQuestionsToStorage(questions);
      let discussionTabDataName = "discussion_tab";
      let questionViewedDataName = "question_viewed";
      chrome.storage.sync.get([discussionTabDataName, questionViewedDataName], (questionTimeData) => {
        updateProficiencies(questions, questionSubmissionTimes, questionTimeData[discussionTabDataName], questionTimeData[questionViewedDataName]);
      });
  });
}

updateSolvedProblems();
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(`onsite ${request}`);
    console.log(`onsite told to update solved problems ***********************************`);
    if (request.msg === "solved_problem") {
      updateSolvedProblems();
    }
  });


console.log("get all medium problems");

fetch("https://leetcode.com/graphql/", {
  "headers": {
    "content-type": "application/json",
  },
  "body": "{\"query\":\"query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {problemsetQuestionList: questionList(categorySlug: $categorySlug limit: $limit skip: $skip filters: $filters) {total: totalNum questions: data {acRate difficulty frontendQuestionId: questionFrontendId isFavor paidOnly: isPaidOnly status title titleSlug topicTags {name id slug} hasSolution hasVideoSolution}}}\",\"variables\":{\"categorySlug\":\"\",\"skip\":0,\"limit\":3000,\"filters\":{\"difficulty\":\"MEDIUM\"}}}",  
  "method": "POST"
}).then((response) => response.json())
  .then((results) => {
      var questions = results.data.problemsetQuestionList.questions;

      chrome.storage.local.set({medium_problems: questions}, () => {
        console.log("Local medium problems set to:");
        console.log(questions);
      });

      chrome.runtime.sendMessage({
        msg: "data_updated", 
        data: {
            subject: "medium_problems"
        }
      });
});


console.log("Get global data (aka user status)");

fetch("https://leetcode.com/graphql/", {
  "headers": {
    "content-type": "application/json",
  },
  "body": JSON.stringify({
    operationName: "globalData",
    query: "query globalData {userStatus {isSignedIn username realName avatar}}",
    variables: {}
  }),
  "method": "POST",
}).then((response) => response.json())
  .then((results) => {
      var userStatus = results.data.userStatus;

      chrome.storage.sync.set({user_status: userStatus}, () => {
        console.log("GValue set to:");
        console.log(userStatus);
      });

      chrome.runtime.sendMessage({
        msg: "data_updated", 
        data: {
            subject: "user_status"
        }
      });

      console.log("got user status");
});

