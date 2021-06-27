/*
  Author: Ahmet Emsal
*/


const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api'); //Api: https://github.com/yagop/node-telegram-bot-api/blob/master/doc/api.md
require('dotenv').config(); //For setup .env configuration file
const path = require('path'); //Built-in modules


let ignoredChats = [],
    commandsList = [],
    botProps = {};


(async function main() {
    console.clear();

    if(false){ //Database connection
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useFindAndModify: false,
                useCreateIndex: true
            });
        }
        catch (err) {
            console.error(err);
            process.exit(1);
        }
    }

    let bot;
    { // Create a bot that uses 'polling' to fetch new updates
        bot = new TelegramBot(process.env.BOT_TOKEN, { polling: !0 });
        if (false) { // Detect bot is closed
            require('./scripts/detectBotClosed.js')(async () => { //When app is closed, this cb function will be called
                // await bot.sendMessage(process.env.BOT_DEVELOPER_PRIVATE_CHAT_ID, 'Bot inaktif');
                console.log('Bot inaktif!');
            });

            // /*For Test: */ setTimeout(() => { throw new Error('Test'); }, 1000);
        }
        bot.on("polling_error", console.log);
        botProps = await bot.getMe();

        // bot.deleteHistory = function (form = {}) {
        //     return bot._request('deleteHistory', { form });
        // };
    }

    //Add all commands in commands directory
    commandsList = require('./scripts/addCommands2Bot.js')({
        folderPath: path.join(__dirname, 'commands')
    });
    bot.setMyCommands(commandsList.map(command => {
        if(!command.name) console.log(command);
        return { command: command.name, description: command.description || 'no dept.' };
    })).then(res => {
        console.log('Bot komutları set edildi. res: %o', res);
    }).catch(err => console.log(err.message));

    if (Array.isArray(commandsList) && commandsList.length) {

        //Listen message..
        bot.on('message', messageReciver);
        console.log(`@${botProps.username} listening messages for ${commandsList.length} command(s)(${commandsList.map(c=>c.name).join(',')})!`);

        //Handle callback queries
        bot.on('callback_query', onCallbackQuery)

    }
    else {
        console.info('Hiç komut yok!');
    }

    // bot.sendMessage(process.env.BOT_DEVELOPER_PRIVATE_CHAT_ID, 'Bot aktif');

})();

const isCommand = text =>
    text[0] == '/' && //Commands starts with / symbol
    text.substr(0, 4).length == 4; //Min command message length is 4 , exp: /hey

const parseCommandMsg = text => {
    let res = text.match(/^\s*(?<commandName>\/[^\s@]+)(?<username>@[\S]+(?:_bot|Bot))?(?:\s+(?<query>.+))?\s*$/);
    if (res === null || !res.groups || !res.groups.commandName) {
        console.error('Komut metni parçalanamadı!');
        return !1;
    }
    //exp: msg.text: /echo@TestBot Hello World!
    //     res.groups.commandName = '/echo'
    //     res.groups.username    = '@TestBot'
    //     res.groups.query       = 'Hello World!'
    return res.groups;
}
const isCommandForAnotherBot = matchGroups => {
    if (matchGroups.username && matchGroups.username != `@${botProps.username}`) {
        console.log('Bu komut başka bir bot için: ' + matchGroups.username);
        return !0;
    }
    return !1;
}

function messageReciver(msg) {
    let chatId, matchGroups;
    if (
        !isCommand(msg.text) || //If message isn't command
        ignoredChats.includes(chatId = msg.chat.id) || //Or channel of message is ignored
        !(matchGroups = parseCommandMsg(msg.text)) || //Or parsing of command message wasn't successful
        isCommandForAnotherBot(matchGroups) //Or command message like '/echo@another_bot'
    ) return;

    let { commandName, query = '' } = matchGroups,
        privateChat = msg.chat.type == 'private',
        bot = this;

    query = query.replace(/\s+$/, '');

    // /*For Testing: */console.log(`'${commandName}'`, `'${query}'`);

    if (commandName == '/start') {
        bot.deleteMessage(chatId, msg.message_id);
        bot.sendMessage(
            chatId,
            'Bot başlatıldı!\nTüm komutları görmek için: /commands'
        );
        return;
    }

    //Find Command
    let match;
    let commandObj = commandsList.find(obj => (match = msg.text.match(obj.regexp)) !== null);
    if (!commandObj)
        return bot.sendMessage(chatId, `Tanınmayan bir komut girdiniz.\nKomutları listemelek için:\n/commands`);
    else if (commandObj.runOnlyPrivateChat) {
        if (!privateChat) //If command must be run only private chat but channel that message sended isn't private
            return bot.sendMessage(chatId,`Bu komut sadece private sohbetlerde kullanılabilir.` )
    }
    else if (!commandObj.runAllChat && !commandObj.chats.includes(chatId)) //Or command doesn't work in channel that message sended
        return bot.sendMessage(chatId, `Bu komut bu kanalda kullanılamaz.\nBu kanalda kullanabileceğiniz komutları listemelek için:\n/commands`);


    let correctUsage = commandObj.handler.call(bot, msg, match) || true;
    if (!correctUsage) {
        //show correct usage...
    }
}

function onCallbackQuery(callbackQuery) {
    let { data: action, message: msg } = callbackQuery,
        { chat: { id: chat_id }, message_id } = msg,
        msgOpts = { chat_id, message_id },
        bot = this;

    const giveError = text => { //when callback is failed
        let start = 'Butona(';
        let errMsg = `${start}${action}) tıklanarak ${text} Lütfen geliştiriciye bildirin.`;
        bot.editMessageText(
            `<i>${errMsg}</i>\n\n` +
            (
                msg.text.substr(0, start.length) != start ?
                    msg.text :
                    msg.text.substr(msg.text.indexOf('\n') + 2)
            )
            ,
            Object.assign(msgOpts, {
                parse_mode: "html",
                reply_markup: msg.reply_markup
            })
        ).catch(err => console.error('Maybe same text err: ' , err.message));
        this.answerCallbackQuery(callbackQuery.id, "Failed...");
    };


    let idx = action.indexOf('.');
    if (idx != -1) { //Command Menu , exp of action: markup.rightMenu or markup.middle.sayHello_    | Format: {commandName}[.(menu|method$)]^+

        let commandName = action.substr(0, idx),
            menuPath = action.substr(idx + 1).trim();

        let command = commandsList.find(command => command.name == commandName);
        if (command == null) return giveError(`gidilecek menü(${menuPath})'ye sahip komut bulunamadı!`);

        if (!command.hasOwnProperty('mainMenu')) return giveError(`gidilecek menü(${menuPath})'ye sahip komudun mainMenu property'si yok!`);

        let method = null;
        if (menuPath == "mainMenu") {
            command.handler.call(/*bot*/this, /*msg obj*/msg, /*match*/null, /*initialize*/!1);
            this.answerCallbackQuery(callbackQuery.id);
            return;
        } else if (menuPath.split('.').slice(-1)[0].endsWith('_')) {
            method = menuPath.split('.').slice(-1)[0].replace(/_$/, '');
            menuPath = menuPath.substring(0, menuPath.lastIndexOf('.'));
        }

        let handler;
        try {
            let res = eval("command.mainMenu." + menuPath),
                resType = typeof res;

            if (method != null) { //Run menu method
                if (resType == 'undefined') return giveError(`çalıştırılmak istenen menü metodunu içeren menü(${menuPath}), menü listesinde bulunamadı!`);
                if (resType != 'object') return giveError(`çalıştırılmak istenen menü methodunu(${method}) içeren menü(${menuPath}), obje formatında olmalıydı!`);
                if (!res.hasOwnProperty('methods')) return giveError(`çalıştırılmak istenen menü methodunu(${method}) içeren menü(${menuPath})'nün methods property'si olmalıydı!`);

                let methodHandler = res.methods[method];
                if (typeof methodHandler != 'function') return giveError(`çalıştırılmak istenen metod(${method}) bulunduğu menü(${menuPath})'de ${typeof methodHandler == 'undefined' ? 'bulunamadı' : 'yanlış formattaydı'}!`);
                method = methodHandler;
            }
            else { //Open menu
                if (resType == 'undefined') return giveError(`açılması istenen menü(${menuPath}), menü listesinde bulunamadı!`);

                handler = resType == 'object' ? res.handler : res;
                if (typeof handler != 'function') return giveError(`gidilecek menuye(${menuPath}) ait yakalayıcı ${resType == "object" ? "bulunamadı" : "yanlış formata sahip"}!`);
            }


        }
        catch (err) {
            console.info(err);
            if (method) giveError(`çalıştırılmak istenen menü metodu(${method})'nu içeren menü(${menuPath}), menü listesinde bulunamadı!`);
            else giveError(`gidilecek menü(${menuPath}), menü listesinde bulunamadı!`);
            return;
        }

        if (handler || method) {
            (handler || method).call(/*bot*/this, /*msg obj*/msg, /*match*/null);
            this.answerCallbackQuery(callbackQuery.id);
            return;
        }
    }
    else { //Command
        let commandQuery = action; //exp: /commands
        msg.text = commandQuery;
        let match,
            command = commandsList.find(obj => (match = commandQuery.match(obj.regexp)) !== null);
        if (command == null) return giveError(`çalıştırılmak istenen komut(${command}), komut listesinde bulunamadı!`);
        else if (command.runOnlyPrivateChat) {
            if (!privateChat) return giveError(`çalıştırılmak istenen komut(${command}) sadece özel sohbette çalışmaktadır!`);
        }
        else if (!command.runAllChat && !command.chats.includes(msg.chat.id)) return giveError(`çalıştırılmak istenen komut(${command}) bu kanalda kullanılamaz!`);

        command.handler.call(bot, msg, match);
        this.answerCallbackQuery(callbackQuery.id);
        return;
    }

    this.answerCallbackQuery(callbackQuery.id, 'Buton yakalayıcı bulunamadı.'); //Fail
    // bot.editMessageText(
    //     msg.text +
    //     '\n<i>Buton yakalayıcı bulunamadı.</i>',
    //     Object.assign(msgOpts, {
    //         parse_mode: 'html'
    //     })
    // );
}