const name = "menu";
module.exports = {
    name,
    regexp: new RegExp(`^\/${name}\s*`, 'i'),
    description: 'This command for testing markup feature on tg.',
    handler: function (msg, match, initialize = !0) {
        let msgOpts = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Sol', callback_data: `${name}.left` },
                        { text: 'Orta', callback_data: `${name}.middle` },
                        { text: 'Sağ', callback_data: `${name}.right` }
                    ],
                    [
                        { text: 'İletişim', callback_data: `${name}.contact` },
                    ]
                ]
            }
        };
        let text = msg.chat.type=="private"?'Ana Menüden bir seçim yapabilirsiniz:':"Menüden bir seçim yapabilirsiniz:";
        if (initialize) {
            this.deleteMessage(msg.chat.id, msg.message_id);
            this.sendMessage(msg.chat.id, text, msgOpts);
        }
        else {
            this.editMessageText(text, Object.assign({ chat_id: msg.chat.id, message_id: msg.message_id }, msgOpts));
        }
    },
    mainMenu: {
        left: {
            handler: leftMenu
        },
        middle: {
            handler: middleMenu,
            methods: {
                sayHello
            }
        }
    }
}

function leftMenu(msg) {
    this.editMessageText('Sol menüden bir seçim yapınız:', {
        message_id: msg.message_id,
        chat_id: msg.chat.id,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Show commands', callback_data: '/commands' },
                ],
                [
                    { text: '« Back', callback_data: `${name}.mainMenu` },
                ]
            ]
        }
    });
}

function middleMenu(msg) {
    this.editMessageText('Orta menüden bir seçim yapınız:', {
        message_id: msg.message_id,
        chat_id: msg.chat.id,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Say Hello', callback_data: `${name}.middle.sayHello_` },
                ],
                [
                    { text: '« Back', callback_data: `${name}.mainMenu` },
                ]
            ]
        }
    });
}

function sayHello(msg) {
    this.sendMessage(
        msg.chat.id,
        'Hello Bro!'
    );
}