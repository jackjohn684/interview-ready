/*
  content-script.js (see README.md)
*/

/**
 * Listen for query requests which need to be made on the content page from the background worker.
 */
function contentScriptMessageHandler(msg, sender, sendResponse) {
  delog("contentScriptMessageHandler");
  delog(msg);
  delog(sender);
  if(msg.action === DATA_ACTION_QUERY) {
    queryAndSendData(msg);
    sendResponse({success: true});
  } else {
    sendResponse({success: false, error: `Unknown action ${msg.action}`});
  }
};

delog(`Registering ${contentScriptMessageHandler.name}`);
chrome.runtime.onMessage.addListener(contentScriptMessageHandler);
delog(`Registered ${contentScriptMessageHandler.name}`);

/**
 * Query for data and send it back based on msg key.
 */
async function queryAndSendData (msg) {
  delog("queryAndSendData");
  delog(msg);
  let queryBody = msg.query;
  let key = msg.key;
  const response = await fetch(
    "https://leetcode.com/graphql/",
    {
      "headers": {
        "content-type": "application/json",
      },
      "body": queryBody,
      "method": "POST"
    });
  delog("querying");
  const results = await response.json();
  delog("responded");
  delog(results);
  SendMessage(key, results);
};

/**
 * Register page with worker - Signal that this instance of the leetcode site has been loaded.  
 */ 
SendMessage(DATA_KEY_PAGE_LOADED);
