console.log('Loading AWS class');

const AWS = require("aws-sdk");
AWS.config.update({region: 'us-east-2'});

const log = true ;


// ========================================
//          DYNAMODB CLIENT CLASS
// ========================================


class DDBCLIENT {

    constructor(){
        if(log) console.log("AWS DDBCLIENT CONSTRUCTOR");
        this.DDBCLIENT = new AWS.DynamoDB.DocumentClient() ;
        this.stkrS3Bucket = "stkr-bucket";
        this.stkrTokenDB = "stkr-tokens";
        this.stkrImageDB = "stkr-images";
        this.stkrLogDB = "stkr-logs";
        this.jokesTokenDB = "nerdjokes-tokens";
        this.jokesDB = "nerdjokes";
        this.jokesScheduleDB = "nerdjokes-schedule";
        this.jokesTagsDB = "nerdjokes-tags";
        this.jokesLogDB = "nerdjokes-logs";

        return this ;
    }
    
    
    async readFromDynamo(data){
        if(log) console.log("READ FROM DYNAMO - Data : ", data);
        var params = { TableName: data.tablename };
        // if(data.key) params.Key = { [data.key] : data.value };
        if(data.key) params.Key = data.key;
        if(data.indexname) params.IndexName = data.indexname ;
        if(data.key_cond_expr) params.KeyConditionExpression = data.key_cond_expr ;
        if(data.cond_expr) params.ConditionExpression = data.cond_expr ;
        if(data.filter_expr) params.FilterExpression = data.filter_expr ;
        if(data.attrib_vals) params.ExpressionAttributeValues = data.attrib_vals ;
        if(data.proj_expr) params.ProjectionExpression = data.proj_expr ;
        if(data.select) params.Select = data.select ;
        if(data.limit) params.Limit = data.limit ;
        if(log) console.log("READ FROM DYNAMO - Params : ", params);
        return new Promise((resolve, reject) => {
            this.DDBCLIENT.query(params, (error, itemData) => {
                if (error) {
                    console.log("READ FROM DYNAMO - Error", JSON.stringify(error));
                    console.log("READ FROM DYNAMO - ERROR Code : ", JSON.stringify(error.code));
                    console.log("READ FROM DYNAMO - ERROR Message : ", JSON.stringify(error.message));
                    console.log("READ FROM DYNAMO - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("READ FROM DYNAMO - Success");
                    resolve(itemData);
                }
            });
        });
    }
    
    
    async scanFromDynamo(data){
        if(log) console.log("SCAN FROM DYNAMO - Data : ", data);
        var params = { TableName: data.tablename };
        if(data.key) params.Key = data.key;
        if(data.indexname) params.IndexName = data.indexname ;
        if(data.key_cond_expr) params.KeyConditionExpression = data.key_cond_expr ;
        if(data.cond_expr) params.ConditionExpression = data.cond_expr ;
        if(data.filter_expr) params.FilterExpression = data.filter_expr ;
        if(data.attrib_names) params.ExpressionAttributeNames = data.attrib_names ;
        if(data.attrib_vals) params.ExpressionAttributeValues = data.attrib_vals ;
        if(data.proj_expr) params.ProjectionExpression = data.proj_expr ;
        if(data.select) params.Select = data.select ;
        if(data.start_key) params.ExclusiveStartKey = data.start_key;
        if(data.limit) params.Limit = data.limit ;
        if(log) console.log("SCAN FROM DYNAMO - Params : ", params);
        return new Promise((resolve, reject) => {
            this.DDBCLIENT.scan(params, (error, result) => {
                if (error) {
                    console.log("SCAN FROM DYNAMO - Error", JSON.stringify(error));
                    console.log("SCAN FROM DYNAMO - ERROR Code : ", JSON.stringify(error.code));
                    console.log("SCAN FROM DYNAMO - ERROR Message : ", JSON.stringify(error.message));
                    console.log("SCAN FROM DYNAMO - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("SCAN FROM DYNAMO - Success");
                    if(log) console.log("SCAN FROM DYNAMO - Results : ", result);
                    resolve(result);
                }
            });
        });
    }
    
    
    async writeToDynamo(data){
        if(log) console.log("WRITE TO DYNAMO - Data", JSON.stringify(data));
        var params = {
            TableName: data.tablename,
            Item: data.item
        };
        if(log) console.log("WRITE TO DYNAMO - Params", JSON.stringify(params));
        return new Promise((resolve, reject) => {
            this.DDBCLIENT.put(params, (error) => {
                if (error) {
                    console.log("WRITE TO DYNAMO - Error", JSON.stringify(error));
                    console.log("WRITE TO DYNAMO - ERROR Code : ", JSON.stringify(error.code));
                    console.log("WRITE TO DYNAMO - ERROR Message : ", JSON.stringify(error.message));
                    console.log("WRITE TO DYNAMO - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("WRITE TO DYNAMO - Success");
                    resolve("Data written to dynamo succesfully.");
                }
            });
        });
    }
    
    
    async createDynamoSet(data){
        if(log) console.log("CREATE DYNAMO SET");
        if(log) console.log("CREATE DYNAMO SET - Data", data);
        return this.DDBCLIENT.createSet(data) ;
    }
    
    
    async updateToDynamo(data){
        if(log) console.log("UPDATE TO DYNAMO - Data", data);
        var params = { TableName: data.tablename };
        // if(data.key) params.Key = { [data.key] : data.value };
        if(data.key) params.Key = data.key;
        if(data.update_expr) params.UpdateExpression = data.update_expr ;
        if(data.attrib_vals) params.ExpressionAttributeValues = data.attrib_vals ;
        if(data.return_vals) params.ReturnValues = data.return_vals ;
        if(log) console.log("UPDATE TO DYNAMO - Params", params);
        return new Promise((resolve, reject) => {
            this.DDBCLIENT.update(params, (error) => {
                if (error) {
                    console.log("UPDATE TO DYNAMO - Error", JSON.stringify(error));
                    console.log("UPDATE TO DYNAMO - ERROR Code : ", JSON.stringify(error.code));
                    console.log("UPDATE TO DYNAMO - ERROR Message : ", JSON.stringify(error.message));
                    console.log("UPDATE TO DYNAMO - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("UPDATE TO DYNAMO - Success");
                    resolve("Data updated to dynamo succesfully.");
                }
            });
        });
    }
    
    
    async deleteFromDynamo(data){
        if(log) console.log("DELETE FROM DYNAMO - Data : ", data);
        var params = { TableName: data.tablename };
        if(data.key) params.Key = data.key;
        if(data.indexname) params.IndexName = data.indexname ;
        if(data.key_cond_expr) params.KeyConditionExpression = data.key_cond_expr ;
        if(data.cond_expr) params.ConditionExpression = data.cond_expr ;
        if(data.filter_expr) params.FilterExpression = data.filter_expr ;
        if(data.attrib_vals) params.ExpressionAttributeValues = data.attrib_vals ;
        if(data.proj_expr) params.ProjectionExpression = data.proj_expr ;
        if(log) console.log("DELETE FROM DYNAMO - Params : ", params);
        return new Promise((resolve, reject) => {
            this.DDBCLIENT.delete(params, (error, itemData) => {
                if (error) {
                    console.log("DELETE FROM DYNAMO - Error", JSON.stringify(error));
                    console.log("DELETE FROM DYNAMO - ERROR Code : ", JSON.stringify(error.code));
                    console.log("DELETE FROM DYNAMO - ERROR Message : ", JSON.stringify(error.message));
                    console.log("DELETE FROM DYNAMO - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("DELETE FROM DYNAMO - Success");
                    if(log) console.log("DELETE FROM DYNAMO - Delete Data", itemData);
                    resolve(itemData);
                }
            });
        });
    }
    
    
    async batchDeleteFromDynamo(data){
        if(log) console.log("BATCH DELETE FROM DYNAMO - Data : ", JSON.stringify(data));
        var params = data.params ;
        if(log) console.log("BATCH DELETE FROM DYNAMO - Params : ", JSON.stringify(params));
        return new Promise((resolve, reject) => {
            this.DDBCLIENT.batchWrite(params, (error, itemData) => {
                if (error) {
                    console.log("BATCH DELETE FROM DYNAMO - Error", JSON.stringify(error));
                    console.log("BATCH DELETE FROM DYNAMO - ERROR Code : ", JSON.stringify(error.code));
                    console.log("BATCH DELETE FROM DYNAMO - ERROR Message : ", JSON.stringify(error.message));
                    console.log("BATCH DELETE FROM DYNAMO - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("BATCH DELETE FROM DYNAMO - Success");
                    if(log) console.log("BATCH DELETE FROM DYNAMO - Delete Data", itemData);
                    resolve(itemData);
                }
            });
        });
    }


}


// ========================================
//             S3 CLASS
// ========================================


class S3 {

    constructor(){
        if(log) console.log("AWS S3 CONSTRUCTOR");
        this.S3 = new AWS.S3();
        this.stkrS3Bucket = "stkr-bucket";
        return this ;
    }
    
    async isS3Object(data){
        if(log) console.log("ISS3OBJECT - Data : ", data);
        try {
            const params = { 
                Bucket: data.bucket, 
                Key: data.team_id + "/" + data.filename 
            };
            await this.S3.headObject(params).promise();
            return true;
        } catch(error) {
            console.log("IS S3 OBJECT - Error", JSON.stringify(error));
            console.log("IS S3 OBJECT - ERROR Code : ", JSON.stringify(error.code));
            console.log("IS S3 OBJECT - ERROR Message : ", JSON.stringify(error.message));
            console.log("IS S3 OBJECT - ERROR Stack : ", JSON.stringify(error.stack));
             //if (error.code === 'NotFound') {
                return false;
             //}
        }
    }
    
    async uploadImgToS3(buffer, data){
        // ==#####== REPLACE SPACES WITH DASHES ==#####==
        var filename = data.filename.replace(/\s+/g, '-');
        const params = {
            Bucket: data.bucket,
            Key: data.team_id + "/" + filename, //data.filename, 
            Body: buffer,
            ContentType: "image",
            ACL: 'public-read-write'
        };
        return new Promise((resolve, reject) => {
            this.S3.putObject(params, (error) => {
                if (error) {
                    console.log("UPLOAD TO S3 - Error", JSON.stringify(error));
                    console.log("UPLOAD TO S3 - ERROR Code : ", JSON.stringify(error.code));
                    console.log("UPLOAD TO S3 - ERROR Message : ", JSON.stringify(error.message));
                    console.log("UPLOAD TO S3 - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("UPLOADIMGTOS3 - " + filename + " uploaded to " + params.Bucket + " succesfully.");
                    resolve(filename);
                }
            });
        });
      
    }
    
    async deleteImgFromS3(data){
        const params = {
            Bucket: data.bucket,
            Key: data.team_id + "/" + data.filename
        };
        return new Promise((resolve, reject) => {
            this.S3.deleteObject(params, (error) => {
                if (error) {
                    console.log("DELETE FROM S3 - Error", JSON.stringify(error));
                    console.log("DELETE FROM S3 - ERROR Code : ", JSON.stringify(error.code));
                    console.log("DELETE FROM S3 - ERROR Message : ", JSON.stringify(error.message));
                    console.log("DELETE FROM S3 - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("DELETE FROM S3 - Successful - Deleted - " + data.filename );
                    resolve(data.filename);
                }
            });
        });
      
    }
    
    async emptyS3Directory(data){
        if(log) console.log("EMPTY S3 DIRECTORY");
        const listParams = {
            Bucket: data.bucket,
            Prefix: data.team_id + "/"
        };
        const listedObjects = await this.S3.listObjectsV2(listParams).promise();
        if(log) console.log("EMPTY S3 DIRECTORY - Listed Objects : ", listedObjects);
        if (listedObjects.Contents.length === 0) return null;
        const deleteParams = {
            Bucket: data.bucket,
            Delete: { Objects: [] }
        };
        for(var key in listedObjects.Contents) {
            var thisObj = listedObjects.Contents[key];
            deleteParams.Delete.Objects.push({ Key : thisObj.Key });
        }
        /* listedObjects.Contents.forEach(({ Key }) => {
            deleteParams.Delete.Objects.push({ Key });
        }); */
        if(log) console.log("EMPTY S3 DIRECTORY - Delete Params : ", JSON.stringify(deleteParams));
        return new Promise((resolve, reject) => {
            this.S3.deleteObjects( deleteParams, async (error, retdata) => {
                if (error) {
                    console.log("EMPTY S3 DIRECTORY - Error", JSON.stringify(error));
                    console.log("EMPTY S3 DIRECTORY - ERROR Code : ", JSON.stringify(error.code));
                    console.log("EMPTY S3 DIRECTORY - ERROR Message : ", JSON.stringify(error.message));
                    console.log("EMPTY S3 DIRECTORY - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("EMPTY S3 DIRECTORY - Successful ");
                    if (listedObjects.IsTruncated) await this.emptyS3Directory(data);
                    resolve(retdata);
                }
            });
        });
    }
    
    async getS3ItemCount(data){
        if(log) console.log("GET S3 ITEM COUNT - Event : ", data);
        var params = { 
            Bucket: data.bucket, 
            Prefix: data.team_id + "/" 
        };
        return new Promise((resolve, reject) => {
            this.S3.listObjectsV2(params, (error, retdata) => {
                if (error) {
                    console.log("GET S3 ITEM COUNT - Error", JSON.stringify(error));
                    console.log("GET S3 ITEM COUNT - ERROR Code : ", JSON.stringify(error.code));
                    console.log("GET S3 ITEM COUNT - ERROR Message : ", JSON.stringify(error.message));
                    console.log("GET S3 ITEM COUNT - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("GET S3 ITEM COUNT - Success");
                    var image_count = retdata.Contents.length ;
                    if(log) console.log("GET S3 ITEM COUNT - Image Count : ", image_count);
                    resolve(image_count);
                }
            });
        });
    }
    
    async getS3ItemList(data){
        if(log) console.log("GET S3 ITEM LIST - Event : ", data);
        var params = { 
            Bucket: data.bucket, 
            Prefix: data.team_id + "/" 
        };
        let images = [];
        return new Promise((resolve, reject) => {
            this.S3.listObjectsV2(params, (error, retdata) => {
                if (error) {
                    console.log("GET S3 ITEM LIST - Error", JSON.stringify(error));
                    console.log("GET S3 ITEM LIST - ERROR Code : ", JSON.stringify(error.code));
                    console.log("GET S3 ITEM LIST - ERROR Message : ", JSON.stringify(error.message));
                    console.log("GET S3 ITEM LIST - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("GET S3 ITEM LIST - Success");
                    for (let index = 0; index < retdata.Contents.length; index++) {
                        var key = retdata.Contents[index].Key;
                        // images += key.replace(params.Prefix, '') + " \n"; 
                        // var item = { text: key.replace(params.Prefix, "") , value: key.replace(params.Prefix, "") };
                        var item =  { "text": { "type": "plain_text", "text": key.replace(params.Prefix, "") } , value: key.replace(params.Prefix, "") } ;
                        images.push(item);
                    }
                    if(log) console.log("GET S3 ITEM LIST - Data : ", JSON.stringify(images));
                    resolve(images);
                }
            });
        });
    }

}


// ========================================
//             SES CLASS
// ========================================


class SES {

    constructor(){
        if(log) console.log("AWS SES CONSTRUCTOR");
        this.SES = new AWS.SES({region: 'us-east-1'});
        return this ;
    }
    
    async sendEmail(data){
        var params = {
            Destination: {
                ToAddresses: [ data.to ]
            },
            Message: {
                Body: { Text: { Data: (data.body) ? data.body : data.subject } },
                Subject: { Data: data.subject }
            },
            Source: data.from
        };
        return new Promise((resolve, reject) => {
            this.SES.sendEmail(params, (error, emaildata) => {
                if (error) {
                    console.log("SEND EMAIL - ERROR", JSON.stringify(error));
                    console.log("SEND EMAIL - ERROR Code : ", JSON.stringify(error.code));
                    console.log("SEND EMAIL - ERROR Message : ", JSON.stringify(error.message));
                    console.log("SEND EMAIL - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("SEND EMAIL - Success");
                    if(log) console.log("SEND EMAIL - Success Data", emaildata);
                    resolve(emaildata);
                }
            });
        });
    }


}


// ========================================
//             LAMBDA CLASS
// ========================================


class LAMBDA {

    constructor(){
        if(log) console.log("AWS LAMBDA CONSTRUCTOR");
        this.LAMBDA = new AWS.Lambda();
        return this ;
    }
    
    async callLambda(params){
        return new Promise((resolve, reject) => {
            this.LAMBDA.invoke(params, (error, data) => {
                if (error) {
                    console.log("CALL LAMBDA - ERROR", JSON.stringify(error));
                    console.log("CALL LAMBDA - ERROR Code : ", JSON.stringify(error.code));
                    console.log("CALL LAMBDA - ERROR Message : ", JSON.stringify(error.message));
                    console.log("CALL LAMBDA - ERROR Stack : ", JSON.stringify(error.stack));
                    reject(error);
                } else {
                    if(log) console.log("CALL LAMBDA - Success");
                    if(log) console.log("CALL LAMBDA - Success Data", data);
                    resolve(data);
                }
            });
        });
    }

}


module.exports = {
    DDBCLIENT: DDBCLIENT,
    S3 : S3,
    SES : SES,
    LAMBDA : LAMBDA
};
