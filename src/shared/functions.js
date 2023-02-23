const isDebug = !('update_url' in chrome.runtime.getManifest());

function delog(message) {
    if(isDebug) {
        console.log(message);
    }
}

async function SendMessage(key, data) {
    let resolver;
    let promise = new Promise((promiseResolver) => {resolver = promiseResolver;})
    delog(`Messaged sent (key: ${key})`);
    delog(data);
    chrome.runtime.sendMessage(
      {
        key: key,
        data: data
      }, 
      function (response) {
        delog(`Message responded (key: ${key})`);
        delog(response);
        resolver(response);
      }
    );


    return promise;
}
