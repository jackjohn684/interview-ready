import {sampleProblemListResponse} from "./models.js"

if (true || !chrome.runtime) {
    console.log("Running in mock mode outside of chrome extension runtime")
    // We need to MOCK!

    // Mock Data
    const mockData = {
        userDataKey: {
            isSignedIn: 1
        },
        problemsKey: sampleProblemListResponse
    }

    function duplicateTaggedProblems(sampleResponse, slugName, times) {
        let questions = sampleResponse.data.problemsetQuestionList.questions;
        let taggedQuestions = questions.filter(q => 
            q.topicTags.some(tag => tag.slug === slugName)
        );
    
        let duplicatedQuestions = Array(times).fill(taggedQuestions).flat();
    
        sampleResponse.data.problemsetQuestionList.questions = [...questions, ...duplicatedQuestions];
    }

    duplicateTaggedProblems(sampleProblemListResponse, "hash-table", 14);
    duplicateTaggedProblems(sampleProblemListResponse, "array", 14);
    duplicateTaggedProblems(sampleProblemListResponse, "linked-list", 10);
    duplicateTaggedProblems(sampleProblemListResponse, "queue", 9);
    duplicateTaggedProblems(sampleProblemListResponse, "dynamic-programming", 8);
    
    
    // DEBUG MODE
    chrome.runtime = {
        getManifest: ()=>["update_url"]
    }

    chrome.storage = {
        // Storage listener
        onChanged: {
            addListener: () => null
        },

        // Get
        local: {
            get: () => mockData,
        },

    }
}
else {
}