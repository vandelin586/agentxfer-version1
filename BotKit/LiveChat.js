var botId               = "st-9654d6a8-1535-57f3-9815-ab6fcc320702";
var botName             = "travelbot";
import { sendUserMessage, clearAgentSession, getMessages, skipUserMessage, sendBotMessage, skipBotMessage } from "./lib/sdk";
import request from 'request';
import { promisify, all } from 'bluebird';
var request             = promisify(request);
import { getPendingMessages as _getPendingMessages, initChat, sendMsg } from './LiveChatAPI.js';
import { each, get, filter } from 'lodash';
import { liveagentlicense, app } from './config.json';
var debug               = require('debug')("Agent");
import { scheduleJob } from 'node-schedule';
var _map                = {}; //used to store secure session ids //TODO: need to find clear map var
var userDataMap         = {};//this will be use to store the data object for each user
var userResponseDataMap = {};

/**
 * getPendingMessages
 *
 * @param {string} visitorId user id
 * @param {string} ssid session id of the live chat
 * @param {string} last message sent/received to/by agent 
*/
function getPendingMessages( visitorId, ssid, last_message_id){
    debug("getPendingMessages: %s %s ", visitorId, ssid);
    var licence_id = liveagentlicense;
    return _getPendingMessages(visitorId, ssid,last_message_id, licence_id)
        .then(function(res){
            each(res.events, function(event){
                var data = userDataMap[visitorId];
                if(event.type === "message" && event.user_type !== "visitor"){
                    data.message = event.text;
                    data._originalPayload.message = data.text;
                    debug('replying ', event.text);
                    _map[visitorId].last_message_id = event.message_id;
                    return sendUserMessage(data, function(err){
                        console.log("err", err);
                    }).catch(function(e){
                        console.log(e);
                        debug("sending agent reply error", e);
                        delete userResponseDataMap[visitorId];
                        delete _map[visitorId];
                    });
                } else if (event.type==="chat_closed"){
                    console.log('chat_closed');
                    delete userResponseDataMap[visitorId];
                    delete _map[visitorId];
                    clearAgentSession(data);
                }
            });
        })
        .catch(function(e){
            console.error(e);
            delete userDataMap[visitorId];
            delete _map[visitorId];
        });
}

/*
 * Schedule a joob to fetch messages every 5 seconds 
 */
scheduleJob('*/5 * * * * *', function(){
    debug('schedular triggered');
    var promiseArr = [];
    each(_map, function(entry){
        promiseArr.push(getPendingMessages(entry.visitorId, entry.secured_session_id, entry.last_message_id));
     });
     return all(promiseArr).then(function(){
         debug('scheduled finished');
     }).catch(function(e) {
         debug('error in schedular', e);
     });
});
function gethistory(req, res){
    var userId = req.query.userId;
    var data = userDataMap[userId];
    
    if(data) {
        data.limit = 100;
        return getMessages(data, function(err, resp){
            if(err){
                res.status(400);
                return res.json(err);
            }
            var messages = resp.messages;
            res.status(200);
            return res.json(messages);
        });
    } else {
        var error = {
            msg: "Invalid user",
            code: 401
        };
        res.status(401);
        return res.json(error);
    }
}

/**
 * connectToAgent
 *
 * @param {string} requestId request id of the last event
 * @param {object} data last event data
 * @returns {promise}
 */
function connectToAgent(requestId, data, cb){
    var formdata = {};
    formdata.licence_id = liveagentlicense;
    formdata.welcome_message = "";
    var visitorId = get(data, 'channel.channelInfos.from');
    if(!visitorId){
        visitorId = get(data, 'channel.from');
    }
    userDataMap[visitorId] = data;
    data.message="An Agent will be assigned to you shortly!!!";
    sendUserMessage(data, cb);
    formdata.welcome_message = "Link for user Chat history with bot: "+ app.url +"/history/index.html?visitorId=" + visitorId;
    return initChat(visitorId, formdata)
         .then(function(res){
             _map[visitorId] = {
                 secured_session_id: res.secured_session_id,
                 visitorId: visitorId,
                 last_message_id: 0
            };
        });
}

/*
 * onBotMessage event handler
 */
function onBotMessage(requestId, data, cb){
    debug("Bot Message Data",data);
    var visitorId = get(data, 'channel.from');
    var entry = _map[visitorId];
    if(data.message.length === 0 || data.message === '') {
        return;
    }
    var message_tone = get(data, 'context.dialog_tone');
    if(message_tone && message_tone.length> 0){
        var angry = filter(message_tone, {tone_name: 'angry'});
        if(angry.length){
            angry = angry[0];
            if(angry.level >=2){
                connectToAgent(requestId, data);
            }
            else {
                sendUserMessage(data, cb);
            }
        }
        else {
            sendUserMessage(data, cb);
        }
    }
    else if(!entry)
    {
        sendUserMessage(data, cb);
    }else if(data.message === "skipUserMessage"){ // condition for skipping a user message
	skipUserMessage(data, cb);
    }
}

/*
 * OnUserMessage event handler
 */
function onUserMessage(requestId, data, cb){
    debug("user message", data);
    var visitorId = get(data, 'channel.from');
    var entry = _map[visitorId];
    if(entry){//check for live agent
        //route to live agent
        var formdata = {};
        formdata.secured_session_id = entry.secured_session_id;
        formdata.licence_id = liveagentlicense;
        formdata.message = data.message;
        return sendMsg(visitorId, formdata)
            .catch(function(e){
                console.error(e);
                delete userDataMap[visitorId];
                delete _map[visitorId];
                return sendBotMessage(data, cb);
            });
    }
    else {
	if(data.message === "skipBotMessage") // condition for skipping a bot message
            return skipBotMessage(data, cb);
        else    
            return sendBotMessage(data, cb);
    }
}

/*
 * OnAgentTransfer event handler
 */
function onAgentTransfer(requestId, data, callback){
    connectToAgent(requestId, data, callback);
}

export const botId = botId;
export const botName = botName;
export function on_user_message(requestId, data, callback) {
    console.log('data', data);
    debug('on_user_message');
    onUserMessage(requestId, data, callback);
}
export function on_bot_message(requestId, data, callback) {
    debug('on_bot_message');
    onBotMessage(requestId, data, callback);
}
export function on_agent_transfer(requestId, data, callback) {
    debug('on_webhook');
    onAgentTransfer(requestId, data, callback);
}
export const gethistory = gethistory;
