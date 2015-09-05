import gulp from 'gulp';
import util from 'gulp-util';

import eslint from 'gulp-eslint';
import scsslint from 'gulp-scss-lint';

import {argv} from 'yargs';
import browserify from 'browserify';
import babelify from 'babelify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import sourcemaps from 'gulp-sourcemaps';
import gulpif from 'gulp-if';
import uglify from 'gulp-uglify';
import sass from 'gulp-sass';
import minifyCss from 'gulp-minify-css';
import rename from 'gulp-rename';

import server from 'gulp-server-livereload';


const DIST_DIR = './dist';
const OPTIONS = {
    distDir: DIST_DIR,

    browserifyConfig: {
        entries: 'app/js/algobuy.jsx',
        basedir: '.',
        paths: './app/js',
        extensions: ['js', 'jsx']
    },

    js: {
        bundleName: 'algobuy.js',
        destDir: `${DIST_DIR}/js`,
        globs: ['app/js/**/*.js', 'app/js/**/*.jsx']
    },

    sass: {
        source: 'app/styles/main.scss',
        bundleName: 'main.css',
        destDir: `${DIST_DIR}/css`,
        globs: ['app/styles/**/*.scss']
    },

    assets: {
        globs: ['app/assets/**/*']
    }
};


// Default task will just run lint
gulp.task('default', ['lint']);

// The server task will serve files from the dist folder and create a Socket.io
// connection between the server and the running website instances to live
// reload CSS/scripts/... when they change
gulp.task('server', ['build'], function() {
    // Ask Gulp to watch our source files and to build again when any file
    // changes.
    gulp.watch(OPTIONS.js.globs, ['js-build']);
    gulp.watch(OPTIONS.sass.globs, ['scss-build']);
    gulp.watch(OPTIONS.assets.globs, ['assets-copy']);

    // Start the server & live-reload stuff, serving/watching the content of the
    // dist directory.
    gulp.src('dist')
        .pipe(server({
            livereload: true,
            open: true
        }));
});

// LINTING TASKS
gulp.task('lint', ['scss-lint', 'js-lint']);

gulp.task('js-lint', () => {
    return gulp.src(OPTIONS.js.globs)
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failOnError());
});

gulp.task('scss-lint', () => {
    return gulp.src(OPTIONS.sass.globs)
        .pipe(scsslint())
        .pipe(scsslint.failReporter());
});


// BUILDING TASKS
gulp.task('build', ['js-build', 'scss-build', 'assets-copy']);

gulp.task('js-build', ['js-lint'], () => {
    var bundler = browserify(OPTIONS.browserifyConfig);

    bundler.on('error', errorHandler);

    // Use babelify to transpile our ES6 files to ES5
    bundler.transform(babelify);

    // Bundle our js code
    return bundler.bundle()
        .pipe(source(OPTIONS.js.bundleName))
        .pipe(buffer())

        // Generate sourcemaps
        .pipe(sourcemaps.init({ loadMaps: true }))

        // For production build, run uglify on the bundled js
        .pipe(gulpif(argv.production, uglify({ mangle: false })))
        .on('error', errorHandler)

        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(OPTIONS.js.destDir));
});

gulp.task('scss-build', ['scss-lint'], () => {
    return gulp.src(OPTIONS.sass.source)
        .pipe(rename(OPTIONS.sass.bundleName))

        // Generate sourcemaps
        .pipe(sourcemaps.init())

        .pipe(sass().on('error', errorHandler))

        // For production build, minify css
        .pipe(gulpif(argv.production, minifyCss()))
        .on('error', errorHandler)

        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(OPTIONS.sass.destDir));
});

gulp.task('assets-copy', () => {
    // Simply copy all assets to the destination directory
    return gulp.src(OPTIONS.assets.globs).pipe(gulp.dest(OPTIONS.distDir))
});


function errorHandler(error)
{
    util.log(util.colors.red('!! Error: ' + error.message));
    this.end();
}
