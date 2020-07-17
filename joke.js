console.log('Loading Joke class');

const CRYPTO = require('crypto');
var AWS = require("./aws");
var Message = require("./message");

const log = true ;

module.exports = class Joke {

    constructor(){
        if(log) console.log("JOKE CONSTRUCTOR");
        this.id ;
        this.question ;
        this.answer ;
        this.raw ;
        this.tags ;
        this.email = "nerdjokes@pixelated.tech" ;
        return this ;
    }
 
    async load(){
        if(log) console.log("JOKE LOAD");
        let rnd = this.getGUID();
        if(log) console.log("JOKE LOAD - GUID : ", rnd);
        var ddbc = new AWS.DDBCLIENT();
        let myjoke = await ddbc.scanFromDynamo({
            tablename: ddbc.jokesDB,
            start_key: { "id": rnd } , 
            limit: 1
        });
        if(log) console.log("JOKE LOAD - Joke : ", myjoke);
        this.raw = myjoke.Items[0] ;
        this.id = myjoke.Items[0].id ;
        this.question = myjoke.Items[0].question ;
        this.answer = myjoke.Items[0].answer ;
        return;
    }


// ==========================================
//            SHARED FUNCTIONS
// ==========================================


    sortByProperty(property){  
        // MUST RUN AGAINST AN ARRAY AS ARRAY SORT FUNCTION
        // https://medium.com/@asadise/sorting-a-json-array-according-one-property-in-javascript-18b1d22cd9e9
        return function(a,b){  
            if(a[property] > b[property])  
                return 1;  
            else if(a[property] < b[property])  
                return -1;
            return 0;  
        }; 
    }
    
    
    getRandomInt (min, max) {
        var numbers = [];
        numbers.length = 20;
        for (var i = 0; i < numbers.length ; i++) {
            numbers[i] = this.randomCryptoInt(min, max);
        }
        if(log) console.log("GET RANDOM INT - Min: " , min , " Max: ", max , " Nums: ", numbers);
        return numbers[this.randomInt(0, numbers.length - 1)];
    }
    getGUID(){
        console.log("GET GUID");
        let guid = this.randomGUIDv4();
        console.log("GET GUID - ", guid);
        return guid ;
    }
    randomInt(min, max) {
        // min and max are inclusive
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    randomCryptoInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        if(min >= max) return false;
        const diff = max - min + 1;
        const rnd = CRYPTO.randomBytes(8).readUInt32LE() / 0xffffffff ;
        return Math.floor( rnd * diff ) + min ; 
    }
    randomGUIDv1(){
        var hexString = CRYPTO.randomBytes(16).toString("hex");
        var guidString = hexString.substring(0,8) + "-" + 
            hexString.substring(8,12) + "-" + 
            hexString.substring(12,16) + "-" + 
            hexString.substring(16,20) + "-" + 
            hexString.substring(20);
        return guidString;
    }
    randomGUIDv4(){
        if(log) console.log("RANDOM GUID v4 ");
        let guid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ (CRYPTO.randomBytes(1)[0] & (15 >> (c / 4)))).toString(16)
        );
        if(log) console.log("RANDOM GUID v4 - ", guid);
        return guid ;
    }
    randomStr(howMany, chars) {
        chars = chars || 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789';
        var rnd = CRYPTO.randomBytes(howMany);
        var value = new Array(howMany);
        var len = Math.min(256, chars.length);
        var d = 256 / len ;
        for (var i = 0; i < howMany; i++) {
              value[i] = chars[Math.floor(rnd[i] / d)];
        }
        return value.join('');
    }


// ==========================================
//            ADD JOKE FUNCTIONS
// ==========================================

    
    async addNewJoke(event){
        if(log) console.log("ADD NEW JOKE ");
        let message_data = await this.addNewJokeMessage(event);
        if(log) console.log("ADD NEW JOKE - Message : ", message_data);
        var message = new Message(message_data);
        await message.slackApiPost();
        return null;
    }
    
    
    async addNewJokeMessage(event){
        if(log) console.log("ADD NEW JOKE MESSAGE ");
        var tag_options = await this.getTagOptions(event);
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
        		},{
    				"type": "input",
                    "block_id": "newjoke_tags_block",
    				"label": {
    					"type": "plain_text",
    					"text": "Tags: (select all that apply)"
    				},
    				"element": {
    					"type": "multi_static_select",
                        "action_id": "newjoke_tags_selected",
    					"placeholder": {
    						"type": "plain_text",
    						"text": "Select tags..."
    					},
    					// "initial_option": { },
    					"options": tag_options 
    				}
    			}
        	]
        });
        if(log) console.log("ADD NEW JOKE MESSAGE - View : ", _view);
        let message = {
            trigger_id: event.trigger_id,
            view: _view,
            api_method: "views.open",
            b_token: event.b_token
        };
        if(log) console.log("ADD NEW JOKE MESSAGE - Message : ", message);
        return(message);
    }
    
    
    async getTagOptions(event){
    	if(log) console.log("GET TAG OPTIONS ");
        var ddbc = new AWS.DDBCLIENT();
        let mytags = await ddbc.scanFromDynamo({
            tablename: ddbc.jokesTagsDB
        });
        if(log) console.log("GET TAG OPTIONS - Tags : ", mytags);
        // ==#####== SORT ITEMS ==#####== 
        mytags.Items = mytags.Items.sort(this.sortByProperty("tag"));
        if(log) console.log("GET TAG OPTIONS - Tags Sorted : ", mytags);
        var items = [];
        for (var i = 0; i < mytags.Items.length; i++) {
            var item = {};
            item.text = { "type": "plain_text", "text": mytags.Items[i].tag } ;
            item.value = mytags.Items[i].tag ;
            items.push(item);
        }
        if(log) console.log("GET TAG OPTIONS : ", items);
        return items;
    }


    async addNewJokeSubmit(event){
    	if(log) console.log("ADD NEW JOKE SUBMIT ");
        // var prvmeta = JSON.parse(event.view.private_metadata);
        var q = event.view.state.values.newjoke_question_block.newjoke_question.value.replace(/\+/g, ' ') ;
        var a = event.view.state.values.newjoke_answer_block.newjoke_answer.value.replace(/\+/g, ' ') ;
        var tags = event.view.state.values.newjoke_tags_block.newjoke_tags_selected.selected_options ; // array
        var tags_set = [];
        tags.forEach(async function(tag) {
            tags_set.push(tag.value);
        });
        if(event.team.id == "T011Q2H2HQ8" && event.user.id == "U011Q2H2KG8"){
            var ddbc = new AWS.DDBCLIENT();
            await ddbc.writeToDynamo({
                tablename: ddbc.jokesDB,
                item: {
                    id : this.getGUID() ,// Date.now().valueOf().toString() ,
                    question : q ,
                    answer : a ,
                    tags : await ddbc.createDynamoSet(tags_set) ,
                    put_date : new Date().toISOString() 
                }
            });
        	if(log) console.log("ADD NEW JOKE SUBMIT - Submitted ");
        } else {
            var ses = new AWS.SES();
            await ses.sendEmail({
                to: this.email,
                from: this.email,
                subject: "New NerdJokes Submitted",
                body: q + "\n\n" + a
            });
        }
        await this.addNewJokeThankYou(event);
        return null;
    }


    async addNewJokeThankYou(event){
        if(log) console.log("ADD NEW JOKE THANK YOU ");
        var prvmeta = JSON.parse(event.view.private_metadata);
        let message_data = {
            token: event.b_token,
            replace_original: true,
            channel: prvmeta.channel_id,
            response_type: 'ephemeral' ,
            text: "Thank you for submitting a new NerdJoke!",
            b_token: event.b_token ,
            api_method: "chat.postMessage" ,
            response_url: event.response_url
        };
        if(log) console.log("ADD NEW JOKE THANK YOU - Result : ", message_data);
        var message = new Message(message_data);
        await message.slackApiPost() ;
        return null;
    }


// ==========================================
//            SEND JOKE FUNCTIONS
// ==========================================


    async sendJoke(event){
        if(log) console.log("SEND JOKE " );
        // const joke = await this.getJoke();
        const sendquestion = await this.sendJokeQuestion(event);
        await this.sendJokeAnswer(event, sendquestion.message.ts );
        return null;
    }


    // TODO: Check if private channel, and if app is a member, otherwise you get an error

    async sendJokeQuestion(event){
        if(log) console.log("SEND JOKE QUESTION ");
        let message_data = {
            token: event.b_token,
            replace_original: true,
            channel: event.channel_id,
            response_type: 'in_channel' ,
            text: this.question ,
            b_token: event.b_token ,
            api_method: "chat.postMessage" ,
        };
        if(log) console.log("SEND JOKE QUESTION - Result : ", message_data);
        var message = new Message(message_data);
        var result = await message.slackApiPost() ;
        return result;
    }


    async sendJokeAnswer(event, q_ts){
        if(log) console.log("SEND JOKE ANSWER - Even ");
        if(log) console.log("SEND JOKE ANSWER - Q TS : ", q_ts);
        let message_data = {
            token: event.b_token,
            replace_original: true,
            channel: event.channel_id,
            response_type: 'in_channel' ,
            text: this.answer ,
            b_token: event.b_token ,
            api_method: "chat.postMessage" ,
            thread_ts: q_ts 
        };
        if(log) console.log("SEND JOKE ANSWER - Result : ", message_data);
        var message = new Message(message_data);
        await message.slackApiPost() ;
        return null;
    }

 
};