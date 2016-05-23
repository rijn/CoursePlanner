const http = require("http");
const https = require('https');
const Q = require('q');
const querystring = require('querystring');
const colors = require('colors');

var util = require('./util');
var config = util.getConfig();

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

module.exports = {

    // get status
    requestEAS: function(sharedObject) {
        var deferred = Q.defer();

        var options = {
            hostname: 'eas.admin.uillinois.edu',
            port: 443,
            path: '/eas/servlet/EasLogin?redirect=https://webprod.admin.uillinois.edu/ssa/servlet/SelfServiceLogin?appName=edu.uillinois.aits.SelfServiceLogin&dad=BANPROD1',
            method: 'GET',
            headers: {
                'Host': 'eas.admin.uillinois.edu',
                'Upgrade-Insecure-Requests': 1,
                'Cookie': sharedObject.cookie.join(';'),
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
                util.combineCookies(res.headers['set-cookie'], sharedObject);
                // console.log('cookie : ', cookie);
                deferred.resolve(sharedObject);
            });
        });
        req.end();

        req.on('error', (e) => {
            console.error(e);
        });

        return deferred.promise;
    },

    // login through EAS
    loginEAS: function(sharedObject) {
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
                'Cookie': sharedObject.cookie.join(';'),
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
                util.combineCookies(res.headers['set-cookie'], sharedObject);
                // console.log('No more data in response.')
                deferred.resolve(sharedObject);
            })
        });

        req.on('error', (e) => {
            console.log(`problem with request: ${e.message}`);
        });

        // write data to request body
        req.write(postData);
        req.end();

        return deferred.promise;
    },

    // get status
    loginSelfService: function(sharedObject) {
        var deferred = Q.defer();

        var options = {
            hostname: 'webprod.admin.uillinois.edu',
            port: 443,
            path: '/ssa/servlet/SelfServiceLogin?appName=edu.uillinois.aits.SelfServiceLogin&dad=BANPROD1',
            method: 'GET',
            headers: {
                'Host': 'webprod.admin.uillinois.edu',
                'Upgrade-Insecure-Requests': 1,
                'Cookie': sharedObject.cookie.join(';'),
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
                util.combineCookies(res.headers['set-cookie'], sharedObject);
                console.log('redirect location'.result, res.headers['location']);
                sharedObject.location = res.headers['location'];
                deferred.resolve(sharedObject);
            });
        });
        req.end();

        req.on('error', (e) => {
            console.error(e);
        });

        return deferred.promise;
    },

    checkLoginStatus: function(sharedObject) {
        var deferred = Q.defer();
        for (var i in sharedObject.cookie) {
            if (sharedObject.cookie[i].indexOf('ApplicationSessionId') == 0 && sharedObject.hasOwnProperty('location')) {
                console.log('\ngot session id, login successfully.'.warn);
                deferred.resolve(sharedObject);
            }
        }
        deferred.reject('login failed.');
        return deferred.promise;
    },

    loginUiauthent: function(sharedObject) {
        var deferred = Q.defer();

        var location = sharedObject['location'];
        location = location.substring(8);

        var options = {
            hostname: location.split('/')[0],
            port: 443,
            path: location.substring(location.indexOf('/'), location.length),
            method: 'GET',
            headers: {
                'Host': 'ui2web1.apps.uillinois.edu',
                'Upgrade-Insecure-Requests': 1,
                'Cookie': sharedObject.cookie.join(';'),
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
                util.combineCookies(res.headers['set-cookie'], sharedObject);
                // console.log('DATA'.data, data.data);
                var regexp = /msg=([A-Za-z0-9.,+\-!%<>]*)"\>/g;
                match_data = regexp.exec(data);
                data = match_data[1].replace(/\+/g, ' ').replace(/<([a-zA-Z0-9%]*)>/g, ' ').replace('%3A', ':');
                console.log('MSG'.result, data);
                deferred.resolve(sharedObject);
            });
        });
        req.end();

        req.on('error', (e) => {
            console.error(e);
        });

        return deferred.promise;
    }
};
