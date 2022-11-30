var botId = "st-9654d6a8-1535-57f3-9815-ab6fcc320702";
var botName = "travelbot";

import { sendUserMessage, sendBotMessage, sendAlertMessage, fetchBotVariable } from "./lib/sdk";
var botVariables = {};
import { languages as langArr } from './config.json';
import _ from 'lodash';
var dataStore = require('./dataStore.js').getInst();
var first = true;

/*
 * This is the most basic example of BotKit.
 *
 * It showcases how the BotKit can intercept the message being sent to the bot or the user.
 *
 * We can either update the message, or chose to call one of 'sendBotMessage' or 'sendUserMessage'
 */

export const botId = botId;
export const botName = botName;
export function on_user_message(requestId, data, callback) {
    fetchAllBotVariables(data);
    if (data.message === "Hi") {
        data.message = "Hello";
        //Sends back 'Hello' to user.
        return sendUserMessage(data, callback);
    } else if (!data.agent_transfer) {
        //Forward the message to bot
        return sendBotMessage(data, callback);
    } else {
        data.message = "Agent Message";
        return sendUserMessage(data, callback);
    }
}
export function on_bot_message(requestId, data, callback) {
    fetchAllBotVariables(data);
    if (data.message === 'hello') {
        data.message = 'The Bot says hello!';
    }
    //Sends back the message to user
    return sendUserMessage(data, callback);
}
export function on_agent_transfer(requestId, data, callback) {
    fetchAllBotVariables(data);
    return callback(null, data);
}
export function on_event(requestId, data, callback) {
    fetchAllBotVariables(data);
    return callback(null, data);
}
export function on_alert(requestId, data, callback) {
    fetchAllBotVariables(data);
    return sendAlertMessage(data, callback);
}
export function on_variable_update(requestId, data, callback) {
    var event = data.eventType;
    if (first || event == "bot_import" || event == "variable_import" || event == "sdk_subscription" || event == "language_enabled") {
        // fetch BotVariables List based on language specific when there is event subscription/bulkimport
        fetchBotVariable(data, langArr, function (err, response) {
            dataStore.saveAllVariables(response, langArr);
            first = false;
        });
    } else {
        var lang = data.language;
        //update Exixting BotVariables in Storage
        updateBotVariableInDataStore(botVariables, data, event, lang);
    }
    console.log(dataStore);

}

function updateBotVariableInDataStore(botVariables, data, event, lang) {
    var variable = data.variable;
    if (event === "variable_create") {
        //update storage with newly created variable
        for (var i = 0; i < langArr.length; i++) {
            dataStore.addVariable(variable, i);
        }
    } else if (event == "variable_update") {
        //update storage with updated variable
        var index = langArr.indexOf(lang);
        if (index > -1) {
            dataStore.updateVariable(variable, langArr, index);
        }
    } else if (event == "variable_delete") {
        //delete variable from storage
        dataStore.deleteVariable(variable, langArr);
    }
}

function fetchAllBotVariables(data) {
    if (first) {
        fetchBotVariable(data, langArr, function(err, response) {
            first = false;
            dataStore.saveAllVariables(response, langArr);
        });
    }
}