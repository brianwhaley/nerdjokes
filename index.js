console.log('Loading nerdjokes');

var nerdhelpers = require("./nerdjokes-helpers");
var awstools = require("./tools-aws");
var slacktools = require("./tools-slack");
let env;
let log = true;




exports.handler = async function(data, context) {
    // ==#####== NERDJOKES APP SETUP ==#####==
    if(log) console.log('NERDJOKES - Received DATA:', JSON.stringify(data));
    const stageVars = data.stageVariables;
    if(log) console.log('NERDJOKES - Received Stage Variables:', JSON.stringify(stageVars));
    let b_token;
    let v_token = (stageVars) ? stageVars.VERIFICATION_TOKEN : undefined ;
    let c_id = (stageVars) ? stageVars.CLIENT_ID : undefined ;
    let c_secret = (stageVars) ? stageVars.CLIENT_SECRET : undefined ;
    env = (stageVars) ? stageVars.ENV : "PROD" ;
    if(log) console.log('NERDJOKES - Received Context:', JSON.stringify(context));
    let event ;
    let result ;
    let team_id ;
    
    if (data.httpMethod == "POST"){
        if(log) console.log("NERDJOKES - RECEIVED POST");
        if(data.headers['Content-Type'] == "application/json"){
        if(log) console.log("NERDJOKES - RECEIVED POST - JSON");
            event = (typeof data.body == "string") ? JSON.parse(data.body) : data.body ;
        } else if(data.headers['Content-Type'] == 'application/x-www-form-urlencoded' ){
            if(log) console.log("NERDJOKES - RECEIVED POST - URLENCODED");
            event = slacktools.querystringToJSON(data.body);
            if(event.payload) {
                if(log) console.log("NERDJOKES - RECEIVED PAYLOAD : ", JSON.stringify(event));
                event = JSON.parse(event.payload);
            }
        }
    } else if (data.httpMethod == "GET"){
        if(log) console.log("NERDJOKES - RECEIVED GET");
        if(data.queryStringParameters){
            // ==#####== OAUTH ==#####==
            event = data.queryStringParameters;
            if (log) console.log("NERDJOKES - Event Code : ", event.code);
        } else if(data.body == null && data.queryStringParameters == null) {
            // ==#####== DIRECT INSTALL FROM APP DIRECTORY ==#####
            if(log) console.log("NERDJOKES - DIRECT INSTALL FROM APP DIRECTORY ");
            var url = "https://slack.com/oauth/v2/authorize" ;
            var qs = "client_id=" + c_id  + "&scope=chat:write,commands,im:write" ; 
            var msg = {
                statusCode: 302,
                headers: { "Location": url + "?" + qs },
                body: null
            };
            if(log) console.log("NERDJOKES - DIRECT INSTALL FROM APP DIRECTORY - Message", msg);
            return msg;
        }
    }
    if(log) console.log('NERDJOKES - Received Event:', JSON.stringify(event));
    
    
    
    if (event.code) {
        // ==#####== OAUTH REQUEST - APP INSTALL ==#####==
        // ==#####== THIS IS A WEB BASED REQUEST ==#####==
        result = await slacktools.oAuthVerify(event, {
            client_id: c_id,
            client_secret: c_secret,
            env: env
        });
        return result;
    } else if (event.hasOwnProperty("team_id") || event.hasOwnProperty("team")) {
        // ==#####== CALCULATE TEAM ID ==#####==
        team_id = slacktools.getTeamId(event, env) ;
        if(log) console.log("NERDJOKES - Team ID : ", team_id);
        // ==#####== GET AUTH TOKEN ==#####==
        b_token = await nerdhelpers.getAccessToken({ team_id: team_id });
    }
    
    
    
    if (event.hasOwnProperty("type") || event.hasOwnProperty("event")) {
        let event_type;
        if(event.hasOwnProperty("event")) { event_type = event.event.type; } else if (event.hasOwnProperty("type")) { event_type = event.type; }
        if(log) console.log("NERDJOKES - Event Type: " , event_type);
        switch (event_type) {
            case "url_verification": 
                // ==#####== VERIFY EVENT CALLBACK URL ==#####==
                if(log) console.log("NERDJOKES - URL Verification"); 
                result = slacktools.urlVerify(event.challenge, event.token, v_token); 
                break;
            case "app_uninstalled": 
                // ==#####== APP UNINSTALLED _ DELETE ALL DATA FOR THAT WORKSPACE ==#####==
                if(log) console.log("NERDJOKES- App Uninstalled");
                team_id = slacktools.getTeamId(event, env);
                let cleaned = await nerdhelpers.cleanUninstall({
                    team_id: team_id
                });
                // ==#####== LOG EVENT ==#####==
                var logged = await slacktools.logEvent(event, { team_id: team_id });
                break;
            case "view_submission":
                // ==#####== DIALOG BOX SUBMITTED ==#####==
                if(log) console.log("NERDJOKES - View Submission");
                if(event.view.callback_id == 'newjoke-submit'){
	                if(log) console.log("NERDJOKES - New Joke Submitted");
                    var res = await nerdhelpers.addNewJokeSubmit(event);
                    var res = await nerdhelpers.addNewJokeThankYou(event, { b_token: b_token });
                } else if(event.view.callback_id == "newjokeschedule-submit"){
                    if(log) console.log("NERDJOKES - New Joke Schedule Submitted");
                    var res = await nerdhelpers.addNewScheduleSubmit(event);
                    var res = await nerdhelpers.addNewScheduleThankYou(event, { b_token: b_token });
                } else if(event.view.callback_id == "deleteschedule-submit"){
                    if(log) console.log("NERDJOKES - Delete Schedule Submitted");
                    var res = await nerdhelpers.deleteScheduleSubmit(event);
                    var res = await nerdhelpers.deleteScheduleThankYou(event, { b_token: b_token });
                }
                // ==#####== LOG EVENT ==#####==
                var logged = await slacktools.logEvent(event, { team_id: team_id });
                // ==#####== NULL SUBMIT CLOSES VIEW ==#####==
                result = null;
                break;
            case "view_closed":
                // ==#####== DIALOG BOX CLOSED ==#####==
                if(log) console.log("NERDJOKES - View Closed");
                break;
            case "interactive_message":
                team_id = slacktools.getTeamId(event, env);
                if(log) console.log("NERDJOKES - Interactive Message");
                // ==#####== INTERACTIVE MESSAGES ==#####==
                // INTERACTIVE MESSAGES REPLACED WITH BLOCK MESSAGES
                break;
            default: 
                // result = "NERDJOKES - Event Type Error";
        }
    }
    
    
    
    // ==#####== SLASH COMMANDS ==#####== 
    if(event.command) {
        if(log) console.log("NERDJOKES - Slash Command");
        team_id = slacktools.getTeamId(event, env);
        if((event.command == "/nerdjokes") || (event.command == "/stkrdev")){
            if(event.text) {
                // ==#####== SLASH COMMAND WITH TEXT ==#####==
                const slashData = {
                    b_token: b_token,
                    team_id: team_id,
                    env: env
                };
                result = await nerdhelpers.processSlashCommand(event, slashData);
            } else if (event.text.length == 0) {
                // ==#####== SEND RANDOM JOKE ==#####==
                let sent = await nerdhelpers.sendJoke(event,{b_token: b_token});
            }
            // ==#####== LOG EVENT ==#####==
            var logged = await slacktools.logEvent(event, { team_id: team_id });
        } 
    }
    
    
    
    if(log) console.log('NERDJOKES END - Response Results:', result);
    let finalMsg = {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {
            "Content-type": "application/json; charset=utf-8",
            "Authorization": "Bearer " + b_token
        }
    };
    if(result == null){
    } else if(typeof result === "object") {
        if(result.hasOwnProperty("challenge")){
            finalMsg.body = JSON.stringify( result );
        }
    } else if( (result) && (result.length > 0) ){
        finalMsg.body = JSON.stringify({
            response_type: 'in_channel',
            delete_original: true, 
            replace_original: true, 
            text: result
        });
    }
    if(log) console.log('NERDJOKES END - Final Message :', finalMsg);
    return finalMsg;
};