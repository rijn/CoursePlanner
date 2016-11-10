const https = require('https');
const Q = require('q');
const querystring = require('querystring');
const colors = require('colors');
const htmlparser = require("htmlparser2");
const fs = require('fs');

const util = require('./util');
var config = util.getConfig();

util.colorSetTheme(colors);

module.exports = {

    getSubjectList: function(sharedObject) {
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
                util.combineCookies(res.headers['set-cookie'], sharedObject);
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
    },

    getCourseList: function(sharedObject) {
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
                    util.combineCookies(res.headers['set-cookie'], sharedObject);
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
    },

    parseCourseList: function(sharedObject) {
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
    },

    writeTree: function(sharedObject) {
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
    },

    generateCourseCodeList: function(sharedObject) {
        var deferred = Q.defer();

        var data = '';

        for (var i = 0; i < sharedObject.courseTree.length; i++) {
            var subject = sharedObject.courseTree[i].code;
            data += sharedObject.courseTree[i].code + ' ' + sharedObject.courseTree[i].subject + '\n';
            for (var j = 0; j < sharedObject.courseTree[i].courses.length; j++) {
                data += '\t' + subject + (sharedObject.courseTree[i].courses[j].course.match(/([0-9]{3})/))[1] + '[ ] ' + sharedObject.courseTree[i].courses[j].course + '\n';
            }
        }

        fs.writeFile('courseCode.temp', data, (err) => {
            if (err) {
                deferred.reject(err)
            };
            console.log('\ncourse code generated'.result);
            deferred.resolve(sharedObject);
        });


        deferred.resolve(sharedObject);

        return deferred.promise;
    },

};
