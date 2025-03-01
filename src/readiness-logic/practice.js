import { getNextPracticeProblem, getReadinessData, recommendedList } from "./classic.js";
import { targetTopics } from "./target-topics.js";
import { delog, traceMethod } from "../shared/logging.js"
import { randomElementInArray } from "./random.js";

export async function getPracticeProblem(practiceType) {
    const allProblems = (await chrome.storage.local.get(["problemsKey"])).problemsKey;

    if(practiceType == "suggested") {
        const acceptedSet = new Set();
        allProblems.data.problemsetQuestionList.questions.forEach((question) => {
            if(question.status == "ac") {
                acceptedSet.add(question.titleSlug);
            }
        });

        for(const slug of recommendedList) {
            if (!acceptedSet.has(slug)) {
                return slug;
            }
        }

        delog("They've done all the recommended problems! Wow!");

        let readinessData = await getReadinessData(allProblems);

        for(const topic of targetTopics) {
            if (readinessData[topic][0] != "ready") {
                return await getNextPracticeProblem(topic, "suggested");
            }
        }
    } else if (practiceType == "review") {
        const acceptedList = [];
        allProblems.data.problemsetQuestionList.questions.forEach((question) => {
            if(question.status == "ac") {
                acceptedList.push(question.titleSlug);
            }
        });

        if(acceptedList.length == 0) {
            return null;
        }

        return randomElementInArray(acceptedList);
    } else if (practiceType == "random") {
        const randomTopic = randomElementInArray(targetTopics);
        return getNextPracticeProblem(randomTopic, "suggested");
    }

}