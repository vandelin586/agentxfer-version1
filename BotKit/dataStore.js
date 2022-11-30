import { findIndex } from 'lodash';

class DataStore {
    constructor() {
        var botVariables = [];
    }
    saveAllVariables(response, langArr) {
        this.botVariables = [];
        for (var i = 0; i < langArr.length; i++) {
            if (response[i].errors) {
                console.log(response[i].errors[0].msg);
                var obj = {
                    "variables": [],
                    "error": response[i].errors[0].msg
                };
                this.botVariables.push(obj);
            } else {
                this.botVariables.push(response[i]);
            }
        }
    }
    addVariable(variable, arrIndex) {
        if (!this.botVariables[arrIndex].error) {
            this.botVariables[arrIndex].variables.push(variable);
            this.botVariables[arrIndex].count = this.botVariables[arrIndex].count + 1;
        }
    }
    updateVariable(variable, langArr, index) {
        var eleIndex = findIndex(this.botVariables[index].variables, ['_id', variable._id]);
        if (eleIndex > -1) {
            if (variable.variableType === "env") {
                for (var i = 0; i < langArr.length; i++) {
                    this.botVariables[i].variables[eleIndex] = variable;
                }
            } else {
                this.botVariables[index].variables[eleIndex] = variable;
            }
        }
    }
    deleteVariable(variable, langArr) {
        for (var i = 0; i < langArr.length; i++) {
            if (!this.botVariables[i].error) {
                var eleIndex = findIndex(this.botVariables[i].variables, ['_id', variable._id]);
                this.botVariables[i].variables.splice(eleIndex, 1);
                this.botVariables[i].count = this.botVariables[i].count - 1;
            }
        }

    }
}





export function getInst() {
    return new DataStore();
}