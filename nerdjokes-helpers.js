console.log('Loading nerdjokes-helpers');

var awstools = require("./tools-aws");
var slacktools = require("./tools-slack");

const email = "nerdjokes@pixelated.tech" ;
const email_link = `<mailto:${email}|${email}>` ;
let log = true ;




exports.processSlashCommand = processSlashCommand;
async function processSlashCommand(event, data){
    if(log) console.log("PROCESS SLASH COMMAND - Event : ", event);
    if(log) console.log("PROCESS SLASH COMMAND - Data : ", data);
    if(log) console.log("PROCESS SLASH COMMAND - Text : ", event.text);
    var cmd = event.command ;
    let result ;
    switch (event.text) {
        case "help": 
            if(log) console.log("PROCESS SLASH COMMAND - Help");
            result = "* Type '"+cmd+"' to get a random joke to immediately share with your teammates. \n" +
            "* Type '"+cmd+" bug' to get more information about submitting a bug. \n" +
            "* Type '"+cmd+" support' to get more information on how to reach out for support. \n" +
            "* Type '"+cmd+" getjoke' to get a random joke sent immediately. \n" +
            "* Type '"+cmd+" addschedule' to add or edit a schedule for delivering jokes to the current channel. \n" +
            "* Type '"+cmd+" deleteschedule' to delete a schedule for delivering jokes to the current channel. \n" +
            "* Type '"+cmd+" addjoke' to recommend a new joke to be added to the collection. \n" ;
            break;
        case "bug": 
            if(log) console.log("PROCESS SLASH COMMAND - Bug");
            result = "If you want to report a bug, email " + email_link + " or join the bug channel on the pixelated-tech.slack.com workspace." ;
            break;
        case "support": 
            if(log) console.log("PROCESS SLASH COMMAND - Support");
            result = "If you need some support, email " + email_link + " or join the support channel on the pixelated-tech.slack.com workspace.";
            break;
        case "joke":
        case "random":
        case "getjoke":
            // ==#####== SEND RANDOM JOKE ==#####==
            let sent = await sendJoke(event,{b_token: data.b_token});
            result = null;
            break;
        case "addschedule": 
            if(log) console.log("PROCESS SLASH COMMAND - Add Schedule");
            var res = await addNewSchedule(event, data);
            result = null;
            break;
        case "deleteschedule": 
            if(log) console.log("PROCESS SLASH COMMAND - Delete Schedule");
            var res = await deleteSchedule(event, data);
            result = null;
            break;
        case "run": 
        	// ==#####== USED BY THE SCHEDULED JOB TO SEND ALL JOKES TO ALL CHANNELS NAD ALL WORKSPACES ==#####==
            if(log) console.log("PROCESS SLASH COMMAND - Run Schedule");
            var hours = new Date().getUTCHours();
            var day = new Date().getDay();
            if(log) console.log("PROCESS SLASH COMMAND - Run Schedule - d:", day, " , hr:", hours );
            var schedRun = await runSchedule({
                b_token: data.b_token,
                gmt_hour: hours,
                day: day
            });
            break;
        case "addjoke": 
            if(log) console.log("PROCESS SLASH COMMAND - Add");
            var res = await addNewJoke(event, data);
            result = null;
            break;
        default: 
            if(log) console.log("PROCESS SLASH COMMAND - Default");
            result = "NerdJokes: Unknown Image or Command";
    }
    return result;
}






// ==========================================
//         ACCESS TOKEN FUNCTIONS
// ==========================================






exports.getAccessToken = getAccessToken;
async function getAccessToken(data){
    if(log) console.log("GET ACCESS TOKEN - data : ", data);
    if(log) console.log("GET ACCESS TOKEN - Team ID : ", data.team_id);
    let getAuth = await awstools.readFromDynamo({
        tablename: awstools.jokesTokenDB,
        key_cond_expr: "team_id = :teamid",
        attrib_vals: { ":teamid": data.team_id },
        proj_expr: "access_token"
    });
    if(log) console.log("GET ACCESS TOKEN - Auth Results : ", getAuth);
    if(log) console.log("GET ACCESS TOKEN - Access Token : ", await getAuth.Items[0].access_token);
    let b_token = await getAuth.Items[0].access_token;
    return b_token;
}






// ==========================================
//         CLEAN UNINSTALL FUNCTIONS
// ==========================================







exports.cleanUninstall = cleanUninstall;
async function cleanUninstall(data){
    if(log) console.log("CLEAN UNINSTALL - Data : ", data);
    
    // ==#####== GET ALL SCHEDULES ==#####==
	const scheds = await awstools.readFromDynamo({
        tablename: awstools.jokesScheduleDB,
        indexname: "team_id-index",
        key_cond_expr: "team_id = :teamid",
        attrib_vals: { ":teamid": data.team_id },
        proj_expr: "channel_id" 
    });
    if(log) console.log("CLEAN UNINSTALL - App Uninstalled - Scheds", scheds);
    
    // ==#####== DELETE SCHEDULES ==#####==
    var itemsArray = [];
    scheds.Items.forEach(async function(sched) {
		var newitem = {
    		DeleteRequest : {
        		Key : { team_id: data.team_id, channel_id: sched.channel_id }
    		}
		};
		itemsArray.push(newitem);
	});
    if(log) console.log("CLEAN UNINSTALL - App Uninstalled - Items", itemsArray);
	var params = {
    	RequestItems : { [awstools.jokesScheduleDB] : itemsArray }
	};
    if(log) console.log("CLEAN UNINSTALL - App Uninstalled - Params", params);
    const decheduled = await awstools.batchDeleteFromDynamo({
    	params: params
    });
    
    // ==#####== DELETE TOKEN ==#####==
    const detokened = await awstools.deleteFromDynamo( {
        tablename: awstools.jokesTokenDB,
        key: { "team_id" : data.team_id }
    });
    if(log) console.log("CLEAN UNINSTALL - Complete");
}




// ==========================================
//           JOKE FUNCTIONS
// ==========================================




exports.sendJoke = sendJoke;
async function sendJoke(event, data){
    if(log) console.log("SEND JOKE - Event : ", event );
    if(log) console.log("SEND JOKE - Data : ", data );
    const joke = await getJoke();
    const sendquestion = await sendJokeQuestion(event, {b_token: data.b_token, joke: joke});
    const sendanswer = await sendJokeAnswer(event, {b_token: data.b_token, joke: joke, thread_ts: sendquestion.message.ts });
    return null;
}



exports.getJoke = getJoke;
async function getJoke(){
    if(log) console.log("GET JOKE ");
    const firstJoke = '1587787878120';
    const lastJoke = Date.now().valueOf().toString();
    let rnd = slacktools.getRandomInt(firstJoke, lastJoke);
    if(log) console.log("GET JOKE - Rnd : ", rnd);
    let joke = await awstools.scanFromDynamo({
        tablename: awstools.jokesDB,
        start_key: { "id": rnd.toString() } , 
        limit: 1
    });
    if(log) console.log("GETJOKE - Joke : ", joke);
    var result = { text: "Question: " + joke.Items[0].question + " \n " + "Answer: " + joke.Items[0].answer } ;
    if(log) console.log("GETJOKE - Result : ", result);
    return joke;
}




exports.sendJokeQuestion = sendJokeQuestion;
async function sendJokeQuestion(event, data){
    if(log) console.log("SEND JOKE QUESTION - Event : ", event);
    if(log) console.log("SEND JOKE QUESTION - Data : ", data);
    let message = {
        token: data.b_token,
        replace_original: true,
        channel: event.channel_id,
        response_type: 'in_channel' ,
        text: data.joke.Items[0].question ,
        b_token: data.b_token ,
        api_method: "chat.postMessage" ,
    };
    if(log) console.log("SEND JOKE QUESTION - Result : ", message);
    let result = await slacktools.processApiMsg(message);
    return result;
}



exports.sendJokeAnswer = sendJokeAnswer;
async function sendJokeAnswer(event, data){
    if(log) console.log("SEND JOKE ANSWER - Event : ", event);
    if(log) console.log("SEND JOKE ANSWER - Data : ", data);
    let message = {
        token: data.b_token,
        replace_original: true,
        channel: event.channel_id,
        response_type: 'in_channel' ,
        text: data.joke.Items[0].answer ,
        b_token: data.b_token ,
        api_method: "chat.postMessage" ,
        thread_ts: data.thread_ts 
    };
    if(log) console.log("SEND JOKE ANSWER - Result : ", message);
    let result = await slacktools.processApiMsg(message);
    return null;
}




exports.addNewJoke = addNewJoke;
async function addNewJoke(event, data){
    if(log) console.log("ADD NEW JOKE - Data : ", data);
    let msg = await addNewJokeMessage(event, data);
    if(log) console.log("ADD NEW JOKE - Message : ", msg);
    let postData = {
        api_method: "views.open",
        b_token: data.b_token
    };
    if(log) console.log("ADD NEW JOKE - Post Data : ", postData);
    let res = await slacktools.slackApiPost(msg, postData);
    if(log) console.log("ADD NEW JOKE - Response : ", res);
    return res;
}





exports.addNewJokeMessage = addNewJokeMessage;
async function addNewJokeMessage(event, data){
    if(log) console.log("ADD NEW JOKE MESSAGE - Data : ", data);
    let _view = JSON.stringify({
    	"type": "modal",
    	"callback_id": "newjoke-submit",
        "private_metadata": JSON.stringify({channel_id: event.channel_id}),
        "clear_on_close": true,
        "notify_on_close": false,
    	"title": {
    		"type": "plain_text",
    		"text": "NerdJokes Add New Joke"
    	},
    	"submit": {
    		"type": "plain_text",
    		"text": "Submit"
    	},
    	"close": {
    		"type": "plain_text",
    		"text": "Cancel"
    	},
    	"blocks": [
    		{
    			"type": "section",
    			"block_id": "newjoke_view_title",
    			"text": {
    				"type": "mrkdwn",
    				"text": "Please enter the details of your new joke."
    			}
    		},
    		{
    			"type": "input",
    			"block_id": "newjoke_question_block",
    			"element": {
    				"type": "plain_text_input",
    				"multiline": true,
                    "action_id": "newjoke_question"
    			},
    			"label": {
    				"type": "plain_text",
    				"text": "Question:"
    			}
    		},
    		{
    			"type": "input",
    			"block_id": "newjoke_answer_block",
    			"element": {
    				"type": "plain_text_input",
    				"multiline": true,
                    "action_id": "newjoke_answer"
    			},
    			"label": {
    				"type": "plain_text",
    				"text": "Answer:"
    			}
    		}
    	]
    });
    if(log) console.log("ADD NEW JOKE MESSAGE - View : ", _view);
    let message = {
        trigger_id: event.trigger_id,
        view: _view
    };
    if(log) console.log("ADD NEW JOKE MESSAGE - Message : ", message);
    return(message);
}




exports.addNewJokeSubmit = addNewJokeSubmit;
async function addNewJokeSubmit(event){
	if(log) console.log("ADD NEW JOKE SUBMIT - Event : ", event);
    var prvmeta = JSON.parse(event.view.private_metadata);
    var q = event.view.state.values.newjoke_question_block.newjoke_question.value.replace(/\+/g, ' ') ;
    var a = event.view.state.values.newjoke_answer_block.newjoke_answer.value.replace(/\+/g, ' ') ;
    if(event.team.id == "T011Q2H2HQ8" && event.user.id == "U011Q2H2KG8"){
        let res = await awstools.writeToDynamo({
            tablename: awstools.jokesDB,
            item: {
                id : Date.now().valueOf().toString() ,
                question : q ,
                answer : a ,
                put_date : new Date().toISOString() 
            }
        });
    	if(log) console.log("ADD NEW JOKE SUBMIT - Submitted ");
    } else {
        const email_res = await awstools.sendEmail({
            subject: "New NerdJokes Submitted",
            body: q + "\n\n" + a
        });
    }
}





exports.addNewJokeThankYou = addnewJokeThankYou;
async function addnewJokeThankYou(event, data){
    if(log) console.log("ADD NEW JOKE THANK YOU - Event : ", event);
    if(log) console.log("ADD NEW JOKE THANK YOU - Data : ", data);
    var prvmeta = JSON.parse(event.view.private_metadata);
    let message = {
        token: data.b_token,
        replace_original: true,
        channel: prvmeta.channel_id,
        response_type: 'ephemeral' ,
        text: "Thank you for submitting a new NerdJoke!",
        b_token: data.b_token ,
        api_method: "chat.postMessage" ,
        response_url: event.response_url
    };
    if(log) console.log("ADD NEW JOKE THANK YOU - Result : ", message);
    let result = await slacktools.processApiMsg(message);
    return null;
}






// ==========================================
//          ADD SCHEDULE FUNCTIONS
// ==========================================





exports.addNewSchedule = addNewSchedule;
async function addNewSchedule(event, data){
    if(log) console.log("ADD NEW SCHEDULE - Event : ", event);
    if(log) console.log("ADD NEW SCHEDULE - Data : ", data);
    let msg = await addNewScheduleMessage(event, data);
    if(log) console.log("ADD NEW SCHEDULE - Message : ", msg);
    let postData = {
        api_method: "views.open",
        b_token: data.b_token
    };
    if(log) console.log("ADD NEW SCHEDULE - Post Data : ", postData);
    let res = await slacktools.slackApiPost(msg, postData);
    if(log) console.log("ADD NEW SCHEDULE - Response : ", res);
    return res;
}







exports.addNewScheduleMessage = addNewScheduleMessage;
async function addNewScheduleMessage(event, data){
    if(log) console.log("ADD NEW SCHEDULE MESSAGE - Data : ", data);
    let tz_options = await slacktools.getTimeZoneOptions();
    let _view = {
		"type": "modal",
    	"callback_id": "newjokeschedule-submit",
        "private_metadata": JSON.stringify({channel_id: event.channel_id}),
        "clear_on_close": true,
        "notify_on_close": false,
		"title":  { "type": "plain_text", "text": "NerdJokes Add Schedule" },
		"submit": { "type": "plain_text", "text": "Submit" },
		"close":  { "type": "plain_text", "text": "Cancel" },
		"blocks": [
			{
				"type": "section",
				"block_id": "newjokeschedule_title",
				"text": {
					"type": "mrkdwn",
					"text": "Please Add, Edit, or Delete your schedule:"
				}
			},{
				"type": "section",
				"block_id": "newjokeschedule_fields",
				"fields": [
					{ "type": "mrkdwn", "text": "*Team ID:* \n " + event.team_id + " \n " + event.team_domain },
					{ "type": "mrkdwn", "text": "*Channel ID:* \n " + event.channel_id }
				]
			},{
				"type": "input",
                "block_id": "newjokeschedule_days",
				"label": {
					"type": "plain_text",
					"text": "Scheduled Days: (select one or more)"
				},
				"element": {
					"type": "multi_static_select",
                    "action_id": "newjokeschedule_days_selected",
					"placeholder": {
						"type": "plain_text",
						"text": "Select schedule days..."
					},  
					// "initial_options": [], 
					"options": [
						{
							"text": { "type": "plain_text", "text": "Sunday" },
							"value": "0"
						},
						{
							"text": { "type": "plain_text", "text": "Monday" },
							"value": "1"
						},
						{
							"text": { "type": "plain_text", "text": "Tuesday" },
							"value": "2"
						},
						{
							"text": { "type": "plain_text", "text": "Wednesday" },
							"value": "3"
						},
						{
							"text": { "type": "plain_text", "text": "Thursday" },
							"value": "4"
						},
						{
							"text": { "type": "plain_text", "text": "Friday" },
							"value": "5"
						},
						{
							"text": { "type": "plain_text", "text": "Saturday" },
							"value": "6"
						}
					]
				}
			},{
				"type": "input",
                "block_id": "newjokeschedule_time",
				"label": {
					"type": "plain_text",
					"text": "Scheduled Time: (select one)"
				},
				"element": {
					"type": "static_select",
                    "action_id": "newjokeschedule_time_selected",
					"placeholder": {
						"type": "plain_text",
						"text": "Select schedule time..."
					},
					// "initial_option": { },
					"options": [
						{
							"text": { "type": "plain_text", "text": "12:00am" },
							"value": "00"
						},
						{
							"text": { "type": "plain_text", "text": "1:00am" },
							"value": "01"
						},
						{
							"text": { "type": "plain_text", "text": "2:00am" },
							"value": "02"
						},
						{
							"text": { "type": "plain_text", "text": "3:00am" },
							"value": "03"
						},
						{
							"text": { "type": "plain_text", "text": "4:00am" },
							"value": "04"
						},
						{
							"text": { "type": "plain_text", "text": "5:00am" },
							"value": "05"
						},
						{
							"text": { "type": "plain_text", "text": "6:00am" },
							"value": "06"
						},
						{
							"text": { "type": "plain_text", "text": "7:00am" },
							"value": "07"
						},
						{
							"text": { "type": "plain_text", "text": "8:00am" },
							"value": "08"
						},
						{
							"text": { "type": "plain_text", "text": "9:00am" },
							"value": "09"
						},
						{
							"text": { "type": "plain_text", "text": "10:00am" },
							"value": "10"
						},
						{
							"text": { "type": "plain_text", "text": "11:00am" },
							"value": "11"
						},
						{
							"text": { "type": "plain_text", "text": "12:00pm" },
							"value": "12"
						},
						{
							"text": { "type": "plain_text", "text": "1:00pm" },
							"value": "13"
						},
						{
							"text": { "type": "plain_text", "text": "2:00pm" },
							"value": "14"
						},
						{
							"text": { "type": "plain_text", "text": "3:00pm" },
							"value": "15"
						},
						{
							"text": { "type": "plain_text", "text": "4:00pm" },
							"value": "16"
						},
						{
							"text": { "type": "plain_text", "text": "5:00pm" },
							"value": "17"
						},
						{
							"text": { "type": "plain_text", "text": "6:00pm" },
							"value": "18"
						},
						{
							"text": { "type": "plain_text", "text": "7:00pm" },
							"value": "19"
						},
						{
							"text": { "type": "plain_text", "text": "8:00pm" },
							"value": "20"
						},
						{
							"text": { "type": "plain_text", "text": "9:00pm" },
							"value": "21"
						},
						{
							"text": { "type": "plain_text", "text": "10:00pm" },
							"value": "22"
						},
						{
							"text": { "type": "plain_text", "text": "11:00pm" },
							"value": "23"
						}
					]
				}
			},{
				"type": "input",
                "block_id": "newjokeschedule_timezone",
				"label": {
					"type": "plain_text",
					"text": "Scheduled Time Zone: (select one)"
				},
				"element": {
					"type": "static_select",
                    "action_id": "newjokeschedule_timezone_selected",
					"placeholder": {
						"type": "plain_text",
						"text": "Select schedule time zone..."
					},
					// "initial_option": { }, 
					"options": tz_options
				}
			}
		]
    };
    // ==#####== GET INITIAL SCHEDULE ==#####==
    let schedules = await awstools.readFromDynamo({
        tablename: awstools.jokesScheduleDB,
        key_cond_expr: "team_id = :teamid AND channel_id = :channelid",
        attrib_vals: { ":teamid": event.team_id , ":channelid": event.channel_id }
    }); 
    if(log) console.log("ADD NEW SCHEDULE MESSAGE - Schedules : ", schedules);
    if(schedules.Items.length > 0) {
        var schedule = schedules.Items[0];
        if(log) console.log("ADD NEW SCHEDULE MESSAGE - Schedule : ", schedule);
        // ==#####== SET DAYS ==#####==
        _view.blocks[2].element.initial_options = [];
        schedule.days.values.forEach(async function(day) {
            _view.blocks[2].element.initial_options.push(_view.blocks[2].element.options[day]);
        });
        // ==#####== SET TIME ==#####==
        _view.blocks[3].element.initial_option = _view.blocks[3].element.options[parseInt(schedule.hour, 10)];
        // ==#####== SET TIMEZONE ==#####==
        _view.blocks[4].element.initial_option = _view.blocks[4].element.options.find(tz => tz.value === schedule.timezone);
    }
    if(log) console.log("ADD NEW SCHEDULE MESSAGE - View : ", JSON.stringify(_view));
    let message = {
        trigger_id: event.trigger_id,
        view: JSON.stringify(_view)
    };
    if(log) console.log("ADD NEW SCHEDULE MESSAGE - Message : ", message);
    return(message);
}





exports.addNewScheduleSubmit = addNewScheduleSubmit;
async function addNewScheduleSubmit(event){
	if(log) console.log("ADD NEW SCHEDULE SUBMIT - New Schedule Submitted : ", event);
	
	var _channel_id = event.view.blocks[1].fields[1].text;
    _channel_id = _channel_id.substr( _channel_id.lastIndexOf("+") + 1 , _channel_id.length );
    if(log) console.log("ADD NEW SCHEDULE SUBMIT - New Joke Schedule Submitted - Channel ID : ", _channel_id);
    
    var days = event.view.state.values.newjokeschedule_days.newjokeschedule_days_selected.selected_options ; // array
    var days_set = [];
    days.forEach(async function(day) {
        //days_set.push(day.value.toString());
        days_set.push(parseInt(day.value, 10));
        //days_text = (days_text.length == 0) ? days_text += day.value : days_text += "," + day.value
    });
    if(log) console.log("ADD NEW SCHEDULE SUBMIT - New Joke Schedule Submitted - Days : ", days_set.toString());
    var hour = event.view.state.values.newjokeschedule_time.newjokeschedule_time_selected.selected_option.value ; // str to num
    var tz = event.view.state.values.newjokeschedule_timezone.newjokeschedule_timezone_selected.selected_option.value ; // str to num
    var _gmt_hour = parseInt(hour, 10) - ( parseInt(tz, 10) ) ;
    if (_gmt_hour > 24) _gmt_hour = _gmt_hour - 24 ;
    
    let res = await awstools.writeToDynamo({
        tablename: awstools.jokesScheduleDB,
        item: {
            team_id : event.team.id ,
            channel_id : _channel_id ,
            days : await awstools.createDynamoSet(days_set) ,
            hour : parseInt(hour, 10) ,
            timezone : tz ,
            gmt_hour : _gmt_hour ,
            put_date : new Date().toISOString() 
        }
    });       
}





exports.addNewScheduleThankYou = addNewScheduleThankYou;
async function addNewScheduleThankYou(event, data){
    if(log) console.log("ADD NEW SCHEDULE THANK YOU - Event : ", event);
    if(log) console.log("ADD NEW SCHEDULE THANK YOU - Data : ", data);
    var prvmeta = JSON.parse(event.view.private_metadata);
    let message = {
        token: data.b_token,
        replace_original: true,
        channel: prvmeta.channel_id,
        response_type: 'ephemeral' ,
        text: "The joke schedule for this channel has been successfully created." ,
        b_token: data.b_token ,
        api_method: "chat.postMessage" ,
        response_url: event.response_url
    };
    if(log) console.log("ADD NEW SCHEDULE THANK YOU - Result : ", message);
    let result = await slacktools.processApiMsg(message);
    return null;
}




// ==========================================
//         DELETE SCHEDULE FUNCTIONS
// ==========================================



exports.deleteSchedule = deleteSchedule;
async function deleteSchedule(event, data){
    if(log) console.log("DELETE SCHEDULE - Event : ", event);
    if(log) console.log("DELETE SCHEDULE - Data : ", data);
    let msg;
    let postData;
    let schedule = await awstools.readFromDynamo({
        tablename: awstools.jokesScheduleDB, 
        key_cond_expr: "team_id = :teamid AND channel_id = :channelid" ,
        attrib_vals: { ":teamid": data.team_id , ":channelid": event.channel_id }
    });
    if(schedule.Items.length > 0) {
        data.schedule = schedule;
        msg = await deleteScheduleMessage(event, data);
        if(log) console.log("DELETE SCHEDULE - Message : ", msg);
        postData = {
            api_method: "views.open",
            b_token: data.b_token
        };
    } else {
        msg = await noScheduleMessage(event, data);
        if(log) console.log("DELETE SCHEDULE - Message : ", msg);
        postData = {
            api_method: "chat.postMessage" ,
            b_token: data.b_token,
            response_url: event.response_url
        };
    }
    if(log) console.log("DELETE SCHEDULE - Post Data : ", postData);
    let res = await slacktools.slackApiPost(msg, postData);
    if(log) console.log("DELETE SCHEDULE - Response : ", res);
    return null;
}




exports.deleteScheduleMessage = deleteScheduleMessage;
async function deleteScheduleMessage(event, data){
    if(log) console.log("DELETE SCHEDULE MESSAGE - Data : ", data);
    let _view = JSON.stringify({
		"type": "modal",
    	"callback_id": "deleteschedule-submit",
        "private_metadata": JSON.stringify({channel_id: event.channel_id}),
        "clear_on_close": true,
        "notify_on_close": false,
		"title": {
			"type": "plain_text",
			"text": "NerdJokes DeleteSchedule"
		},
		"submit": {
			"type": "plain_text",
			"text": "Submit"
		},
		"close": {
			"type": "plain_text",
			"text": "Cancel"
		},
		"blocks": [
			{
				"type": "section",
				"block_id": "deleteschedule_title",
				"text": {
					"type": "plain_text",
					"text": "Are you sure you want to delete the schedule for this workspace and channel?"
				}
			},{
				"type": "section",
				"block_id": "deleteschedule_fields",
				"fields": [
					{ "type": "mrkdwn", "text": "*Team ID:* \n " + event.team_id + " \n " + event.team_domain },
					{ "type": "mrkdwn", "text": "*Channel ID:* \n " + event.channel_id },
					{ "type": "mrkdwn", "text": "*Days:* \n " + data.schedule.Items[0].days.values.toString() },
					{ "type": "mrkdwn", "text": "*Hour:* \n " + data.schedule.Items[0].hour },
					{ "type": "mrkdwn", "text": "*Timezone:* \n " + data.schedule.Items[0].timezone }
				]
			},{
					"type": "input",
	                "block_id": "deleteschedule_confirm",
					"label": {
						"type": "plain_text",
						"text": "Confirm Delete"
					},
					"element": {
						"type": "checkboxes",
	                    "action_id": "deleteschedule_selected",
						"options": [
							{
								"text": {
									"type": "plain_text",
									"text": "Yes, please delete this schedule"
								},
								"value": "schedule_delete"
							}
						]
					}
				}
		]
	});
    if(log) console.log("DELETE SCHEDULE - View : ", _view);
    let message = {
        trigger_id: event.trigger_id,
        view: _view
    };
    if(log) console.log("DELETE SCHEDULE - Message : ", message);
    return(message);
}





exports.noScheduleMessage = noScheduleMessage;
async function noScheduleMessage(event, data){
    if(log) console.log("NO SCHEDULE MESSAGE - Event : ", event);
    if(log) console.log("NO SCHEDULE MESSAGE - Data : ", data);
    let message = {
        token: data.b_token,
        replace_original: true,
        channel: event.channel_id,
        response_type: 'ephemeral' ,
        text: "There is no schedule for this channel to be deleted.",
        b_token: data.b_token ,
        api_method: "chat.postMessage" ,
        response_url: event.response_url
    };
    if(log) console.log("NO SCHEDULE MESSAGE - Result : ", message);
    return (message);
}





exports.deleteScheduleSubmit = deleteScheduleSubmit;
async function deleteScheduleSubmit(event){
	if(log) console.log("DELETE SCHEDULE SUBMIT - Submitted : ", event);
	var _channel_id = event.view.blocks[1].fields[1].text;
    _channel_id = _channel_id.substr( _channel_id.lastIndexOf("+") + 1 , _channel_id.length );
    if(log) console.log("DELETE SCHEDULE SUBMIT - Submitted - Channel ID : ", _channel_id);
    var del = event.view.state.values.deleteschedule_confirm.deleteschedule_selected.selected_options ; // str to num
    if(del[0].value && del[0].value == "schedule_delete"){
    	let res = await awstools.deleteFromDynamo({
	        tablename: awstools.jokesScheduleDB,
	        key: { team_id : event.team.id , channel_id: _channel_id },
	    }); 
    }
}





exports.deleteScheduleThankYou = deleteScheduleThankYou;
async function deleteScheduleThankYou(event, data){
    if(log) console.log("DELETE SCHEDULE THANK YOU - Event : ", event);
    if(log) console.log("DELETE SCHEDULE THANK YOU - Data : ", data);
    var prvmeta = JSON.parse(event.view.private_metadata);
    let message = {
        token: data.b_token,
        replace_original: true,
        channel: prvmeta.channel_id,
        response_type: 'ephemeral' ,
        text: "The joke schedule for this channel has been successfully deleted.",
        b_token: data.b_token ,
        api_method: "chat.postMessage" ,
        response_url: event.response_url
    };
    if(log) console.log("DELETE SCHEDULE THANK YOU - Result : ", message);
    let result = await slacktools.processApiMsg(message);
    return null;
}




// ==========================================
//         RUN SCHEDULE FUNCTIONS
// ==========================================






exports.runSchedule = runSchedule;
async function runSchedule(data){
    if(log) console.log("RUN SCHEDULE ");
    if(log) console.log("RUN SCHEDULE - Data : ", data);
    let schedules = await awstools.readFromDynamo({
        tablename: awstools.jokesScheduleDB,
        indexname: "gmt_hour-index",
        key_cond_expr: "gmt_hour = :hour",
        filter_expr: "contains(days, :day)",
        attrib_vals: { ":hour": data.gmt_hour , ":day": data.day }
    });
    if(log) console.log("RUN SCHEDULE - Schedules : ", schedules);
    if(schedules.Items.length == 0 ) {
        return null ;
    }
    if(log) console.log("RUN SCHEDULE - Schedule Count : ", schedules.Items.length);
    for (var schedule of schedules.Items){
    //await channels.Items.forEach(async function(channel) {
        if(log) console.log("RUN SCHEDULE - Channel : ", schedule); 
        // ==#####== GET CUSTOM TOKEN PER WORKSPACE ==#####==
        let b_token = await getAccessToken({ team_id: schedule.team_id });
        // var event = { channel_id: schedule.channel_id };
        // var _data = { b_token: b_token };
        // ==#####== SEND RANDOM JOKE ==#####==
        // let sent = await sendJoke(event, _data);
        var lambdaPayload = {
            "httpMethod": "POST",
            "headers": {
		        "Content-Type": "application/json",
	        }, 
            "body": {
                "token": b_token,
                "team_id": schedule.team_id,
                "channel_id": schedule.channel_id,
                "command": "/nerdjokes",
                "text": "getjoke",
            }
        };
        if(log) console.log("RUN SCHEDULE - Lambda - Payload : ", lambdaPayload); 
        let lambdaParams = {
            FunctionName: 'nerdjokes',
            InvocationType: 'Event',
            Payload: JSON.stringify(lambdaPayload)
        };
        if(log) console.log("RUN SCHEDULE - Lambda - Params : ", lambdaParams); 
        var push = awstools.callLambda(lambdaParams);
    }
}