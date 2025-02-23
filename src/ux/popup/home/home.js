import {delog, traceMethod} from "../../../shared/logging.js"
import {getNextPracticeProblem, getReadinessData} from "../../../readiness-logic/classic.js"

delog(`Loaded home.js: ${new Date()}`);

//////////// Cold start "sign in to leetcode" experience /////////////
const signIntoLeetCode = traceMethod(function signIntoLeetCode() {
    chrome.tabs.update({
        url: "https://leetcode.com/accounts/login/"
    });

    window.close();
});

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

function showLegend() {
    showHideById("legend", false);
}

function hideLegend() {
    showHideById("legend", true);
}

function showHideById(id, shouldHide) {
    document.getElementById(id).hidden = shouldHide;
}
///////////////////////////////////////////////////////////////////////




///////////////// Render ///////////////
//setInterval(render, 1000);
render();

const targetTopics = ['hash-table','string','linked-list','queue','dynamic-programming','array','sorting','heap-priority-queue',
    'depth-first-search','breadth-first-search', 'binary-search'];

async function render() {

    delog("################");
    delog("render!!!");
    let userData = (await chrome.storage.local.get(["userDataKey"])).userDataKey;
    delog(userData);
    let isSignedIn = userData.isSignedIn;
    delog(`isSignedIn==${isSignedIn}`);

    if (!isSignedIn) {
        showColdStart();
        setTimeout(render, 1000);
        return;
    } else {
        hideColdStart();
    }

    let allProblemsData = (await chrome.storage.local.get(["problemsKey"])).problemsKey;
    let topicData = getReadinessData(allProblemsData, targetTopics);
    var readiness = document.getElementById("currentReadiness");
    readiness.innerHTML = '<button id=\'legend-button\'>?</button><button id=\'refresh-button\'>↺</button>';


    if(!allProblemsData) {
        showProgress();
        setTimeout(render, 1000);
        return;
    }

    hideProgress();
    
    var sortedTopicProficiency = Object.entries(topicData).sort((a, b) => {
        return b[1][1] - a[1][1];
    });

    var readinessHtmlFunc = (styleClass, text, topic) => {
        return `<div class="topicStatus">
        <button class="practice practice-suggested" difficulty='suggested' data-topic='${topic}'>🡕</button>
        <button class="practice practice-easy" difficulty='easy' data-topic='${topic}'>🡕</button>
        <button class="practice practice-medium" difficulty='medium' data-topic='${topic}'>🡕</button>
        <button class="practice practice-hard" difficulty='hard' data-topic='${topic}'>🡕</button>
        <button class="practice practice-random" difficulty='random' data-topic='${topic}'>🡕</button>
        <font class='${styleClass}'>${topic} - ${text}</font>
        </div>
        `;
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
            onTopicClick(button.getAttribute("data-topic"), button.getAttribute("difficulty"));
        });
    }

    document.getElementById('refresh-button').addEventListener("click", () => {
        chrome.storage.local.set({"refresh_problems": Date.now()});
        showProgress();
        document.getElementById("currentReadiness").innerHTML = '';
        let hostUrl = "leetcode.com";
        chrome.tabs.query({ url: `*://${hostUrl}/*` }, (tabs) => {
            if (tabs.length > 0) {
              delog(`Found tabs on ${hostUrl}:`);
              delog(tabs);
            } else {
              delog(`No tabs found on ${hostUrl}`);
              chrome.tabs.create({url: "https://leetcode.com", active: false});
            }
          });
    });

    document.getElementById('legend-button').addEventListener("click", () => {
        showLegend();
        setTimeout(hideLegend, 3000);
    });
    
};

/////////////////////////////////////////////////////////////////////////



///////  Practice Selection Logic ////////////////////////////////////////
function onTopicClick(topic, target) {
    delog(topic);
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        var tab = tabs[0];
        var nextProblemSlug = await getNextPracticeProblem(topic, target);
        var nextProblemUrl = `https://leetcode.com/problems/${nextProblemSlug}`
        chrome.tabs.update(tab.id, { url: nextProblemUrl });
        window.close();
    });
}
/////////////////////////////////////////////////////////////////////////////////


//////// Listen for updates ///////////////////
function changeListener(changes, namespace) {
    for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
      if(key == "problemsKey" && oldValue?.timeStamp != newValue?.timeStamp) {
        delog(oldValue);
        delog(newValue);
        render();
      }
    }
  }
  
  chrome.storage.onChanged.addListener(changeListener);
