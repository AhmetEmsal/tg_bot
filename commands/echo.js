const name = "echo";
module.exports = {
    name,
    regexp: new RegExp(`\/${name}( .+)?`, 'i'),
    description: 'This command for checking whether the bot active or inactive.',
    handler: function (msg, match) {
        const message = match[1] || "Echo echo...";
        this.sendMessage(msg.chat.id, message); //this represents to bot
    }
}