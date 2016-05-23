const https = require('https');
const Q = require('q');
const querystring = require('querystring');
const colors = require('colors');

const util = require('./util');
var config = util.getConfig();

util.colorSetTheme(colors);

module.exports = {

    getStudentInfoTermList: function(sharedObject) {
        var deferred = Q.defer();

        var options = {
            hostname: 'ui2web1.apps.uillinois.edu',
            port: 443,
            path: '/BANPROD1/bwskgstu.P_StuInfo',
            method: 'GET',
            headers: {
                'Host': 'ui2web1.apps.uillinois.edu',
                'Upgrade-Insecure-Requests': 1,
                'Cookie': sharedObject.cookie.join(';'),
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
                util.combineCookies(res.headers['set-cookie'], sharedObject);
                // console.log('DATA'.data, data.data);
                var regexp = /\<OPTION VALUE="([0-9]*)"\>([A-Za-z0-9\- ]*)\<\/OPTION\>/g;
                match_data = regexp.exec(data);
                console.log('\n', match_data[2].warn);
                data = match_data[1];
                sharedObject['termIn'] = data;
                deferred.resolve(sharedObject);
            });
        });
        req.end();

        req.on('error', (e) => {
            console.error(e);
        });

        return deferred.promise;
    },

    requestStudentInfo: function(sharedObject) {
        var deferred = Q.defer();

        var postData = querystring.stringify({
            'term_in': sharedObject['termIn'],
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
                'Cookie': sharedObject.cookie.join(';'),
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
                util.combineCookies(res.headers['set-cookie'], sharedObject);
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
                deferred.resolve(sharedObject);
            });
        });
        req.write(postData);
        req.end();

        req.on('error', (e) => {
            console.error(e);
        });

        return deferred.promise;
    }
};
