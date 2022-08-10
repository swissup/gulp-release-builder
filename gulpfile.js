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
    swissup = require('node-swissup'),
    merge = require('merge-stream');

var builder = {
    callback: function() {},
    finished: 0,
    builds: [],
    packages: [],

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
        if (this.packages.length) {
            return this.packages;
        }

        var packageNames = [];
        if (argv.packages) {
            packageNames = argv.packages.split(',');
        } else if (argv.package.indexOf(',')) {
            packageNames = argv.package.split(',');
        } else {
            packageNames = [argv.package];
        }

        packageNames.forEach(function(packageName) {
            this.packages.push({
                name: packageName,
                nochecker: true,
                nocore: argv.nocore
            });
            if (!argv.nochecker) {
                this.packages.push({
                    name: packageName,
                    nochecker: false
                });
            }
        }, this);
        return this.packages;
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
    if (argv.package || argv.packages) {
        return cb();
    }

    return gulp.src('package.json')
        .pipe(
            prompt.prompt([{
                type: 'input',
                name: 'package',
                message: 'Which package would you like to build?',
                validate: function(package) {
                    if (!package.length) {
                        return false;
                    }
                    return true;
                }
            }],
            function(res) {
                argv.package = res.package;
            })
        );
});

gulp.task('reset', 'Remove previously generated and downloaded files', [], function(cb) {
    builder.setCallback(cb).getModules().forEach(function(package) {
        swissup()
            .setNochecker(package.nochecker)
            .setNocore(package.nocore)
            .setPackage(package.name)
            .reset(builder.finish.bind(builder));
    });
});

gulp.task('composer', false, [], function(cb) {
    builder.setCallback(cb).getModules().forEach(function(package) {
        swissup()
            .setNochecker(package.nochecker)
            .setNocore(package.nocore)
            .setPackage(package.name)
            .initComposerJson(argv.additional ? argv.additional : "")
            .runComposer(builder.finish.bind(builder));
    });
});

gulp.task('archive', false, [], function(cb) {
    var tasks = [];
    builder.getModules().forEach(function(package) {
        var packager = swissup()
            .setNochecker(package.nochecker)
            .setNocore(package.nocore)
            .setPackage(package.name);

        tasks[tasks.length] = gulp.src(packager.getPath('src/**/*'))
            .pipe(zip(packager.getArchiveName()))
            .pipe(gulp.dest(packager.getVendorName() + '/__bin'));

        builder.addBuild({
            name: package.name,
            nochecker: package.nochecker,
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
        'package=vendor/package:1.0.0': 'Module to build with optional version tag',
        'packages=vendor/package:1.0.0,vendor/package:1.0.0': 'Multiple packages to build',
        'additional=vendor/package:0.2.0,vendor/package2': 'Addional packages to include into archive',
        'nochecker': 'Exclude SubscriptionChecker package',
        'nowindow': 'Do not open archive folder when task is finished',
        'nocore': 'Skip tm/core package'
    }
});
