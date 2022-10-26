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
    showHideColdStart(false);
}

function hideColdStart() {
    showHideColdStart(true);
}

function showHideColdStart(shouldHide) {
    document.getElementById("coldStart").hidden = shouldHide;
}
///////////////////////////////////////////////////////////////////////




///////////////// Render Interview Ready by Topic Table ///////////////
render();

function render () {
    var data = chrome.storage.sync.get(["solved", "user_status"], rednerWithData);
}

function rednerWithData(data) {

    console.log('renderReadiness');
    console.log(data);
    
    if(!data || !data.user_status.isSignedIn) {
        showColdStart();
        return;
    } else {
        hideColdStart();
    }

    var targetTopics = ['hash-table','string','linked-list','queue','dynamic-programming','array','sorting','heap-priority-queue',
        'depth-first-search','breadth-first-search'];

    var readiness = document.getElementById("currentReadiness");
    readiness.innerHTML='';
    var midtermTopicsNotCovered = new Set(targetTopics);
    var readinessHtmlFunc = (styleClass, text, topic) => {
        return `<div class="topicStatus"><font class='${styleClass}'>${topic} - ${text}</font><button class="practice" data-topic='${topic}'></button></div>`;
    };

    var addReadiness = (styleClass, text, topic) => readiness.innerHTML += readinessHtmlFunc(styleClass,text,topic);


    data.solved.forEach(element => {
        var topic = element[0];
        if(targetTopics.includes(topic)) {
            midtermTopicsNotCovered.delete(topic);
            var readinessScore = element[1];
            var normalizedReadinessScore = readinessScore / 5.0;
            var readinessScoreFormattedAsPercent = '%' + (100.0*normalizedReadinessScore).toFixed();

            if(normalizedReadinessScore >= 1.0) {
                addReadiness("ready", "Ready", topic);
            } else if (normalizedReadinessScore > .7) {
                addReadiness("almost", readinessScoreFormattedAsPercent, topic);
            } else {
                addReadiness("notReady", readinessScoreFormattedAsPercent, topic)
            }
        }
    });

    midtermTopicsNotCovered.forEach((topic) => {
        addReadiness("notReady", "Not attempted", topic);
    });

    var items = document.getElementsByClassName("practice");
    for(var i=0; i<items.length; i++) {
        let button = items[i];
        button.addEventListener("click", function () { 
            onTopicClick(button.getAttribute("data-topic")); 
        }); 
    }
};
/////////////////////////////////////////////////////////////////////////



///////  Practice Selection Logic ////////////////////////////////////////
function onTopicClick(topic) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      var tab = tabs[0];
      chrome.storage.local.get("medium_problems", (problems) => {
        var filteredList = [];
        problems.medium_problems.forEach((problem) => {
          if(
            problem.acRate > 40.0 && 
            problem.status !== "ac" &&
            problem.acRate < 55.0 && 
            problem.topicTags.find((topicTag)=> topicTag.slug === topic) &&
            !problem.paidOnly
            ) {
              filteredList.push(problem);
          }
        });
    
        if(filteredList.length == 0) throw new Error("No acceptable problem found!");
        var randomSelection = filteredList[Math.floor(Math.random() * filteredList.length)];
        var url = `https://leetcode.com/problems/${randomSelection.titleSlug}/`;
        chrome.tabs.update(tab.id, {url: url});
        
        window.close();
      });
    });
}
/////////////////////////////////////////////////////////////////////////////////