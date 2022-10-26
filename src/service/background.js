console.log("background.js 01 " + new Date());

var payloadDecoder = new TextDecoder("utf-8");
var getPayload = (request) => {
  return JSON.parse(payloadDecoder.decode(request.requestBody.raw[0].bytes));
};

function writeTimeStampData(dataName, itemId) {
  chrome.storage.sync.get([dataName], (data) => {
    if(!data[dataName]) {
      data[dataName] = {};
    }

    if(!data[dataName][itemId]) {
      data[dataName][itemId] = new Date().toJSON();
    }

    // Given multiple clients there is an inherent race condition here.
    chrome.storage.sync.set(data);
    console.log(dataName);
    console.log(itemId);
    console.log(data);
  });
}

var graphQlCallback = (details) => {
    console.log("callback 001");
    //console.log(details);
    var payload = getPayload(details);
    console.log(payload);

    // Record views on discussion tab
    if(payload.operationName === "questionTopicsList") {
      writeTimeStampData("discussion_tab", payload.variables.questionId);
    }

    // Record views on problem
    else if(payload.operationName == "questionData") {
      writeTimeStampData("question_viewed", payload.variables.titleSlug);
    }

    // Update solved data status if there any updates to submissions
    else if(payload.operationName == "submitModalInfo") {
      chrome.tabs.sendMessage(details.tabId, {msg: "solved_problem"});
    }
};

var filter = {urls: ["https://leetcode.com/graphql"]};
var opt_extraInfoSpec = ["requestBody"];

chrome.webRequest.onBeforeRequest.addListener(graphQlCallback, filter, opt_extraInfoSpec);


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      if (request.msg === "data_updated") {
          console.log("data_updated, todo sync with server");
      }
  });
  
console.log("background.js 02 " + new Date());

