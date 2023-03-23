const isDebug = !('update_url' in chrome.runtime.getManifest());

function delog(message) {
    if(isDebug) {
        console.log(message);
    }
}

async function SendMessage(key, dataBody) {
    delog('SendMessage');
    delog(key);
    delog(dataBody);
    let resolver;
    let promise = new Promise((promiseResolver) => {resolver = promiseResolver;})
    chrome.runtime.sendMessage(
      {
        key: key,
        data: dataBody
      }, 
      function (response) {
        delog(`Message responded (key: ${key})`);
        delog(response);
        resolver(response); // TODO: Does this hang if there is a failure?
      }
    );


    return promise;
}
