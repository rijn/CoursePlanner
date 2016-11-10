// get arguments

var arguments = process.argv.splice(2);
console.log(arguments);

const util = require('./util');
var config = util.getConfig();

console.log('User config = ', config);

// include dependencies

const Q = require('q');
const colors = require('colors');

util.colorSetTheme(colors);

var sharedObject = {
    'cookie': []
};

var login = require('./login');
var studentInfo = require('./studentInfo');
var course = require('./course');

console.log('\nrunning...'.warn);

switch (arguments[0]) {
    case 'getstudentinfo':
        login.login(sharedObject)
            .then(studentInfo.getStudentInfoTermList)
            .then(studentInfo.requestStudentInfo)
            .then(null, util.throwErr)
            .done();
        break;
    case 'getcourselist':
        login.login(sharedObject)
            .then(studentInfo.getStudentInfoTermList)
            .then(course.getSubjectList)
            .then(course.getCourseList)
            .then(course.parseCourseList)
            .then(course.writeTree)
            .then(course.generateCourseCodeList)
            .then(null, util.throwErr)
            .done();
        break;
}
