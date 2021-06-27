const fs = require('fs');
const path = require('path');

const requiredProps = [
    'name',
    'regexp',
    'handler',
    {
        onlyOnes: ['chats', 'runOnlyPrivateChat', 'runAllChat'] //someone or nothing
    }
];
const optionalProps = ['disabled'];

module.exports = ({ folderPath }) => {

    let commandsList = [], filenames;
    try {
        filenames = fs.readdirSync(folderPath);

    } catch (err) {
        console.log(`${folderPath} yoluna sahip klasöre bakıldı fakat bir hatayla karşılaşıldı: ` + err.message);
        return process.exit(1);
    };

    //#region Get files
    filenames = filenames
        .filter(filename => path.extname(filename) == '.js') //Only js files
        .map(filename => { //Get content of file
            let obj = require(path.join(folderPath, filename));
            obj.filename = filename;

            let chats = obj.chats;
            if (typeof chats == 'string') obj.chats = (chats = chats.trim()) == "" ? [process.env.MAIN_CHAT_ID] : [parseInt(chats)];
            else if (Array.isArray(chats)) obj.chats = chats.map(t => parseInt(t));

            return obj;
        })

    let commandCount = filenames.length;
    console.log(`Following ${commandCount} ${commandCount > 1 ? 'commands' : 'command'} will be added to bot...`);
    //#endregion

    let padLeft = (o, t = !0) => o.toString().padStart(3 + (t ? parseInt(Math.log10(commandCount) + 1) : 0), ' ');

    //#region Filter commands that won't work
    let filteredCount = 0;
    filenames = filenames
        .filter((commandObj, i) => { //Filter wrong objects
            if (!requiredProps.every(prop => {
                if (typeof prop != 'object') return prop in commandObj;
                let correct = !0;
                for (let key in prop) {
                    switch (key) {
                        case 'onlyOnes': {
                            let vals = prop[key], val;
                            let res = vals.findIndex(p => {
                                if (!(p in commandObj)) return !1;
                                val = !!commandObj[p];
                                return !!val || (Array.isArray(val) && vall.length == 0);
                            });
                            if (res == -1) {
                                correct = correct && !0; //nothing
                                commandObj.runAllChat = !0;
                            }
                            else { // one is found
                                let found = vals.slice(res + 1).find(p => p in commandObj);
                                correct = correct && (
                                    found == undefined ||
                                    (
                                        !!!(val = commandObj[found]) || (
                                            Array.isArray(val) &&
                                            val.length == 0
                                        )
                                    )
                                );
                            }
                            break;
                        }
                        default:
                            correct = !1;
                            console.error(new Error(`Unrecognized operator(${key}) detected!`));
                            break;
                    }
                }
                return correct;
            })) {
                console.log(`${padLeft(++filteredCount)}. ${commandObj.filename.replace(/.js$/, '')} [${Object.keys(commandObj).length == 1 ? 'Under Developing...' : 'ERROR'}]`);
                return !1;
            }

            if (commandObj.disabled) {
                console.log(`${padLeft(++filteredCount)}. ${commandObj.filename.replace(/.js$/, '')} [Disabled]`);
                return !1;
            }
            return !0;
        });

    if (filteredCount == commandCount) {
        console.log(`${padLeft("", !1)}No command is work.`);
        return [];
    }
    //#endregion

    //#region Add commands to bot
    filenames.forEach((commandObj, i) => {
        if (commandCount == 1)
            console.log(`${padLeft("", !1)}${commandObj.filename.replace(/.js$/, '')}`);
        else
            console.log(`${padLeft(i + 1 + filteredCount)}. ${commandObj.filename.replace(/.js$/, '')}`);

        delete commandObj.filename;
        commandsList.push(commandObj);

        /*bot.onText(commandObj.regexp, (msg, match) => {
            if (!commandObj.chats.includes(msg.chat.id)) return;
            commandObj.handler.call(bot, ...[msg, match]);
        });*/
    });
    //#endregion

    if (commandsList.length) { //Create /commands
        let commandName = 'commands';
        commandsList.push({
            name: commandName,
            regexp: new RegExp(`\/${commandName}\s*`, 'i'),
            runAllChat: !0,
            handler: function (msg) {
                let tab = '   ';
                let message =
                    `Komut Listesi:\n${tab}` +
                    commandsList
                        .slice(0, commandsList.length - 1)
                        .filter(obj =>
                            Array.isArray(obj.chats) ?
                                obj.chats.includes(msg.chat.id) :
                                msg.chat.type == 'private' ?
                                    !0 :
                                    !obj.runOnlyPrivateChat
                        )
                        .map(obj =>
                            `/${obj.name}` +
                            (obj.description ? ` - ${obj.description}` : '') +
                            (obj.runOnlyPrivateChat ? ' [only private chat]' : '')
                        ).join(`\n${tab}`);
                this.sendMessage(msg.chat.id, message); //this represents to bot
            }
        });
    }

    return commandsList;
};