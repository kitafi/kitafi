var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');
var uuid = require('uuid/v4');
var chalk = require('chalk');

// Store template strings
var template = {};
var partial = {};

// The build directory
var build = require('./build.json');
build.path = path.join(__dirname, '..', build.directory);

// Caches all JSON data
var data = {};

function error(message) {
	console.log(chalk.red('Error: ') + message);
}

function success(message, label) {
	console.log(chalk.green((label || 'Success') + ': ') + message);
}

// Renders a given file with the given template
function render(templateName, fileName) {
	if (fileName == '.DS_Store') return;

	templateName = path.basename(templateName, '.html');

	// Read the file
	fs.readFile(path.join(__dirname, templateName, fileName), 'utf8', function(readError, content) {
		// If the file couldn't be read
		if (readError)
			error('Could not read ' + templateName + ' ' + fileName);

		// Parse the JSON contents of the file and render them
		else {
			try {
				// Get the JSON and pass it as the argument to nunjucks for rendering
				let json = JSON.parse(content);

				// Check for UUIDs and immediately write back the formatted JSON
				// with any new UUIDs inserted
				if (templateName == 'lesson' && Array.isArray(json.lesson)) {
					let missingFields = false;

					json.lesson.forEach(function(lesson) {
						if (lesson.english == null) {
							lesson.english = '';
							missingFields = true;
						}
						if (lesson.swahili == null) {
							lesson.swahili = '';
							missingFields = true;
						}
						if (! lesson.uuid) {
							lesson.uuid = uuid();
							missingFields = true;
						}
					});

					if (missingFields) {
						fs.writeFile(path.join(__dirname, templateName, fileName),
							JSON.stringify(json, null, 4), function(writeError) {
								if (writeError)
									error('Could not write updated JSON.');
							});
					}
				}

				json.type = templateName;
				json.id = path.basename(fileName, '.json');

				// Refer to build and data cache
				json.build = build;
				json.data = data;

				// Update the build object with the json data
				data[templateName][json.id] = json;

				// Assign data to this lesson
				if (build[templateName].indexOf(fileName) >= 0)
					json.index = build[templateName].indexOf(fileName);

				// Render each partial
				let jsonPartial = {};
				Object.keys(partial).forEach(function(partialName) {
					jsonPartial[partialName] = nunjucks.renderString(partial[partialName], json);
				});
				// Store the partials object to the json data
				json.partial = jsonPartial;

				// Set the slide type if not set already
				if (json.lesson)
					json.lesson.forEach(function(slide) {
						if (slide.type == null) {
							if ((slide.english && slide.english.indexOf('__=') >= 0) ||
								(slide.swahili && slide.swahili.indexOf('__=') >= 0)) {
									slide.type = 'question';
							}
							else
								slide.type = 'learn';
						}
					})

				// Render the template contents with the json data
				let rendered = nunjucks.renderString(template[templateName], json);

				// Write the rendered file
				let outputPath = path.join(build.path, templateName, json.id);
				fs.mkdir(outputPath, function(mkdirError) {
					fs.writeFile(path.join(outputPath, 'index.html'), rendered, function(writeError) {
						if (writeError)
							error('Could not write ' + fileName);
						else
							success('Rendered ' + templateName + '/' + json.id);
					});
				});

			}
			// If there was a JSON parsing error
			catch(e) {
				error('Invalid JSON in ' + fileName);
				console.log(chalk.red(e));
			}
		}
	});
};

// Renders all files for the given template
function renderAll(templateName) {
	templateName = path.basename(templateName, '.html');

	// Read the directory's content
	fs.readdir(path.join(__dirname, templateName), function(error, files) {
		// Render each file
		files.forEach(function(file) {
			render(templateName, file);
		});
	});
}

function renderHomepage() {
	fs.readFile(path.join(__dirname, 'template', 'index.html'), 'utf8', function(error, content) {
		let home = {
			build: build,
			data: data,
			type: 'home',
			partial: {}
		};

		Object.keys(partial).forEach(function(partialName) {
			home.partial[partialName] = nunjucks.renderString(partial[partialName], home);
		});

		let rendered = nunjucks.renderString(content, home);

		fs.writeFile(path.join(build.path, 'index.html'), rendered, function(writeError) {
			if (writeError)
				error('Could not write homepage.');
		});
	});
}

function loadTemplate(templateName) {
	fs.readFile(path.join(__dirname, 'template', templateName), 'utf8', function(error, content) {
		if (! error) {
			template[path.basename(templateName, '.html')] = content;
			console.log(chalk.green('Rendering: ') + ' every ' + templateName);
			renderAll(templateName);
		}
	});
};

fs.watch(path.join(__dirname, 'template'), function(eventType, templateName) {
	if (templateName == 'index.html')
		renderHomepage();
	else
		loadTemplate(templateName);
});

fs.watch(path.join(__dirname, 'partial'), function(eventType, fileName) {
	fs.readFile(path.join(__dirname, 'partial', fileName), 'utf8', function(error, content) {
		if (! error) {
			console.log(chalk.green('Updating: ') + 'partial for ' + fileName);
			partial[path.basename(fileName, '.html')] = content;

			build.template.forEach(function(templateName) {
				console.log(chalk.green('Rendering: ') + ' every ' + templateName);
				renderAll(templateName);
			});
		}
	});
});

build.template.forEach(function(templateName) {
	fs.watch(path.join(__dirname, '/', templateName), function(eventType, fileName) {
		console.log(chalk.green('Rendering: ') + fileName + ' as a ' + templateName);
		render(templateName, fileName);
	});
});

//
// Initialization
//

// Read all partials
fs.readdirSync(path.join(__dirname, 'partial')).forEach(function(partialName) {
	partial[path.basename(partialName, '.html')] =
		fs.readFileSync(path.join(__dirname, 'partial', partialName), 'utf8');
});

// Load all initial template data
build.template.forEach(function(templateName) {
	data[templateName] = {};
	// Iterate over all files
	fs.readdirSync(path.join(__dirname, templateName)).forEach(function(fileName) {
		if (fileName == '.DS_Store') return;

		try {
			// Read the JSON data
			data[templateName][path.basename(fileName, '.json')] =
				JSON.parse(fs.readFileSync(path.join(__dirname, templateName, fileName), 'utf8'));
		}
		catch(e) {
			error('Could not load ' + templateName + ' ' + fileName);
		}
	});

	success('Loaded all files of ' + templateName);
});

build.template.forEach(function(templateName) {
	loadTemplate(templateName + '.html');
});

// Render the homepage
renderHomepage();
