console.log('Loading Event class');

var AWS = require("./aws");
var Joke = require("./joke");
var Schedule = require("./schedule");
var Message = require("./message");

const log = true ;

module.exports = class Event {

    constructor(data){
        if(log) console.log("EVENT CONSTRUCTOR");
        if(log) console.log('NERDJOKES - Received DATA:', JSON.stringify(data));
        var temp;
        this.b_token;
        this.v_token = (data.stageVariables) ? data.stageVariables.VERIFICATION_TOKEN : undefined ;
        this.client_id = (data.stageVariables) ? data.stageVariables.CLIENT_ID : undefined ;
        this.client_secret = (data.stageVariables) ? data.stageVariables.CLIENT_SECRET : undefined ;
        this.env = (data.stageVariables) ? data.stageVariables.ENV : "PROD" ;
        
        this.email = "nerdjokes@pixelated.tech" ;
        this.email_link = `<mailto:${this.email}|${this.email}>` ;
        this.nerdjokes_url = "https://pixelated.tech/nerdjokes.html" ;

        if (data.httpMethod == "POST"){
            if(log) console.log("NERDJOKES - RECEIVED POST");
            if(data.headers['Content-Type'] == "application/json"){
            if(log) console.log("NERDJOKES - RECEIVED POST - JSON");
                temp = (typeof data.body == "string") ? JSON.parse(data.body) : data.body ;
                for(var i in temp) this[i] = temp[i];
            } else if(data.headers['Content-Type'] == 'application/x-www-form-urlencoded' ){
                if(log) console.log("NERDJOKES - RECEIVED POST - URLENCODED");
                temp = this.querystringToJSON(data.body);
                if(temp.payload) {
                    temp = JSON.parse(temp.payload);
                    if(log) console.log("NERDJOKES - RECEIVED PAYLOAD : ", JSON.stringify(temp));
                }
                for(var k in temp) this[k] = temp[k];
            }
        } else if (data.httpMethod == "GET"){
            if(log) console.log("NERDJOKES - RECEIVED GET");
            if(data.queryStringParameters){
                // ==#####== OAUTH ==#####==
                temp = data.queryStringParameters;
                for(var m in temp) this[m] = temp[m];
                if (log) console.log("NERDJOKES - Event Code : ", this.code);
            }
        }
        
        this.setTeamId();
        
        if(log) console.log('NERDJOKES - Event:', JSON.stringify(this));
        return this ;
    }
    

// ==========================================
//            SHARED FUNCTIONS
// ==========================================


    querystringToJSON(qs) {  
        var pairs = qs.split('&');
        var result = {};
        pairs.forEach(function(pair) {
            pair = pair.split('=');
            result[pair[0]] = decodeURIComponent(pair[1] || '');
        });
        return JSON.parse(JSON.stringify(result));
    }
    
    
    async processSlashCommand(){
        if(log) console.log("PROCESS SLASH COMMAND - Event : ", this);
        if(log) console.log("PROCESS SLASH COMMAND - Text : ", this.text);
        var cmd = this.command ;
        var joke, schedule ;
        let result ;
        let returntext ;
        switch (this.text) {
            case "help": 
                if(log) console.log("PROCESS SLASH COMMAND - Help");
                returntext = "* Type '"+cmd+"' to get a random joke to immediately share with your teammates. \n" +
                "* Type '"+cmd+" bug' to get more information about submitting a bug. \n" +
                "* Type '"+cmd+" support' to get more information on how to reach out for support. \n" +
                "* Type '"+cmd+" getjoke' to get a random joke sent immediately. \n" +
                "* Type '"+cmd+" addjoke' to recommend a new joke to be added to the collection. \n" +
                "* Type '"+cmd+" addschedule' to add or edit a schedule for delivering jokes to the current channel. \n" +
                "* Type '"+cmd+" deleteschedule' to delete a schedule for delivering jokes to the current channel. \n" +
                "* Type '"+cmd+" version' to see what version of NerdJokes you are using. \n" ;
                await this.slashCommandMessage(returntext);
                result = null ;
                break;
            case "bug": 
                if(log) console.log("PROCESS SLASH COMMAND - Bug");
                returntext = "If you want to report a bug, email " + this.email_link + " or join the bug channel on the pixelated-tech.slack.com workspace." ;
                await this.slashCommandMessage(returntext);
                result = null ;
                break;
            case "support": 
                if(log) console.log("PROCESS SLASH COMMAND - Support");
                returntext = "If you need some support, email " + this.email_link + " or join the support channel on the pixelated-tech.slack.com workspace.";
                await this.slashCommandMessage(returntext);
                result = null ;
                break;
            case "joke":
            case "random":
            case "getjoke":
                // ==#####== SEND RANDOM JOKE ==#####==
                joke = new Joke();
                await joke.load();
                await joke.sendJoke(this);
                result = null;
                break;
            case "getjokejson":
                // ==#####== SEND RANDOM JOKE ==#####==
                joke = new Joke();
                await joke.load();
                result = joke.raw ;
                break; 
            case "addjoke": 
                if(log) console.log("PROCESS SLASH COMMAND - Add");
                joke = new Joke();
                await joke.load();
                await joke.addNewJoke(this);
                result = null;
                break;
            case "addschedule": 
                if(log) console.log("PROCESS SLASH COMMAND - Add Schedule");
                schedule = new Schedule();
                await schedule.addNewSchedule(this);
                result = null;
                break;
            case "deleteschedule": 
                if(log) console.log("PROCESS SLASH COMMAND - Delete Schedule");
                schedule = new Schedule();
                await schedule.deleteSchedule(this);
                result = null;
                break;
            case "runschedule": 
            	// ==#####== USED BY THE SCHEDULED JOB TO SEND ALL JOKES TO ALL CHANNELS NAD ALL WORKSPACES ==#####==
                if(log) console.log("PROCESS SLASH COMMAND - Run Schedule");
                var gmt_hour = new Date().getUTCHours();
                var day = new Date().getDay();
                if(log) console.log("PROCESS SLASH COMMAND - Run Schedule - d:", day, " , hr:", gmt_hour );
                schedule = new Schedule();
                schedule.day = day ; 
                schedule.gmt_hour = gmt_hour ;
                await schedule.runSchedule(this);
                result = null;
                break;
            case "version":
                if(log) console.log("PROCESS SLASH COMMAND - Version");
                var version = process.env.AWS_LAMBDA_FUNCTION_VERSION ;
                returntext = "This is version " + version + " of NerdJokes.  Enjoy!" ;
                await this.slashCommandMessage(returntext);
                result = null ;
                break;
            default: 
                if(log) console.log("PROCESS SLASH COMMAND - Default");
                result = "NerdJokes: Unknown Image or Command";
        }
        return result;
    }
    
    
    async slashCommandMessage(text) {
        if(log) console.log("SLASH COMMAND MESSAGE");
        let message_data = {
            token: this.b_token,
            replace_original: true,
            channel: this.channel_id,
            response_type: 'ephemeral' ,
            text: text,
            b_token: this.b_token ,
            api_method: "chat.postMessage" ,
            response_url: this.response_url
        };
        if(log) console.log("SLASH COMMAND MESSAGE - Result : ", message_data);
        var message = new Message(message_data);
        await message.slackApiPost() ;
        return null;
    }
    
    
    directInstallRedirect(data){
        if(data.body == null && data.queryStringParameters == null) {
            // ==#####== DIRECT INSTALL FROM APP DIRECTORY ==#####
            if(log) console.log("NERDJOKES - DIRECT INSTALL FROM APP DIRECTORY ");
            var url = "https://slack.com/oauth/v2/authorize" ;
            var qs = "client_id=" + this.client_id  + "&scope=chat:write,commands,im:write" ; 
            var msg = {
                statusCode: 302,
                headers: { "Location": url + "?" + qs },
                body: null
            };
            if(log) console.log("NERDJOKES - DIRECT INSTALL FROM APP DIRECTORY - Message", msg);
            return msg;
        }
    }
    
    
    setTeamId(){
        if(log) console.log("SET TEAM ID ");
        if(this.team_id) { }
        else if(this.team) {  this.team_id = this.team.id ; }
        // else (this.team_id = "N/A");
        if(this.team_id) this.team_id = (this.env != "PROD") ? this.team_id + "-" + this.env : this.team_id ;
        if(log) console.log("SET TEAM ID : ", this.team_id);
    }
    
    
    async getAccessToken(){
        if(log) console.log("GET ACCESS TOKEN");
        var b_token ;
        if(this.team_id) {
            var ddbc = new AWS.DDBCLIENT();
            var getAuth = await ddbc.readFromDynamo({
                tablename: ddbc.jokesTokenDB,
                key_cond_expr: "team_id = :teamid",
                attrib_vals: { ":teamid": this.team_id },
                proj_expr: "access_token"
            });
            if(log) console.log("GET ACCESS TOKEN - Auth Results : ", getAuth);
            b_token = await getAuth.Items[0].access_token;
            if(log) console.log("GET ACCESS TOKEN - Access Token : ", b_token);
            return b_token;
        }
    }
    
    
    verifyURL(e_challenge, e_token, v_token) {
        if(log) console.log("VERIFY URL - Event Challenge ");
        var result;
        // ==#####== CHALLENGE ==#####==
        if (this.token === this.v_token) {
            result = { challenge: this.challenge };
        } else {
            result = "VERIFY URL - Verification Failed";   
        }
        if(log) console.log("VERIFY URL - Results : ", result);
        return {
            statusCode: 200,
            isBase64Encoded: false,
            headers: {"content-type": "application/x-www-form-urlencoded"},
            body: JSON.stringify(result)
        };
    }
    
    
    async oAuthVerify() {
        if(log) console.log("OAUTH VERIFY - OAuth - App Install ");
        const message_data = {
            client_id: this.client_id,
            client_secret: this.client_secret,
            code: this.code ,
            api_method: "oauth.v2.access"
        };
        if(log) console.log("OAUTH VERIFY - OAuth Message Data : ", message_data );
        var message = new Message(message_data);
        var oauthaccess = await message.slackApiGet();
        if(log) console.log("OAUTH VERIFY - OAuth - Verify : ", oauthaccess);
        this.team_id = oauthaccess.team.id;
        this.setTeamId();
        if(log) console.log("OAUTH VERIFY - Set Team ID : ", this.team_id);
        var ddbc = new AWS.DDBCLIENT();
        const storeAuth = await ddbc.writeToDynamo({
            tablename: ddbc.jokesTokenDB,
            item: {
                team_id : this.team_id ,
                access_token : oauthaccess.access_token ,
                response : JSON.stringify(oauthaccess) ,
                put_date : new Date().toISOString() 
            }
        });
        if(log) console.log("OAUTH VERIFY - OAuth - Key Store : ", storeAuth);
        var ses = new AWS.SES();
        const email_res = await ses.sendEmail({
            from: this.email,
            to: this.email,
            subject: "New NerdJokes App Install!"
        });
        if(log) console.log("OAUTH VERIFY - OAuth - Email Sent : ", email_res);
        // ==#####== LOG EVENT ==#####==
        await this.logEvent();
        return {
            statusCode: 302,
            headers: {
                "Location": this.nerdjokes_url 
            },
            body: null
        };
    }
    
    
    async cleanUninstall(){
        if(log) console.log("CLEAN UNINSTALL ");
        
        // ==#####== GET ALL SCHEDULES ==#####==
        var ddbc = new AWS.DDBCLIENT();
    	const scheds = await ddbc.readFromDynamo({
            tablename: ddbc.jokesScheduleDB,
            indexname: "team_id-index",
            key_cond_expr: "team_id = :teamid",
            attrib_vals: { ":teamid": this.team_id },
            proj_expr: "channel_id" 
        });
        if(log) console.log("CLEAN UNINSTALL - App Uninstalled - Scheds", scheds);
        
        // ==#####== DELETE SCHEDULES ==#####==
        var itemsArray = [];
        scheds.Items.forEach( async (sched) => {
        // scheds.Items.forEach(async function(sched) {
    		var newitem = {
        		DeleteRequest : {
            		Key : { team_id: this.team_id, channel_id: sched.channel_id }
        		}
    		};
    		itemsArray.push(newitem);
    	});
        if(log) console.log("CLEAN UNINSTALL - App Uninstalled - Items", itemsArray);
    	var params = {
        	RequestItems : { [ddbc.jokesScheduleDB] : itemsArray }
    	};
        if(log) console.log("CLEAN UNINSTALL - App Uninstalled - Params", params);
        await ddbc.batchDeleteFromDynamo({
        	params: params
        });
        
        // ==#####== DELETE TOKEN ==#####==
        await ddbc.deleteFromDynamo( {
            tablename: ddbc.jokesTokenDB,
            key: { "team_id" : this.team_id }
        });
        if(log) console.log("CLEAN UNINSTALL - Complete");
    }
    
    
    async logEvent(){
        if(log) console.log("LOG EVENT ");
        if(this.team_id) {
            // ==#####== EVENT TYPE ==#####==
            var eventType = null;
            if(this.command && this.text) { eventType = this.command + " " + this.text ; }
            else if (this.event) { eventType = this.event.type ; }
            else if (this.view) { eventType = this.view.callback_id ; }
            else if (this.actions){ eventType = this.actions[0].action_id ; }
            else if (this.code) { eventType = "app_installed" ; }
            if(log) console.log("LOG EVENT  - eventType : ", eventType);
            // ==#####== USER ID ==#####==
            var userId = null;
            if (this.user_id) { userId = this.user_id; }
            else if (this.user) { userId = this.user.id ; }
            else if(this.authed_user) { userId = this.authed_user.id ; }
            else { userId = "." ; }
            if(log) console.log("LOG EVENT  - userId : ", userId);
            // ==#####== CHANNEL ID ==#####==
            var channelId = null ;
            if (this.channel_id){ channelId = this.channel_id; } 
            else if (this.channel){ channelId = this.channel.id ; } 
            else if (this.view && this.view.private_metadata) { channelId = JSON.parse(this.view.private_metadata).channel_id ; }
            else { channelId = "." ; }
            if(log) console.log("LOG EVENT  - channelId : ", channelId);
            // ==#####== LOG TO DYNAMO ==#####==
            var ddbc = new AWS.DDBCLIENT();
            var logged = await ddbc.writeToDynamo({
                tablename: ddbc.jokesLogDB,
                item: {
                    team_id : this.team_id ,
                    log_id: Date.now().valueOf().toString() ,
                    event_type : eventType ,
                    user_id : userId ,
                    channel_id : channelId 
                }
            });
            if(log) console.log("LOG EVENT  - Logged : ", logged);
        } else {
            if(log) console.log("LOG EVENT  - No team_id ");
        }
        return null;
    }
    
 
};