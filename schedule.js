console.log('Loading Schedule class');

var AWS = require("./aws");
var Message = require("./message");

const log = true ;

module.exports = class Schedule {

    constructor(){
        if(log) console.log("SCHEDULE CONSTRUCTOR");
		// this.team_id ;
		// this.team_domain ;
		// this.channel_id ;
		this.days ;
		this.hour ;
		this.gmt_hour ;
		this.timezone ;
        return this ;
    }
    
    
// ==========================================
//         ADD SCHEDULE FUNCTIONS
// ==========================================
    
    
    async addNewSchedule(event){
        if(log) console.log("ADD NEW SCHEDULE ");
        let message_data = await this.addNewScheduleMessage(event);
        if(log) console.log("ADD NEW SCHEDULE - Message : ", message_data);
        var message = new Message(message_data);
        let res = await message.slackApiPost();
        if(log) console.log("ADD NEW SCHEDULE - Response : ", res);
        return res;
    }
    
    
    async addNewScheduleMessage(event, data){
        if(log) console.log("ADD NEW SCHEDULE MESSAGE ");
        let tz_options = await this.getTimeZoneOptions();
        let day_options = await this.getDayOptions();
        let hour_options = await this.getHourOptions();
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
    					"options": day_options
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
    					"options": hour_options 
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
        
        var ddbc = new AWS.DDBCLIENT();
        let schedules = await ddbc.readFromDynamo({
            tablename: ddbc.jokesScheduleDB,
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
            view: JSON.stringify(_view),
            api_method: "views.open",
            b_token: event.b_token
        };
        if(log) console.log("ADD NEW SCHEDULE MESSAGE - Message : ", message);
        return(message);
    }
    
    
    async getTimeZoneOptions(){
        if(log) console.log("GET TIMEZONE OPTIONS ");
        // https://gist.github.com/jaredreich/9f4aa2a1d460100aa40ddbc279d85660#file-timezones-json
        var timezones = require("./timezones.json");
        var items = [];
        for (var i = 0; i < timezones.length; i++) {
            var item = {};
            item.text = { "type": "plain_text", "text": timezones[i].text } ;
            item.value = timezones[i].value.toString();
            items.push(item);
        }
        if(log) console.log("GET TIME ZONE OPTIONS : ", items);
        return items;
    }
    
    
    async getDayOptions(){
        if(log) console.log("GET DAY OPTIONS ");
        var days = new Array( "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" );
        var items = [];
        for (var i = 0; i < days.length; i++) {
            var item = {};
            item.text = { "type": "plain_text", "text": days[i] } ;
            item.value = i.toString();
            items.push(item);
        }
        if(log) console.log("GET DAY OPTIONS : ", items);
        return items;
    }
    
    
    async getHourOptions(){
        if(log) console.log("GET HOUR OPTIONS ");
        var items = [];
        for (var i = 0; i < 24; i++) {
            var item = {};
            var hour = (i > 12) ? (i - 12 + ":00pm") : (((i==0) ? 12 : i ) + ":00am");
            item.text = { "type": "plain_text", "text": hour } ;
            item.value = i.toString();
            items.push(item);
        }
        if(log) console.log("GET HOUR OPTIONS : ", items);
        return items;
    }
    
    
    async addNewScheduleSubmit(event){
    	if(log) console.log("ADD NEW SCHEDULE SUBMIT - New Schedule Submitted ");
    	
    	var _channel_id = event.view.blocks[1].fields[1].text;
        _channel_id = _channel_id.substr( _channel_id.lastIndexOf("+") + 1 , _channel_id.length );
        if(log) console.log("ADD NEW SCHEDULE SUBMIT - New Joke Schedule Submitted - Channel ID : ", _channel_id);
        
        var days = event.view.state.values.newjokeschedule_days.newjokeschedule_days_selected.selected_options ; // array
        var days_set = [];
        days.forEach(async function(day) {
            days_set.push(parseInt(day.value, 10));
        });
        if(log) console.log("ADD NEW SCHEDULE SUBMIT - New Joke Schedule Submitted - Days : ", days_set.toString());
        var hour = event.view.state.values.newjokeschedule_time.newjokeschedule_time_selected.selected_option.value ; // str to num
        var tz = event.view.state.values.newjokeschedule_timezone.newjokeschedule_timezone_selected.selected_option.value ; // str to num
        var _gmt_hour = parseInt(hour, 10) - ( parseInt(tz, 10) ) ;
        if (_gmt_hour > 24) _gmt_hour = _gmt_hour - 24 ;
        
        var ddbc = new AWS.DDBCLIENT();
        await ddbc.writeToDynamo({
            tablename: ddbc.jokesScheduleDB,
            item: {
                team_id : event.team_id ,
                channel_id : _channel_id ,
                days : await ddbc.createDynamoSet(days_set) ,
                hour : parseInt(hour, 10) ,
                timezone : tz ,
                gmt_hour : _gmt_hour ,
                put_date : new Date().toISOString() 
            }
        });
        await this.addNewScheduleThankYou(event);
        return null;
    }
    
    
    async addNewScheduleThankYou(event){
        if(log) console.log("ADD NEW SCHEDULE THANK YOU - Event ");
        var prvmeta = JSON.parse(event.view.private_metadata);
        let message_data = {
            token: event.b_token,
            replace_original: true,
            channel: prvmeta.channel_id,
            response_type: 'ephemeral' ,
            text: "The joke schedule for this channel has been successfully created." ,
            b_token: event.b_token ,
            api_method: "chat.postMessage" ,
            response_url: event.response_url
        };
        if(log) console.log("ADD NEW SCHEDULE THANK YOU - Result : ", message_data);
        var message = new Message(message_data);
        await message.slackApiPost();
        return null;
    }
    

// ==========================================
//         DELETE SCHEDULE FUNCTIONS
// ==========================================


    async getSchedule(event){
        if(log) console.log("GET SCHEDULE");
        var ddbc = new AWS.DDBCLIENT();
        let schedule = await ddbc.readFromDynamo({
            tablename: ddbc.jokesScheduleDB, 
            key_cond_expr: "team_id = :teamid AND channel_id = :channelid" ,
            attrib_vals: { ":teamid": event.team_id , ":channelid": event.channel_id }
        });
        if(log) console.log("GET SCHEDULE - Schedule : ", schedule);
        if(schedule.Items && schedule.Items.length > 0) {
        	// this.team_id = event.team_id;
        	// this.team_domain = event.team_domain;
        	// this.channel_id = event.channel_id;
        	this.days = schedule.Items[0].days.values.toString() ;
        	this.hour = schedule.Items[0].hour ;
        	this.timezone = schedule.Items[0].timezone ;
        	return true;
        }
        return false ;
    }


    async deleteSchedule(event){
        if(log) console.log("DELETE SCHEDULE ");
        let message_data;
        let postData;
        var hasSchedule = await this.getSchedule(event);
        if(hasSchedule) {
            message_data = await this.deleteScheduleMessage(event);
            if(log) console.log("DELETE SCHEDULE - Message : ", message_data);
        } else {
            message_data = await this.noScheduleMessage(event);
            if(log) console.log("DELETE SCHEDULE - Message : ", message_data);
        }
        if(log) console.log("DELETE SCHEDULE - Post Data : ", postData);
        var message = new Message(message_data);
        await message.slackApiPost();
        return null;
    }


    async deleteScheduleMessage(event){
        if(log) console.log("DELETE SCHEDULE MESSAGE ");
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
    					{ "type": "mrkdwn", "text": "*Days:* \n " + this.days },
    					{ "type": "mrkdwn", "text": "*Hour:* \n " + this.hour },
    					{ "type": "mrkdwn", "text": "*Timezone:* \n " + this.timezone }
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
            view: _view,
            api_method: "views.open",
            b_token: event.b_token
        };
        if(log) console.log("DELETE SCHEDULE - Message : ", message);
        return(message);
    }


    async noScheduleMessage(event){
        if(log) console.log("NO SCHEDULE MESSAGE ");
        let message = {
            token: event.b_token,
            replace_original: true,
            channel: event.channel_id,
            response_type: 'ephemeral' ,
            text: "There is no schedule for this channel to be deleted.",
            b_token: event.b_token ,
            api_method: "chat.postMessage" ,
            response_url: event.response_url
        };
        if(log) console.log("NO SCHEDULE MESSAGE - Result : ", message);
        return (message);
    }


    async deleteScheduleSubmit(event){
    	if(log) console.log("DELETE SCHEDULE SUBMIT ");
    	var _channel_id = event.view.blocks[1].fields[1].text;
        _channel_id = _channel_id.substr( _channel_id.lastIndexOf("+") + 1 , _channel_id.length );
        if(log) console.log("DELETE SCHEDULE SUBMIT - Submitted - Channel ID : ", _channel_id);
        var del = event.view.state.values.deleteschedule_confirm.deleteschedule_selected.selected_options ; // str to num
        if(del[0].value && del[0].value == "schedule_delete"){
            var ddbc = new AWS.DDBCLIENT();
        	await ddbc.deleteFromDynamo({
    	        tablename: ddbc.jokesScheduleDB,
    	        key: { team_id : event.team_id , channel_id: _channel_id },
    	    }); 
        }
        await this.deleteScheduleThankYou(event);
        return null;
    }


    async deleteScheduleThankYou(event){
        if(log) console.log("DELETE SCHEDULE THANK YOU - Event  ");
        var prvmeta = JSON.parse(event.view.private_metadata);
        let message_data = {
            token: event.b_token,
            replace_original: true,
            channel: prvmeta.channel_id,
            response_type: 'ephemeral' ,
            text: "The joke schedule for this channel has been successfully deleted.",
            b_token: event.b_token ,
            api_method: "chat.postMessage" ,
            response_url: event.response_url
        };
        if(log) console.log("DELETE SCHEDULE THANK YOU - Result : ", message_data);
        
        var message = new Message(message_data);
        await message.slackApiPost();
        
        return null;
    }


// ==========================================
//         RUN SCHEDULE FUNCTIONS
// ==========================================


    async runSchedule(event){
        if(log) console.log("RUN SCHEDULE ");
        var ddbc = new AWS.DDBCLIENT();
        let schedules = await ddbc.readFromDynamo({
            tablename: ddbc.jokesScheduleDB,
            indexname: "gmt_hour-index",
            key_cond_expr: "gmt_hour = :hour",
            filter_expr: "contains(days, :day)",
            attrib_vals: { ":hour": this.gmt_hour , ":day": this.day }
        });
        if(log) console.log("RUN SCHEDULE - Schedules : ", schedules);
        if(schedules.Items.length == 0 ) {
            return null ;
        }
        if(log) console.log("RUN SCHEDULE - Schedule Count : ", schedules.Items.length);
        for (var myschedule of schedules.Items){
            if(log) console.log("RUN SCHEDULE - My Schedule : ", myschedule); 
            // ==#####== GET CUSTOM TOKEN PER WORKSPACE ==#####==
            myschedule.b_token = await event.getAccessToken({ team_id: myschedule.team_id });
            var lambdaPayload = {
                "httpMethod": "POST",
                "headers": {
    		        "Content-Type": "application/json",
    	        }, 
    	        "stageVariables":{
    	            "ENV": event.env
    	        },
                "body": {
                    "token": myschedule.b_token,
                    "team_id": myschedule.team_id,
                    "channel_id": myschedule.channel_id,
                    "command": "/nerdjokes",
                    "text": "getjoke",
                }
            };
            if(log) console.log("RUN SCHEDULE - Recursive Lambda - Payload : ", lambdaPayload); 
            let lambdaParams = {
                FunctionName: 'nerdjokes:' + event.env,
                InvocationType: 'Event',
                Payload: JSON.stringify(lambdaPayload)
            };
            if(log) console.log("RUN SCHEDULE - Recursive Lambda - Params : ", lambdaParams);
            var lambda = new AWS.LAMBDA(); 
            lambda.callLambda(lambdaParams);
        }
    }

};