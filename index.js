console.log('Loading Nerd Jokes');

var Event = require("./event");
var Joke = require("./joke");
var Schedule = require("./schedule");

let log = true;



exports.handler = async function(data, context) {
    // ==#####== NERDJOKES APP SETUP ==#####==
    if(log) console.log("NERDJOKES Start - Data: " , data);
    let result ;
    var event = new Event(data);
    if(data.body == null && data.queryStringParameters == null) {
        return event.directInstallRedirect(data);
    }
    
    
    if (event.code) {
        // ==#####== OAUTH REQUEST - APP INSTALL ==#####==
        // ==#####== THIS IS A WEB BASED REQUEST ==#####==
        if(log) console.log("NERDJOKES - Event Code : " , event.code);
        result = event.oAuthVerify();
        return result;
    } else if(event.command && event.text && event.text == "getjokejson"){
        // ==#####== SKIP OVER ACCESS TOKEN ==#####==
        // ==#####== THIS IS FOR NERDJOKES ALEXA SKILL ==#####==
    } else if(event.team_id){
        if(log) console.log("NERDJOKES - Getting Access Token");
        event.b_token = await event.getAccessToken();
        if(log) console.log("NERDJOKES - Got Access Token : " , event.b_token);
    }


    if (event.hasOwnProperty("type") || event.hasOwnProperty("event")) {
        let event_type;
        if(event.hasOwnProperty("event")) { event_type = event.event.type; } 
        else if (event.hasOwnProperty("type")) { event_type = event.type; }
        if(log) console.log("NERDJOKES - Event Type: " , event_type);
        switch (event_type) {
            case "url_verification": 
                // ==#####== VERIFY EVENT CALLBACK URL ==#####==
                if(log) console.log("NERDJOKES - URL Verification"); 
                result = event.verifyURL(); 
                break;
            case "app_uninstalled": 
                // ==#####== APP UNINSTALLED _ DELETE ALL DATA FOR THAT WORKSPACE ==#####==
                if(log) console.log("NERDJOKES - App Uninstalled");
                await event.cleanUninstall();
                // ==#####== LOG EVENT ==#####==
                await event.logEvent();
                break;
            case "view_submission":
                // ==#####== DIALOG BOX SUBMITTED ==#####==
                if(log) console.log("NERDJOKES - View Submission");
                var schedule ;
                if(event.view.callback_id == 'newjoke-submit'){
	                if(log) console.log("NERDJOKES - New Joke Submitted");
                    var joke = new Joke();
                    await joke.addNewJokeSubmit(event);
                } else if(event.view.callback_id == "newjokeschedule-submit"){
                    if(log) console.log("NERDJOKES - New Joke Schedule Submitted");
                    schedule = new Schedule();
                    await schedule.addNewScheduleSubmit(event);
                } else if(event.view.callback_id == "deleteschedule-submit"){
                    if(log) console.log("NERDJOKES - Delete Schedule Submitted");
                    schedule = new Schedule();
                    await schedule.deleteScheduleSubmit(event);
                }
                // ==#####== LOG EVENT ==#####==
                await event.logEvent();
                // ==#####== NULL SUBMIT CLOSES VIEW ==#####==
                result = null;
                break;
            case "view_closed":
                // ==#####== DIALOG BOX CLOSED ==#####==
                if(log) console.log("NERDJOKES - View Closed");
                break;
            case "interactive_message":
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
        if((event.command == "/nerdjokes") || (event.command == "/nerdjokesdev")){
            if(event.text) {
                // ==#####== SLASH COMMAND WITH TEXT ==#####==
                result = await event.processSlashCommand();
            } else if (event.text.length == 0) {
                // ==#####== SEND RANDOM JOKE ==#####==
                event.text = "getjoke";
                result = await event.processSlashCommand();
            }
            // ==#####== LOG EVENT ==#####==
            await event.logEvent();
        } 
    }
    
    
    if(log) console.log('NERDJOKES END - Response Results:', result);
    let finalMsg = {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {
            "Content-type": "application/json; charset=utf-8",
            "Authorization": "Bearer " + event.b_token
        }
    };
    if(log) console.log("NERDJOKES END - typeof result : ", typeof result);
    if(result == null){
    } else if(typeof result === "object") {
        try{
            finalMsg.body = JSON.stringify( result );
        } catch(error) {
            finalMsg.body = result ;
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