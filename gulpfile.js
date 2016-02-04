var gulp    = require('gulp-help')(require('gulp')),
    gutil   = require('gulp-util'),
    argv    = require('yargs').argv,
    zip     = require('gulp-zip'),
    size    = require('gulp-size'),
    notify  = require("gulp-notify"),
    runSequence = require('run-sequence'),
    swissup = require('node-swissup');

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
    return gulp.src(swissup.getPath('release/**/*'))
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

gulp.task('default', 'Generate extension release', [], function(cb) {
    if (!argv.module) {
        gutil.log('Missing parameter:', gutil.colors.cyan('--module=vendor/module:1.0.0'));
        gutil.log('Use', gutil.colors.magenta('gulp help'), 'for more information');
        cb();
    } else {
        var tasks = ['composer', 'archive', cb];
        if (argv.reset) {
            tasks.unshift('reset');
        }
        runSequence.apply(this, tasks);
    }
}, {
    options: {
        'module=vendor/module:1.0.0': 'Module to build with optional version tag',
        'reset': 'Remove previously generated and downloaded files',
        'additional=vendor/module:0.2.0,vendor/module2': 'Addional modules to include into archive',
        // 'nochecker': 'Exclude SubscriptionChecker module'
    }
});
