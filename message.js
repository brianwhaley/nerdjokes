console.log('Loading Message class');

const HTTPS = require('https');
const QS = require('querystring');

const log = true ;

module.exports = class Message {

    constructor(props){
        this.message = {};
        if(log) console.log("MESSAGE CONSTRUCTOR");
        if(props){
            if(log) console.log("MESSAGE CONSTRUCTOR props : ", props);
            this.load(props);
        }
        return this ;
    }


    load(props){
        if(log) console.log("MESSAGE LOAD");
        if(log) console.log("MESSAGE LOAD props : ", props);
        (props.token) ? this.token = props.token : null ;
        (props.token) ? this.message.token = props.token : null ;
        (props.client_id) ? this.message.client_id = props.client_id : null ;
        (props.client_secret) ? this.message.client_secret = props.client_secret : null ;
        (props.code) ? this.message.code = props.code : null ;
        
        (props.delete_original) ? this.message.delete_original = props.delete_original : this.message.delete_original = false ;
        (props.replace_original) ? this.message.replace_original = props.replace_original : this.message.replace_original = false ;
        (props.response_type) ? this.message.response_type = props.response_type : this.message.response_type = 'in_channel' ; // 'ephemeral'
        (props.thread_ts) ? this.message.thread_ts = props.thread_ts : null ;
        (props.return_im) ? this.message.return_im = props.return_im : null ;
        (props.trigger_id) ? this.message.trigger_id = props.trigger_id : null ;
        (props.channel) ? this.message.channel = props.channel : null ;
        (props.user) ? this.message.user = props.user : null ;
        (props.users) ? this.message.users = props.users : null ;
        
        (props.text) ? this.message.text = props.text : null ; 
        (props.blocks) ? this.message.blocks = props.blocks : null ;
        (props.view) ? this.message.view = props.view : null ;
        if(log) console.log("MESSAGE CONSTRUCTOR - This Message : ", this.message);
        
        this.option_data = {};
        (props.b_token) ? this.option_data.b_token = props.b_token : null ;
        (props.api_method) ? this.option_data.api_method = props.api_method : null ;
        (props.response_url) ? this.option_data.response_url = props.response_url : null ;
        (props.api_method) ? this.option_data.api_method = props.api_method : null ;
        if((props.response_url) && (props.response_url.length > 0)){
            this.option_data.url = props.response_url;
        } else if(props.api_method) {
            this.option_data.url = "https://slack.com/api/" + props.api_method;
        }
        if(log) console.log("MESSAGE CONSTRUCTOR - This Option Data : ", this.option_data);
        return null;
    }
    
    
    async sendTextMessage(event, text) {
        if(log) console.log("SEND TEXT MESSAGE");
        let message_data = {
            token: event.b_token,
            replace_original: true,
            channel: event.channel_id ,
            response_type: 'ephemeral' ,
            text: text,
            b_token: event.b_token ,
            api_method: "chat.postMessage" ,
            trigger_id: event.trigger_id ,
            response_url: event.response_url
        };
        if(log) console.log("SEND TEXT MESSAGE - Result : ", message_data);
        await this.load(message_data);
        await this.slackApiPost() ;
        return null;
    }
    
    
    async slackApiPost(){
        // ==#####== SLACK API POST ==#####===
        if(log) console.log("SLACK API POST ");
        var options = {
            method: "POST",
            port: 443,
            headers: {
                "Authorization": "Bearer " + this.option_data.b_token,
                "Content-Type": "application/json; charset=utf-8", 
                // "Access-Control-Allow-Origin": "*",
                "Content-Length": JSON.stringify(this.message).length
            }
        };
        if(log) console.log("SLACK API POST - Request Options : ", options);
        let retJSON = '';
        return new Promise( (resolve, reject) => {
            const request = HTTPS.request(this.option_data.url, options, function(res) {
                if(log) console.log('SLACK API POST - Request Response', res);
                if(log) console.log('SLACK API POST - Request Response Status Code:', res.statusCode);
                if(log) console.log('SLACK API POST - Request Response Headers:', res.headers);
                res.setEncoding( 'utf8' );
                res.on("data", function(chunk){ /* console.log("Chunk = ", chunk); */ retJSON += chunk; });
                res.on("end", function () {
                    if (typeof(retJSON) === "string") {
                        try {
                            // ==#####== STRINGIFIED RESPONSE ==#####==
                            if(log) console.log("SLACK API POST - Response Results", retJSON);
                            resolve(JSON.parse(retJSON)) ;
                        } catch(err) {
                            // ==#####== NATIVE JSON RESPONSE ==#####==
                            if(log) console.log("SLACK API POST - Response Results", JSON.stringify(retJSON));
                            resolve(retJSON) ;
                        }
                    } else  { 
                        resolve(retJSON) ;
                    }
                });
            });
            request.on("error", function (error) { 
                console.log("SLACK API POST ERROR : ", JSON.stringify(error));
                console.log("SLACK API POST ERROR Code : ", JSON.stringify(error.code));
                console.log("SLACK API POST ERROR Message : ", JSON.stringify(error.message));
                console.log("SLACK API POST ERROR Stack : ", JSON.stringify(error.stack));
                reject(error);
            });
            request.write(JSON.stringify(this.message));
            request.end();
            if(log) console.log("SLACK API POST - Request Results : ", request);
        });
    }


    async slackApiGet(){
        // ==#####== SLACK API GET ==#####==
        if(log) console.log("SLACK API GET - Message : ", this.message);
        var qstring = QS.stringify(this.message);
        if(log) console.log("SLACK API GET - Request QString : ", qstring);
        var options = {
            method: "GET",
            port: 443,
            protocol: "https:",
            hostname: "slack.com",
            path: "/api/" + this.option_data.api_method + "?" + qstring
        };
        if(log) console.log("SLACK API GET - Request File Options : ", options);
        let retJSON = '';
        return new Promise( (resolve, reject) => {
            const request = HTTPS.request(options, function(res) {
                if(log) console.log('SLACK API GET - Request Status Code:', res.statusCode);
                if(log) console.log('SLACK API GET - Request Headers:', res.headers);
                res.setEncoding( 'utf8' );
                res.on("data", function(data) { 
                    retJSON += data; 
                });
                res.on("end", function () {
                    if(log) console.log("SLACK API GET - Response Results", retJSON.toString());
                    resolve(JSON.parse(retJSON));
                });
            });
            request.on("error", function (error) { 
                console.log("SLACK API GET ERROR : ", JSON.stringify(error));
                console.log("SLACK API GET ERROR Code : ", JSON.stringify(error.code));
                console.log("SLACK API GET ERROR Message : ", JSON.stringify(error.message));
                console.log("SLACK API GET ERROR Stack : ", JSON.stringify(error.stack));
                reject(error);
            });
            request.end();
            if(log) console.log("SLACK API GET - Request Results : ", request);
        });
    }

 
};    