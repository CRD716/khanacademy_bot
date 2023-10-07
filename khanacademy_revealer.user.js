// ==UserScript==
// @name         Khan Academy Answer Revealer
// @version      1.5
// @downloadURL  https://github.com/adubov1/khanacademy_bot/raw/main/khanacademy_revealer.user.js
// @updateURL  https://github.com/adubov1/khanacademy_bot/raw/main/khanacademy_revealer.user.js
// @description  ur welcome cheater
// @author       Alex Dubov (github@adubov1)
// @match        https://www.khanacademy.org/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    window.loaded = false;

    class Answer {
        constructor(answer, type) {
            this.body = answer;
            this.type = type;
        }

        get isMultiChoice() {
            return this.type == "multiple_choice";
        }

        get isFreeResponse() {
            return this.type == "free_response";
        }

        get isExpression() {
            return this.type == "expression";
        }

        get isDropdown() {
            return this.type == "dropdown";
        }

        log() {
            const answer = this.body;
            const style = "color: coral; -webkit-text-stroke: .5px black; font-size:24px; font-weight:bold;";

            answer.map(ans => {
                if (typeof ans == "string") {
                    if (ans.includes("web+graphie")) {
                        this.body[this.body.indexOf(ans)] = "";
                        this.printImage(ans);
                    } else {
                        answer[answer.indexOf(ans)] = ans.replaceAll("$", "");
                    }
                }
            });

            const text = answer.join("\n");
            if (text) {
		if (text.indexOf(" ") > -1) {
                    const formattedtext = latex_to_js(text);
                    console.log(`%c${formattedtext.trim()} `, style);
                } else {
                    console.log(`%c${text.trim()} `, style);
                }
            }
        }

        printImage(ans) {
            const url = ans.replace("![](web+graphie", "https").replace(")", ".svg");
            const image = new Image();

            image.src = url;
            image.onload = () => {
                const imageStyle = [
                    'font-size: 1px;',
                    'line-height: ', this.height % 2, 'px;',
                    'padding: ', this.height * .5, 'px ', this.width * .5, 'px;',
                    'background-size: ', this.width, 'px ', this.height, 'px;',
                    'background: url(', url, ');'
                ].join(' ');
                console.log('%c ', imageStyle);
            };
        }
    }

    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(async (res) => {
            if (res.url.includes("/getAssessmentItem")) {
                const clone = res.clone();
                const json = await clone.json()

                let item, question;

                try {
                    item = json.data.assessmentItem.item.itemData;
                    question = JSON.parse(item).question;
                } catch {
                    let errorIteration = () => { return localStorage.getItem("error_iter") || 0; }
                    localStorage.setItem("error_iter", errorIteration() + 1);

                    if (errorIteration() < 4) {
                        return location.reload();
                    } else {
                        return console.log("%c An error occurred", "color: red; font-weight: bolder; font-size: 20px;");
                    }
                }

                if (!question) return;

                Object.keys(question.widgets).map(widgetName => {
                    switch (widgetName.split(" ")[0]) {
                        case "numeric-input":
                            return freeResponseAnswerFrom(question).log();
                        case "radio":
                            return multipleChoiceAnswerFrom(question).log();
                        case "expression":
                            return expressionAnswerFrom(question).log();
                        case "dropdown":
                            return dropdownAnswerFrom(question).log();
                    }
                });
            }

            if (!window.loaded) {
                console.clear();
                console.log("%c Answer Revealer ", "color: mediumvioletred; -webkit-text-stroke: .5px black; font-size:40px; font-weight:bolder; padding: .2rem;");
                console.log("%cCreated by Alex Dubov (@adubov1)", "color: white; -webkit-text-stroke: .5px black; font-size:15px; font-weight:bold;");
                window.loaded = true;
            }

            return res;
        })
    }

    function freeResponseAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answers) {
                return widget.options.answers.map(answer => {
                    if (answer.status == "correct") {
                        return answer.value;
                    }
                });
            }
        }).flat().filter((val) => { return val !== undefined; });

        return new Answer(answer, "free_response");
    }

    function multipleChoiceAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat().filter((val) => { return val !== undefined; });

        return new Answer(answer, "multiple_choice");
    }

    function expressionAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answerForms) {
                return widget.options.answerForms.map(answer => {
                    if (Object.values(answer).includes("correct")) {
                        return answer.value;
                    }
                });
            }
        }).flat();

        return new Answer(answer, "expression");
    }

    function dropdownAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat();

        return new Answer(answer, "dropdown");
    }
})();

/*
LATEX FORMATTER
 * Author: Tobi Ayilara
 * Website: http://crownie.tk
 * github: https://github.com/crownie/latex-to-js
 *
 * Copyright 2014 Tobi Ayilara
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
   use this file except in compliance with the License. You may obtain a copy
   of the License at

   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
   WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
   License for the specific language governing permissions and limitations under
   the License.
 */
var latex_to_js = function(input) {
    var init, fraction, square_root, nth_root, nth_power, sin, cos, tan, sinCosTanFramework, convert_others;

    init = function() {
        var st1 = input;
        st1 = st1.replace(/\s/g, "");
        st1 = st1.replace(/\\times/g, "*");
        st1 = st1.replace(/\\div/g, "/");

        //pi
        st1 = st1.replace(/([0-9a-zA-Z\.]+)\\pi/g, "$1*3.142");
        st1 = st1.replace(/\\pi([0-9a-zA-Z\.]+)/g, "3.142*$1");
        st1 = st1.replace(/([0-9a-zA-Z\.]+)\\pi([0-9a-zA-Z\.]+)/g, "$1*3.142*$2");
        st1 = st1.replace(/\\pi/g, "3.142");

        st1 = fraction(st1);
        st1 = square_root(st1);
        st1 = nth_root(st1);
        st1 = nth_power(st1);
        st1 = sin(st1);
        st1 = tan(st1);
        st1 = cos(st1);

        //clean up brackets
        st1 = st1.replace(/\\left\(/g, "(");
        st1 = st1.replace(/\\right\)/g, ")");
        return st1;
    };

    fraction = function(input) {
        while (input.search(/\\frac\{(((?![\{\}]).)*)\}\{(((?![\{\}]).)*)\}/) >= 0) {

            input = input.replace(/\\frac\{(((?![\{\}]).)*)\}\{(((?![\{\}]).)*)\}/g, "($1)/($3)");
        }

        if (input.search(/\\frac/) >= 0) {
            input = convert_others("fraction", input);
        }

        return input;
    };

    square_root = function(input) {
        while (input.search(/\\sqrt\{(((?![\{\}]).)*)\}/) >= 0) {

            input = input.replace(/\\sqrt\{(((?![\{\}]).)*)\}/g, "sqrt($1)");
        }

        if (input.search(/\\sqrt\{/) >= 0) {
            input = convert_others("square root", input);
        }

        return input;
    };

    nth_root = function(input) {
        while (input.search(/\\sqrt\[(((?![\{\}]).)*)\]\{(((?![\{\}]).)*)\}/) >= 0) {

            input = input.replace(/\\sqrt\[(((?![\{\}]).)*)\]\{(((?![\{\}]).)*)\}/g, "pow($3,1/$1)");
        }
        if (input.search(/\\sqrt\[/) >= 0) {
            input = convert_others("nth root", input);
        }
        return input;
    };

    nth_power = function(input) {
        //first case: single number with curly bracket power
        while (input.search(/([0-9a-zA-Z\.]+)\^\{(((?![\{\}]).)*)\}/) >= 0) {

            input = input.replace(/([0-9a-zA-Z\.]+)\^\{(((?![\{\}]).)*)\}/g, "pow($1,$2)");
        }
        //second case: single number without curly bracket
        while (input.search(/([0-9a-zA-Z\.]+)\^([0-9a-zA-Z\.]+)/) >= 0) {

            input = input.replace(/([0-9a-zA-Z\.]+)\^([0-9a-zA-Z\.]+)/g, "pow($1,$2)");
        }

        //third case: bracket number without curly bracket power
        while (input.search(/\\left\(([0-9a-zA-Z\.\+\*\-\\]+)\\right\)\^([0-9a-zA-Z\.]+)/) >= 0) {

            input = input.replace(/\\left\(([0-9a-zA-Z\.\+\*\-\\]+)\\right\)\^([0-9a-zA-Z\.]+)/g, "pow($1,$2)");
        }

        //forth case: bracket number with curly bracket power
        while (input.search(/\\left\(([0-9a-zA-Z\.\+\*\-\\]+)\\right\)\^\{(((?![\{\}]).)*)\}/) >= 0) {

            input = input.replace(/\\left\(([0-9a-zA-Z\.\+\*\-\\]+)\\right\)\^\{(((?![\{\}]).)*)\}/g, "pow($1,$2)");
        }

        //fifth case: bracket number with some brackets and division sign, with curly bracket power
        while (input.search(/\\left\(([0-9a-zA-Z\.\+\*\-\\\(\)\/]+)\\right\)\^\{(((?![\{\}]).)*)\}/) >= 0) {

            input = input.replace(/\\left\(([0-9a-zA-Z\.\+\*\-\\\(\)\/]+)\\right\)\^\{(((?![\{\}]).)*)\}/g, "pow($1,$2)");
        }

        if (input.search(/\^/) >= 0) {
            input = convert_others("nth power", input);
        }
        return input;
    };

    sin = function(input) {

        return sinCosTanFramework("sin", input);
    };

    tan = function(input) {
        return sinCosTanFramework("tan", input);
    };

    cos = function(input) {
        return sinCosTanFramework("cos", input);
    };

    sinCosTanFramework = function(func, input) {
        var pat1 = new RegExp("\\\\" + func + "\\\\left\\(([0-9a-zA-Z\\.\\+\\*\\-\\\\\\(\\)\\/]+)\\\\right\\)");
        //eg: /\\sin\\left\(([0-9a-zA-Z\.\+\*\-\\\(\)\/]+)\\right\)/

        while (input.search(pat1) >= 0) {

            input = input.replace(pat1, func + "($1)");
        }
        var pat2 = new RegExp("\\\\" + func + "([0-9a-zA-Z]+)");
        //eg:  /\\sin([0-9a-zA-Z]+)/:

        while (input.search(pat2) >= 0) {

            input = input.replace(pat2, func + "($1)");
        }

        var pat3 = new RegExp("\\\\" + func);
        //eg:  /\\sin/
        if (input.search(pat3) >= 0) {
            input = convert_others(func, input);
        }

        return input;
    };

    convert_others = function(func, input) {
        var temp_input, arr, closest_pos, func_pos, frac_pos, sqrt_pos, root_pos, pow_pos, sin_pos, tan_pos, cos_pos;
        switch(func) {
            case "fraction":
                temp_input = input.match(/\\frac.*/)[0];
                func_pos = temp_input.search(/\\frac/);
                break;
            case "square root":
                temp_input = input.match(/\\sqrt\{.*/)[0];
                func_pos = temp_input.search(/\\sqrt\{/);
                break;
            case "nth root":
                temp_input = input.match(/\\sqrt\[.*/)[0];
                func_pos = temp_input.search(/\\sqrt\[/);
                break;
            case "nth power":
                temp_input = input.match(/\^.*/)[0];
                func_pos = temp_input.search(/\^/);
                break;
            case "sin":
                temp_input = input.match(/\\sin\{.*/)[0];
                func_pos = temp_input.search(/\\sin\{/);
                break;
            case "tan":
                temp_input = input.match(/\\tan\{.*/)[0];
                func_pos = temp_input.search(/\\tan\{/);
                break;
            case "cos":
                temp_input = input.match(/\\cos\{.*/)[0];
                func_pos = temp_input.search(/\\cos\{/);
                break;
            default:
                return;
        }
        frac_pos = temp_input.search(/\\frac/);
        sqrt_pos = temp_input.search(/\\sqrt\{/);
        root_pos = temp_input.search(/\\sqrt\[/);
        pow_pos = temp_input.search(/\^/);
        sin_pos = temp_input.search(/\\sin\{/);
        tan_pos = temp_input.search(/\\tan\{/);
        cos_pos = temp_input.search(/\\cos\{/);

        arr = [frac_pos, root_pos, sqrt_pos, pow_pos, sin_pos, tan_pos, cos_pos];
        arr.sort(function(a, b) {
            return b - a;
        });
        //desc order



        closest_pos = arr[arr.indexOf(0)-1];



        if (closest_pos <= 0 || closest_pos===undefined) {


            throw ("syntax error");
        }

        switch(closest_pos) {
            case frac_pos:
                input = fraction(input);
                break;
            case sqrt_pos:
                input = square_root(input);
                break;
            case root_pos:
                input = nth_root(input);
                break;
            case pow_pos:
                input = nth_power(input);
                break;
            case sin_pos:
                input = sin(input);
                break;
            case tan_pos:
                input = tan(input);
                break;
            case cos_pos:
                input = cos(input);
                break;
            default:

        }

        switch(func) {
            case "fraction":
                input = fraction(input);
                break;
            case "square root":
                input = square_root(input);
                break;
            case "nth root":
                input = nth_root(input);
                break;
            case "nth power":
                input = nth_power(input);
                break;
            case "sin":
                input = sin(input);
                break;
            case "tan":
                input = tan(input);
                break;
            case "cos":
                input = cos(input);
                break;
        }

        return input;
    };
    try{
        return init();
    }catch(e){
        throw("syntax error");
    }

};
