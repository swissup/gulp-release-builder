var gulp    = require('gulp-help')(require('gulp')),
    gutil   = require('gulp-util'),
    prompt  = require('gulp-prompt'),
    argv    = require('yargs').argv,
    zip     = require('gulp-zip'),
    open    = require('open'),
    Table   = require('cli-table'),
    fs      = require('fs'),
    filesize = require('filesize'),
    runSequence = require('run-sequence'),
    notifier = require('node-notifier'),
    swissup = require('node-swissup'),
    merge = require('merge-stream');

var builder = {
    callback: function() {},
    finished: 0,
    builds: [],
    modules: [],

    addBuild: function(build) {
        this.builds.push(build);
    },
    setCallback: function(callback) {
        this.finished = 0;
        this.callback = callback;
        return this;
    },
    getSize: function() {
        return this.getModules().length;
    },
    getModules: function() {
        if (this.modules.length) {
            return this.modules;
        }

        var moduleNames = [];
        if (argv.modules) {
            moduleNames = argv.modules.split(',');
        } else if (argv.module.indexOf(',')) {
            moduleNames = argv.module.split(',');
        } else {
            moduleNames = [argv.module];
        }

        moduleNames.forEach(function(moduleName) {
            this.modules.push({
                name: moduleName,
                nochecker: true
            });
            if (!argv.nochecker) {
                this.modules.push({
                    name: moduleName,
                    nochecker: false
                });
            }
        }, this);
        return this.modules;
    },
    finish: function() {
        this.finished++;
        if (this.finished === this.getSize()) {
            this.callback();
        }
    },
    getBinDirs: function() {
        return this.builds.reduce(function(dirs, build) {
            var dir = build.dir + '/' + build.path;
            if (dirs.indexOf(dir) === -1) {
                dirs.push(dir);
            }
            return dirs;
        }, []);
    }
};

gulp.task('prompt', false, [], function(cb) {
    if (argv.module || argv.modules) {
        return cb();
    }

    return gulp.src('package.json')
        .pipe(
            prompt.prompt([{
                type: 'input',
                name: 'module',
                message: 'Which module would you like to build?',
                validate: function(module) {
                    if (!module.length) {
                        return false;
                    }
                    return true;
                }
            }],
            function(res) {
                argv.module = res.module;
            })
        );
});

gulp.task('reset', 'Remove previously generated and downloaded files', [], function(cb) {
    builder.setCallback(cb).getModules().forEach(function(module) {
        swissup()
            .setNochecker(module.nochecker)
            .setPackage(module.name)
            .reset(builder.finish.bind(builder));
    });
});

gulp.task('composer', false, [], function(cb) {
    builder.setCallback(cb).getModules().forEach(function(module) {
        swissup()
            .setNochecker(module.nochecker)
            .setPackage(module.name)
            .initComposerJson(argv.additional ? argv.additional : "")
            .runComposer(builder.finish.bind(builder));
    });
});

gulp.task('archive', false, [], function(cb) {
    var tasks = [];
    builder.getModules().forEach(function(module) {
        var packager = swissup()
            .setNochecker(module.nochecker)
            .setPackage(module.name);

        tasks[tasks.length] = gulp.src(packager.getPath('src/**/*'))
            .pipe(zip(packager.getArchiveName()))
            .pipe(gulp.dest(packager.getVendorName() + '/__bin'));

        builder.addBuild({
            name: module.name,
            nochecker: module.nochecker,
            dir: __dirname,
            path: packager.getVendorName() + '/__bin',
            file: packager.getArchiveName()
        });
    });
    return merge.apply(null, tasks);
});

gulp.task('report', false, [], function() {
    // draw table with releses
    var table = new Table({ head: ["Buildpath", "Path", "Size"] });
    builder.builds.forEach(function(build) {
        var stats = fs.statSync(build.dir + '/' + build.path + '/' + build.file);
        table.push(
            [build.dir, build.path + '/' + build.file, filesize(stats.size)]
        );
    });
    console.log(table.toString());

    // notifier
    var title = 'Release is ready';
    if (builder.builds.length > 1) {
        title = builder.builds.length + ' releases are ready';
    }
    notifier.notify({
        wait: false,
        icon: void 0,
        title: title,
        message: builder.builds.reduce(function(message, build) {
            return message += build.name + ' ';
        }, '')
    });

    // open all folders
    if (!argv.nowindow) {
        builder.getBinDirs().forEach(function(dir) {
            open(dir);
        });
    }
});

gulp.task('default', 'Generate extension release', ['prompt'], function(cb) {
    runSequence(
        'reset',
        'composer',
        'archive',
        'report',
        cb
    );
}, {
    options: {
        'module=vendor/module:1.0.0': 'Module to build with optional version tag',
        'modules=vendor/module:1.0.0,vendor/module:1.0.0': 'Multiple modules to build',
        'additional=vendor/module:0.2.0,vendor/module2': 'Addional modules to include into archive',
        'nochecker': 'Exclude SubscriptionChecker module',
        'nowindow': 'Do not open archive folder when task is finished'
    }
});
