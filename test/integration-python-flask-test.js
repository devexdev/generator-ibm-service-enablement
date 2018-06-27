'use strict';
const optionsBluemix = Object.assign({}, require('./resources/bluemix.int.json'));
const assert = require('chai').assert;
const path = require('path');
const helpers = require('yeoman-test');
const PLATFORM = 'PYTHON';
const GENERATOR_PATH = '../generators/app/index.js';
const execRun = require('child_process').exec;
const spawn = require('child_process').spawn;
let server;
let initPy;

const fs = require('fs-extra');
const axios = require('axios');

// Change these if you're getting SSL-related problems
const pythonRuntime = 'python';
const pipRuntime = 'pip';

describe('integration test for services', function() {
	before(function(done) {
		this.timeout(30000);
		_setUpApplication(done);
	});

	after(function(done){
		_destroyApplication(done);
	});


	describe('Cloud-Object-Storage', function() {
		it('should be able to send input and receive a response', function() {
			this.timeout(10000);
			let expectedMessage = ['received response for cloud-object-storage'];
			let options = {
				'method': 'get',
				'url': 'http://localhost:5000/cloud-object-storage-test'
			};

			return axios(options)
				.then(function(response) {
					assert.deepEqual(response.data, expectedMessage);
				})
				.catch(function(err){
					if(err.response){
						assert.isNotOk(err.response.data, 'This should not happen');
					} else {
						console.log('ERR ' + err.toString());
						assert.isNotOk(err, 'This should not happen');
					}
				});
		});
	});
});

let _setUpApplication = function(cb){
	optionsBluemix.backendPlatform = PLATFORM;
	_generateApplication(function() {
		helpers
			.run(path.join(__dirname, GENERATOR_PATH))
			.inTmpDir(function (dir) {
				console.log('dir ' + dir);
				fs.copySync(path.join(__dirname, '/app/__init__.py'), dir + '/server/__init__.py');
			})
			.withOptions({
				bluemix: JSON.stringify(optionsBluemix)
			})
			.then((tmpDir) => {
				execRun(pipRuntime + ' install -r requirements.txt --user --upgrade', {cwd: tmpDir}, function(error, stdout, stderr){
					console.log(stderr);
					if(error){
						assert.isOk('Could not install dependencies ' + error);
					} else {
						console.log(stdout);
						server = spawn(pythonRuntime, ['-m', 'flask', 'run'], {cmd: tmpDir, env: {PATH: process.env.PATH,
							'FLASK_APP': 'server/__init__.py', 'LC_ALL':'en_US.UTF-8', 'LANG':'en_US.UTF-8'}});
						setTimeout(function(){
							cb();
						},5000);
						server.stderr.on('data', function(err) {
							console.error(err.toString('utf-8'));
							//assert.isNotOk(err.toString('utf-8'), 'This should not happen');
						});
						server.stdout.on('data', function(data){
							console.log(data.toString('utf-8'));
						});
					}
				});
			});
	});

};


let _destroyApplication = function(cb){
	if(server){
		server.kill();
	}
	fs.writeFileSync(path.join(__dirname, '/app/__init__.py'), initPy);
	cb();
};


let _generateApplication = function(cb) {
	const serviceNames = [ 'cloud-object-storage'];
	const REPLACE_CODE_HERE = '# GENERATE HERE';
	const REPLACE_SHUTDOWN_CODE_HERE = '# GENERATE SHUTDOWN';
	let snippetJS;
	let snippetShutdown;

	initPy = fs.readFileSync(path.join(__dirname, '/app/__init__.py'), 'utf-8');
	let copyInitPy = initPy;


	serviceNames.forEach(function(serviceName){
		snippetJS = fs.readFileSync(path.join(__dirname, '/app/' + serviceName + '/' + PLATFORM.toLowerCase() + '/__init__.py'), 'utf-8');
		snippetShutdown = '\t' + fs.readFileSync(path.join(__dirname, '/app/' + serviceName + '/' + PLATFORM.toLowerCase() + '/shutdown.py'), 'utf-8');
		snippetShutdown = snippetShutdown.replace(new RegExp('\n', 'g'), '\n\t'); // eslint-disable-line no-control-regex
		snippetJS+=('\n'+ REPLACE_CODE_HERE);
		snippetShutdown+=('\n' + REPLACE_SHUTDOWN_CODE_HERE);
		copyInitPy = copyInitPy.replace(REPLACE_CODE_HERE, snippetJS);
		copyInitPy = copyInitPy.replace(REPLACE_SHUTDOWN_CODE_HERE, snippetShutdown);
	});

	copyInitPy = copyInitPy.replace(REPLACE_CODE_HERE, "");
	copyInitPy = copyInitPy.replace(REPLACE_SHUTDOWN_CODE_HERE, "");

	fs.writeFileSync(path.join(__dirname, '/app/__init__.py'), copyInitPy);
	cb();
};
