
module.exports = (cb=()=>{}) => {
    process.stdin.resume(); //so the program will not close instantly

    async function exitHandler(options, exitCode) {
        console.log(options, exitCode);
        //Burada botun aktif olmadığına dair ana gruba mesaj atabiliriz
        //Yada botun durumunu, açıklamasını veya başka bir özelliğini değiştirerek çalışır olmadığını gösterebiliriz
        await cb();

        // if (options.cleanup) console.log('clean');
        // if (exitCode || exitCode === 0) console.log(exitCode);
        if (options.exit) process.exit();

    }

    //do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { exit: true }));

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
    process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

};