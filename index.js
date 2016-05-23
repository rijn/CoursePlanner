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

var sharedObject = {
    'cookie': []
};

var combineCookies = function(newCookie) {
    if (newCookie) {
        for (var i = 0; i < newCookie.length; i++) {
            newCookie[i] = newCookie[i].split(';')[0];
        }
    }
    for (var i in newCookie) {
        var key = newCookie[i].split('=')[0];
        for (var j = 0; j < sharedObject.cookie.length; j++) {
            if (sharedObject.cookie[j].indexOf(key) >= 0) {
                sharedObject.cookie[j] = newCookie[i];
                key = 'COOKIEFLAG';
            }
        }
        if (key != 'COOKIEFLAG') {
            sharedObject.cookie.push(newCookie[i]);
        }
    }
}

// get status
function requestEAS(sharedObject) {
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
            combineCookies(res.headers['set-cookie']);
            // console.log('cookie : ', cookie);
            deferred.resolve(sharedObject);
        });
    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });

    return deferred.promise;
}

// login through EAS
function loginEAS(sharedObject) {
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
            combineCookies(res.headers['set-cookie']);
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
};

// get status
function loginSelfService(sharedObject) {
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
            combineCookies(res.headers['set-cookie']);
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
}

function checkLoginStatus(sharedObject) {
    var deferred = Q.defer();
    for (var i in sharedObject.cookie) {
        if (sharedObject.cookie[i].indexOf('ApplicationSessionId') == 0 && sharedObject.hasOwnProperty('location')) {
            console.log('\ngot session id, login successfully.'.warn);
            deferred.resolve(sharedObject);
        }
    }
    deferred.reject('login failed.');
    return deferred.promise;
}

function loginUiauthent(sharedObject) {
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
            combineCookies(res.headers['set-cookie']);
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

function getStudentInfoTermList(sharedObject) {
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
            combineCookies(res.headers['set-cookie']);
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
}

function requestStudentInfo(sharedObject) {
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

function getSubjectList(sharedObject) {
    var deferred = Q.defer();

    var postData = querystring.stringify({
        'p_term': sharedObject['termIn'],
        'p_calling_proc': 'P_CrseSearch',
    });

    var options = {
        hostname: 'ui2web1.apps.uillinois.edu',
        port: 443,
        path: '/BANPROD1/bwckgens.p_proc_term_date',
        method: 'POST',
        headers: {
            'Host': 'ui2web1.apps.uillinois.edu',
            'Origin': 'https://ui2web1.apps.uillinois.edu',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Upgrade-Insecure-Requests': 1,
            'Cookie': sharedObject.cookie.join(';'),
            'User-Agent': 'Paw/2.1 (Macintosh; OS X/10.10.1) GCDHTTPRequest',
            'Referer': 'https://ui2web1.apps.uillinois.edu/BANPROD1/bwskfcls.p_sel_crse_search',
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
            // console.log('DATA'.data, data.data);
            var match_data = data.match(/\<OPTION VALUE=\"([A-Z]*)\"\>([a-zA-Z0-9.,'\/&\-\s]*)\<\/OPTION\>/g);
            var subjectList = [];
            for (var i = 0; i < match_data.length; i++) {
                var item = match_data[i].replace('<OPTION VALUE="', '')
                    .replace('</OPTION>', '').split('">');
                subjectList[item[0]] = item[1];
            }
            console.log(('\ngot ' + i + ' subjects').warn);
            // console.log(subjectList);
            sharedObject['subjectList'] = subjectList;
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

var fs = require('fs');

function getCourseList(sharedObject) {
    var deferred = Q.defer();

    if (fs.existsSync('requestCourseList.temp')) {
        fs.readFile('requestCourseList.temp', (err, data) => {
            if (err) {
                deferred.reject(err);
            };
            sharedObject.courseRawData = data;
            console.log('\nresult loaded'.result);
            deferred.resolve(sharedObject);
        });
    } else {

        var postData = querystring.stringify({
            'rsts': 'dummy',
            'crn': 'dummy',
            'term_in': sharedObject['termIn'],
            'sel_subj': 'dummy',
            'sel_day': 'dummy',
            'sel_schd': 'dummy',
            'sel_insm': 'dummy',
            'sel_camp': 'dummy',
            'sel_levl': 'dummy',
            'sel_sess': 'dummy',
            'sel_instr': 'dummy',
            'sel_ptrm': 'dummy',
            'sel_attr': 'dummy',
            'sel_crse': '',
            'sel_title': '',
            'sel_from_cred': '',
            'sel_to_cred': '',
            'sel_ptrm': '%',
            'begin_hh': '0',
            'begin_mi': '0',
            'end_hh': '0',
            'end_mi': '0',
            'begin_ap': 'x',
            'end_ap': 'y',
            'path': '1',
            'SUB_BTN': 'Course Search',
        });

        for (var i in sharedObject['subjectList']) {
            postData += '&sel_subj=' + i;
        }

        var options = {
            hostname: 'ui2web1.apps.uillinois.edu',
            port: 443,
            path: '/BANPROD1/bwskfcls.P_GetCrse',
            method: 'POST',
            headers: {
                'Host': 'ui2web1.apps.uillinois.edu',
                'Origin': 'https://ui2web1.apps.uillinois.edu',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Upgrade-Insecure-Requests': 1,
                'Cookie': sharedObject.cookie.join(';'),
                'User-Agent': 'Paw/2.1 (Macintosh; OS X/10.10.1) GCDHTTPRequest',
                'Referer': 'https://ui2web1.apps.uillinois.edu/BANPROD1/bwckgens.p_proc_term_date',
                'Content-Length': postData.length,
            }
        };

        console.log('\nREQUEST'.request, options.hostname + options.path);
        // console.log('post data'.data, postData);

        var data = '';

        var req = https.request(options, (res) => {
            console.log('STATUS'.result, res.statusCode);
            if (config.debug) {
                console.log('HEADERS'.data, res.headers);
            }

            var contentLength = res.headers['content-length'];

            res.on('data', (d) => {
                data += d;
                process.stdout.write("Downloading " + data.length + " bytes ");
                for (var i = 0; i < 20; i++) {
                    if (i / 20 < data.length / contentLength) {
                        process.stdout.write("▓");
                    } else {
                        process.stdout.write("▓".gray);
                    }
                }
                process.stdout.write("\r");
                // process.stdout.write(d);
            });

            res.on('end', () => {
                combineCookies(res.headers['set-cookie']);
                // console.log('DATA'.data, data.data);
                sharedObject.courseRawData = data;
                fs.writeFile('requestCourseList.temp', data, (err) => {
                    if (err) {
                        deferred.reject(err)
                    };
                    console.log('\nresult saved'.result);
                    deferred.resolve(sharedObject);
                });
            });
        });


        req.write(postData);
        req.end();

        req.on('error', (e) => {
            console.error(e);
        });

    }

    return deferred.promise;
}


var util = require('util');
var htmlparser = require("htmlparser2");

function parseCourseList(sharedObject) {
    var deferred = Q.defer();
    console.log(('\ncourse raw data length = ' + sharedObject.courseRawData.length).data);

    var tree = [];
    var recordText = false;
    var targetSubject = -1;
    var targetCourse = -1;
    var stackTags = [];
    var level = 0;
    var tempText = [];

    var parser = new htmlparser.Parser({
        onopentag: function(name, attribs) {
            level++;
            stackTags[level] = name;
            if (level === 6 && name === 'th' && attribs.class === 'ddheader') {
                targetSubject++;
                targetCourse = -1;
                tree[targetSubject] = {
                    subject: '',
                    courses: [],
                };
                recordText = true;
            }
            if (level === 5 && name === 'td') {
                // targetCourse++;
            }
            if (level === 6 && name === 'form') {
                targetCourse++;
                tree[tree.length - 1].courses[targetCourse] = {};
                // tree[tree.length - 1].courses[targetCourse].course = tempText[2] + ' ' + tempText[3];
                tree[tree.length - 1].courses[targetCourse].course = tempText.join(' ').replace(/\n/g, '').replace(/(^\s*)|(\s*$)/g, "").replace(/\s+/g, ' ');
                tree[tree.length - 1].courses[targetCourse].form = {};
                tempText = [];
            }
            if (level === 7 && stackTags[7] === 'input') {
                tree[tree.length - 1].courses[targetCourse].form[attribs.name] = attribs.value;
            }
            // console.log(level, name.request, attribs);
        },
        ontext: function(text) {
            if (level === 6 && stackTags[6] === 'th') {
                if (text) {
                    tree[tree.length - 1].subject += text;
                };
                // recordText = false;
            }
            if (level === 5 && stackTags[5] === 'td') {
                tempText.push(text);
            }

            // console.log("-->", text);
        },
        onclosetag: function(tagname) {
            level--;
            // console.log(tagname.green);
        },
        onend: function() {
            for (var i = 0; i < tree.length; i++) {
                for (var j in sharedObject['subjectList']) {
                    if (sharedObject['subjectList'][j] === tree[i].subject) {
                        tree[i].code = j;
                    }
                }
            }
            sharedObject.courseTree = tree;
            deferred.resolve(sharedObject);
            // console.log(util.inspect(tree, { showHidden: false, depth: null }));
        },
    }, { decodeEntities: true });
    parser.write(sharedObject.courseRawData);
    parser.end();

    return deferred.promise;
}

function writeTree(sharedObject) {
    var deferred = Q.defer();

    var data = '';

    for (var i = 0; i < sharedObject.courseTree.length; i++) {
        data += sharedObject.courseTree[i].code + ' ' + sharedObject.courseTree[i].subject + '\n';
        for (var j = 0; j < sharedObject.courseTree[i].courses.length; j++) {
            data += '\t' + sharedObject.courseTree[i].courses[j].course + '\n';
        }
    }

    // data = JSON.stringify(sharedObject.courseTree);

    fs.writeFile('courseTree.temp', data, (err) => {
        if (err) {
            deferred.reject(err)
        };
        console.log('\ncourse tree saved'.result);
        deferred.resolve(sharedObject);
    });

    return deferred.promise;
}

function generateTreeQueryList(sharedObject) {
    var deferred = Q.defer();

    deferred.resolve(sharedObject);

    return deferred.promise;
}

console.log('\nrunning...'.warn);

requestEAS(sharedObject)
    .then(loginEAS)
    .then(loginSelfService)
    .then(checkLoginStatus)
    .then(loginUiauthent)
    .then(getStudentInfoTermList)
    .then(requestStudentInfo)
    .then(getSubjectList)
    .then(getCourseList)
    .then(parseCourseList)
    .then(writeTree)
    .then(
        function(sharedObject) {
            if (config.debug) {
                // console.log('\ncookie:', sharedObject.cookie);
            }
        },
        function(err) {
            console.log('\n', err.error);
            throw err;
        }
    );
