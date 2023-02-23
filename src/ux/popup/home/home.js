console.log(`Loaded home.js: ${new Date()}`);

//////////// Cold start "sign in to leetcode" experience /////////////
function signIntoLeetCode() {
    console.log('signIntoLeetCode')
    chrome.tabs.update({
        url: "https://leetcode.com/accounts/login/"
    });

    window.close();
}

document.getElementById("signInToLeetCode").onclick = signIntoLeetCode;

function showColdStart() {
    showHideById("coldStart", false)
}

function hideColdStart() {
    showHideById("coldStart", true);
}

function showProgress() {
    showHideById("loading", false);
}

function hideProgress() {
    showHideById("loading", true);
}

function showHideById(id, shouldHide) {
    document.getElementById(id).hidden = shouldHide;
}
///////////////////////////////////////////////////////////////////////




///////////////// Render ///////////////
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    delog("Recieved message!");
    delog(msg);
    delog(sender);
    if(msg && msg.key == DATA_KEY_RERENDER) { 
        render();
        sendResponse({success:true});
    }
  });

render();

async function render() {

    let isSignedIn = (await SendMessage(DATA_KEY_GET_USER_IS_SIGNED_IN)).result;
    delog(`isSignedIn==${isSignedIn}`);

    if (!isSignedIn) {
        showColdStart();
        return;
    } else {
        hideColdStart();
    }

    let topicData = (await SendMessage(DATA_KEY_GET_TOPIC_READINESS)).result;
    var readiness = document.getElementById("currentReadiness");
    readiness.innerHTML = '';


    if(!topicData) {
        showProgress();
        return;
    }

    hideProgress();
    
    var sortedTopicProficiency = Object.entries(topicData).sort((a, b) => {
        return b[1][1] - a[1][1];
    });

    var readinessHtmlFunc = (styleClass, text, topic) => {
        return `<div class="topicStatus"><font class='${styleClass}'>${topic} - ${text}</font><button class="practice" data-topic='${topic}'></button></div>`;
    };

    var addReadiness = (styleClass, text, topic) => readiness.innerHTML += readinessHtmlFunc(styleClass, text, topic);


    sortedTopicProficiency.forEach(element => {
        var topic = element[0];
        var readinessPercent = element[1][1];
        var designation = element[1][0];
        var readinessScoreFormattedAsPercent = '%' + readinessPercent.toFixed();
        addReadiness(designation, designation == "ready" ? "Ready": readinessScoreFormattedAsPercent, topic);
    });

    var items = document.getElementsByClassName("practice");
    for (var i = 0; i < items.length; i++) {
        let button = items[i];
        button.addEventListener("click", function () {
            onTopicClick(button.getAttribute("data-topic"));
        });
    }
};
/////////////////////////////////////////////////////////////////////////



///////  Practice Selection Logic ////////////////////////////////////////
function onTopicClick(topic) {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        var tab = tabs[0];
        let response = (await SendMessage(DATA_KEY_GET_TOPIC_NEXT_TARGET_QUESTION, {topic: topic}));
        if(response.success) {
            chrome.tabs.update(tab.id, { url: response.result });
            window.close();
        }
    });
}
/////////////////////////////////////////////////////////////////////////////////