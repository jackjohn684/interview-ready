const isDebug = !('update_url' in chrome.runtime.getManifest());

export function delog(message) {
    if(isDebug) {
        console.log(message);
    }
}

export function traceMethod(func) {
    function updatedFunc(...args) {
        delog("######################");
        delog("");
        delog("Calling Function>>>>>>");
        delog(func.name);
        for(const arg of args) {
            delog(arg);
        }
        var result = func.apply(this, args);
        delog("Function Returns<<<<");
        delog(result);
        delog("");
        delog("#####################");
        return result;
    }

    return updatedFunc;
}