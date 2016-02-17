var gulp    = require('gulp-help')(require('gulp')),
    gutil   = require('gulp-util'),
    prompt  = require('gulp-prompt'),
    argv    = require('yargs').argv,
    zip     = require('gulp-zip'),
    size    = require('gulp-size'),
    notify  = require("gulp-notify"),
    runSequence = require('run-sequence'),
    swissup = require('node-swissup');

gulp.task('prompt', false, [], function(cb) {
    if (argv.module) {
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
    swissup.setPackage(argv.module).reset(cb);
});

gulp.task('composer', false, [], function(cb) {
    swissup
        .setPackage(argv.module)
        .initComposerJson(
            argv.additional ? argv.additional : "",
            argv.nochecker  ? true : false
        )
        .runComposer(cb);
});

gulp.task('archive', false, [], function() {
    var s = size();
    swissup.setPackage(argv.module);
    return gulp.src(swissup.getPath('src/**/*'))
        .pipe(zip(swissup.getArchiveName()))
        .pipe(gulp.dest(swissup.getPath('bin')))
        .pipe(s)
        .pipe(notify({
            onLast: true,
            message: function () {
                return 'See <%= file.path %> ' + s.prettySize;
            },
            title: 'Release is Ready'
        }));
});

gulp.task('default', 'Generate extension release', ['prompt'], function(cb) {
    var tasks = ['composer', 'archive', cb];
    if (argv.reset) {
        tasks.unshift('reset');
    }
    runSequence.apply(this, tasks);
}, {
    options: {
        'module=vendor/module:1.0.0': 'Module to build with optional version tag',
        'reset': 'Remove previously generated and downloaded files',
        'additional=vendor/module:0.2.0,vendor/module2': 'Addional modules to include into archive',
        // 'nochecker': 'Exclude SubscriptionChecker module'
    }
});
