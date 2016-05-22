// Load user config

var defaultConfig = require('./config.default');
var config = defaultConfig;

try {
    var userConfig = require('./config');
} catch (e) {
    console.log('Could not find user config');
    return;
}

for (var i in defaultConfig) {
    if (userConfig.hasOwnProperty(i)) {
        config[i] = userConfig[i];
    }
}

console.log('User config = ', config);

// include dependencies

var http = require("http");
const https = require('https');
var Q = require('q');
var md5 = require('md5');
var querystring = require('querystring');
var colors = require('colors');

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red',
    request: 'cyan',
    result: 'green',
});

var cookie = [];

var combineCookies = function(newCookie) {
    if (newCookie) {
        for (var i = 0; i < newCookie.length; i++) {
            newCookie[i] = newCookie[i].split(';')[0];
        }
    }
    for (var i in newCookie) {
        var key = newCookie[i].split('=')[0];
        for (var j = 0; j < cookie.length; j++) {
            if (cookie[j].indexOf(key) >= 0) {
                cookie[j] = newCookie[i];
                key = 'COOKIEFLAG';
            }
        }
        if (key != 'COOKIEFLAG') {
            cookie.push(newCookie[i]);
        }
    }
}

// get status
function requestEAS(cookie) {
    var deferred = Q.defer();

    var options = {
        hostname: 'eas.admin.uillinois.edu',
        port: 443,
        path: '/eas/servlet/EasLogin?redirect=https://webprod.admin.uillinois.edu/ssa/servlet/SelfServiceLogin?appName=edu.uillinois.aits.SelfServiceLogin&dad=BANPROD1',
        method: 'GET',
        headers: {
            'Host': 'eas.admin.uillinois.edu',
            'Upgrade-Insecure-Requests': 1,
            'Cookie': cookie.join(';'),
            'User-Agent': 'Paw/2.1 (Macintosh; OS X/10.10.1) GCDHTTPRequest'
        }
    };

    console.log('\nREQUEST'.request, options.hostname + options.path);

    var req = https.request(options, (res) => {
        console.log('STATUS'.result, res.statusCode);
        if (config.debug) {
            console.log('HEADERS'.data, res.headers);
        }

        res.on('data', (d) => {
            // process.stdout.write(d);
        });

        res.on('end', () => {
            combineCookies(res.headers['set-cookie']);
            // console.log('cookie : ', cookie);
            deferred.resolve(cookie);
        });
    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });

    return deferred.promise;
}

// login through EAS
function loginEAS(cookie) {
    var deferred = Q.defer();

    var postData = querystring.stringify({
        'inputEnterpriseId': config.netID,
        'password': config.password,
        'querystring': null,
        'BTN_LOGIN': 'Login',
    });

    var options = {
        jar: true,
        hostname: 'eas.admin.uillinois.edu',
        port: 443,
        path: '/eas/servlet/login.do',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length,
            'Cookie': cookie.join(';'),
        }
    };

    console.log('\nREQUEST'.request, options.hostname + options.path);

    var req = https.request(options, (res) => {
        console.log('STATUS'.result, res.statusCode);
        if (config.debug) {
            console.log('HEADERS'.data, res.headers);
        }

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            // console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            combineCookies(res.headers['set-cookie']);
            // console.log('No more data in response.')
            deferred.resolve(cookie);
        })
    });

    req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
    });

    // write data to request body
    req.write(postData);
    req.end();

    return deferred.promise;
};

// get status
function loginSelfService(cookie) {
    var deferred = Q.defer();

    var options = {
        hostname: 'webprod.admin.uillinois.edu',
        port: 443,
        path: '/ssa/servlet/SelfServiceLogin?appName=edu.uillinois.aits.SelfServiceLogin&dad=BANPROD1',
        method: 'GET',
        headers: {
            'Host': 'webprod.admin.uillinois.edu',
            'Upgrade-Insecure-Requests': 1,
            'Cookie': cookie.join(';'),
            'User-Agent': 'Paw/2.1 (Macintosh; OS X/10.10.1) GCDHTTPRequest',
            'Referer': 'https://eas.admin.uillinois.edu/eas/servlet/EasLogin',
        }
    };

    console.log('\nREQUEST'.request, options.hostname + options.path);

    var req = https.request(options, (res) => {
        console.log('STATUS'.result, res.statusCode);
        if (config.debug) {
            console.log('HEADERS'.data, res.headers);
        }

        res.on('data', (d) => {
            // process.stdout.write(d);
        });

        res.on('end', () => {
            combineCookies(res.headers['set-cookie']);
            console.log('redirect location'.result, res.headers['location']);
            cookie['location'] = res.headers['location'];
            deferred.resolve(cookie);
        });
    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });

    return deferred.promise;
}

function checkLoginStatus(cookie) {
    var deferred = Q.defer();
    for (var i in cookie) {
        if (cookie[i].indexOf('ApplicationSessionId') == 0 && cookie.hasOwnProperty('location')) {
            console.log('\ngot session id, login successfully.'.warn);
            deferred.resolve(cookie);
        }
    }
    deferred.reject('login failed.');
    return deferred.promise;
}

function loginUiauthent(cookie) {
    var deferred = Q.defer();

    var location = cookie['location'];
    location = location.substring(8);

    var options = {
        hostname: location.split('/')[0],
        port: 443,
        path: location.substring(location.indexOf('/'), location.length),
        method: 'GET',
        headers: {
            'Host': 'ui2web1.apps.uillinois.edu',
            'Upgrade-Insecure-Requests': 1,
            'Cookie': cookie.join(';'),
            'User-Agent': 'Paw/2.1 (Macintosh; OS X/10.10.1) GCDHTTPRequest',
            'Referer': 'https://eas.admin.uillinois.edu/eas/servlet/EasLogin',
        }
    };

    console.log('\nREQUEST'.request, options.hostname + options.path);

    var data = '';

    var req = https.request(options, (res) => {
        console.log('STATUS'.result, res.statusCode);
        if (config.debug) {
            console.log('HEADERS'.data, res.headers);
        }

        res.on('data', (d) => {
            data += d;
            // process.stdout.write(d);
        });

        res.on('end', () => {
            combineCookies(res.headers['set-cookie']);
            // console.log('DATA'.data, data.data);
            var regexp = /msg=([A-Za-z0-9.,+\-!%<>]*)"\>/g;
            match_data = regexp.exec(data);
            data = match_data[1].replace(/\+/g, ' ').replace(/<([a-zA-Z0-9%]*)>/g, ' ').replace('%3A', ':');
            console.log('MSG'.result, data);
            deferred.resolve(cookie);
        });
    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });

    return deferred.promise;
}

function getStudentInfoTermList(cookie) {
    var deferred = Q.defer();

    var options = {
        hostname: 'ui2web1.apps.uillinois.edu',
        port: 443,
        path: '/BANPROD1/bwskgstu.P_StuInfo',
        method: 'GET',
        headers: {
            'Host': 'ui2web1.apps.uillinois.edu',
            'Upgrade-Insecure-Requests': 1,
            'Cookie': cookie.join(';'),
            'User-Agent': 'Paw/2.1 (Macintosh; OS X/10.10.1) GCDHTTPRequest',
            'Referer': 'https://ui2web1.apps.uillinois.edu/BANPROD1/twbkwbis.P_GenMenu?name=bmenu.P_AdminMnu',
        }
    };

    console.log('\nREQUEST'.request, options.hostname + options.path);

    var data = '';

    var req = https.request(options, (res) => {
        console.log('STATUS'.result, res.statusCode);
        if (config.debug) {
            console.log('HEADERS'.data, res.headers);
        }

        res.on('data', (d) => {
            data += d;
            // process.stdout.write(d);
        });

        res.on('end', () => {
            combineCookies(res.headers['set-cookie']);
            // console.log('DATA'.data, data.data);
            var regexp = /\<OPTION VALUE="([0-9]*)"\>([A-Za-z0-9\- ]*)\<\/OPTION\>/g;
            match_data = regexp.exec(data);
            console.log('\n', match_data[2].warn);
            data = match_data[1];
            cookie['termIn'] = data;
            deferred.resolve(cookie);
        });
    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });

    return deferred.promise;
}

function requestStudentInfo(cookie) {
    var deferred = Q.defer();

    var postData = querystring.stringify({
        'term_in': cookie['termIn'],
    });

    var options = {
        hostname: 'ui2web1.apps.uillinois.edu',
        port: 443,
        path: '/BANPROD1/bwskgstu.P_StuInfo',
        method: 'POST',
        headers: {
            'Host': 'ui2web1.apps.uillinois.edu',
            'Origin': 'https://ui2web1.apps.uillinois.edu',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Upgrade-Insecure-Requests': 1,
            'Cookie': cookie.join(';'),
            'User-Agent': 'Paw/2.1 (Macintosh; OS X/10.10.1) GCDHTTPRequest',
            'Referer': 'https://ui2web1.apps.uillinois.edu/BANPROD1/bwskgstu.P_StuInfo',
            'Content-Length': postData.length,
        }
    };

    console.log('\nREQUEST'.request, options.hostname + options.path);

    var data = '';

    var req = https.request(options, (res) => {
        console.log('STATUS'.result, res.statusCode);
        if (config.debug) {
            console.log('HEADERS'.data, res.headers);
        }

        res.on('data', (d) => {
            data += d;
            // process.stdout.write(d);
        });

        res.on('end', () => {
            combineCookies(res.headers['set-cookie']);
            data = data.replace(/([\r\n]*)/g, '').replace(/\<TR\>/g, '~').replace(/\<\/TR\>/g, '`');
            // console.log('DATA'.data, data.data);
            var match_data = data.match(/~([A-Za-z0-9\s=\":\\\/\-\(\)<>,&]*)`/g);
            for (var i = 0; i < match_data.length; i++) {
                match_data[i] = match_data[i].replace(/~\<TH CLASS=\"ddlabel\" scope=\"row\" \>/g, '')
                    .replace(/\<\/TD\>`/g, '')
                    .replace(/\<\/TH\>`/g, '')
                    .replace(/~\<TH COLSPAN=\"2\" CLASS=\"ddlabel\" scope=\"row\" \>/g, '\n')
                    .replace(/~\<TH COLSPAN=\"1\" CLASS=\"ddlabel\" scope=\"row\" \>/g, '')
                    .replace(/~\<TD COLSPAN=\"2\" CLASS=\"dddefault\"\>/g, '')
                    .replace(/\<\/TH\>\<TD CLASS=\"dddefault\"\>/g, ' ')
                    .replace(/\<\/TH\>\<TD COLSPAN=\"1\" CLASS=\"dddefault\"\>/g, ' ');
            }
            console.log('\nstudent info'.warn);
            console.log(match_data.join('\n'));
            deferred.resolve(cookie);
        });
    });
    req.write(postData);
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });

    return deferred.promise;
}

console.log('\nrunning...'.warn);

requestEAS(cookie)
    .then(loginEAS)
    .then(loginSelfService)
    .then(checkLoginStatus)
    .then(loginUiauthent)
    .then(getStudentInfoTermList)
    .then(requestStudentInfo)
    .then(
        function(cookie) {
            if (config.debug) {
                console.log('\ncookie:', cookie);
            }
        },
        function(err) {
            console.log('\n', err.error);
            throw err;
        }
    );
