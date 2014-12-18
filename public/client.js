$(document).ready(function documentReady () {

    var client = io();

    
    client.on('connect', onConnect);
    client.on('disconnect', onDisconnect);
    client.on('chat', chat_addToLog);
    client.on('joined', chat_joined);
    client.on('left', chat_left);

    $('#chat_input').on('keyup', function (event) {
        if (event.keyCode === 13) {
            chat_send();
        }
    });

    $('#chat_submit').on('click', function (event) {
        chat_send();
    });

    function chat_addToLog (displayName, msg) {
        // get the existing message
        var existing = $('#chat_log')[0].value;

        // and set the value to the existing chat content plus the new message at the end
        $('#chat_log')[0].value = existing + '\n' + new Date() + ' [' + displayName + ']: ' + msg;

        $('#chat_log')[0].scrollTop =    $('#chat_log')[0].scrollHeight;
        
    };

    function sysMsg (msg) {
        chat_addToLog('SYSTEM', msg);
    };

    function chat_joined (displayName) {
        sysMsg(displayName + ' joined');
    };

    function chat_left (displayName) {
        sysMsg(displayName + ' left');
    };

    function chat_send () {
        var msg = $('#chat_input')[0].value;
        client.send(msg);
        $('#chat_input')[0].focus();
        $('#chat_input')[0].select();
    };

    function enable_chat () {
        $('#chat_input').prop('disabled', false);
        $('#chat_submit').prop('disabled',false);
    };

    function disable_chat () {
        $('#chat_input').prop('disabled', true);
        $('#chat_submit').prop('disabled', true);
    };

    function onConnect () {
        var msg = 'connection established!';

        console.log(msg); 
        sysMsg(msg);
        enable_chat();

    };

    function onDisconnect () {
        var msg = 'connection lost!';

        console.log(msg)
        sysMsg(msg);

        disable_chat();    
    };

    function onError (err) {

        console.log(err);

        sysMsg(err);

    };

    function onChat (socketId, msg) {
        chat_addToLog(socketId, msg);
    };

});
