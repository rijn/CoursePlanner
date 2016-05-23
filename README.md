# CoursePlanner
for UIUC

### Environment
```
# install node and npm first

# install the dependencies
$ npm install
```

### How
1. Duplicate the `config.default.js` and rename it into `config.js`. Modify the information.
```
module.exports = {
    netID: '',          // Type in your NetID here
    password: '',       // Your password
    debug: false
}
```

2. Run `npm start getcourselist`