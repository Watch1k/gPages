'use strict';

var gulp = require('gulp'),
    sass = require('gulp-ruby-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    rigger = require('gulp-rigger'),
    spritesmith = require('gulp.spritesmith'),
    jade = require('gulp-jade'),
    browserSync = require("browser-sync"),
    consolidate = require("gulp-consolidate"),
    rimraf = require('rimraf'),
    htmlhint = require("gulp-htmlhint"),
    cmq = require('gulp-combine-mq'),
    zip = require('gulp-zip'),
    htmlbeautify = require('gulp-html-beautify'),
    rename = require('gulp-rename'),
    svgstore = require('gulp-svgstore'),
    svgmin = require('gulp-svgmin'),
    cheerio = require('gulp-cheerio'),
    coffee = require('gulp-coffee'),
    gutil = require('gulp-util'),
    notify = require("gulp-notify"),
    reload = browserSync.reload;

// IE 8 opacity
var opacity = function(css, opts) {
    css.eachDecl(function(decl) {
        if (decl.prop === 'opacity') {
            decl.parent.insertAfter(decl, {
                prop: '-ms-filter',
                value: '"progid:DXImageTransform.Microsoft.Alpha(Opacity=' + (parseFloat(decl.value) * 100) + ')"'
            });
        }
    });
};

// @TODO: move all paths to these variables
var src = {
    root: 'src',
    sass: 'src/sass',
    js: 'src/js',
    img: 'src/img',
    lib: 'src/lib',
    svg: 'src/img/svg',
    helpers: 'src/helpers'
};

//** dest paths **
var dest = {
    root: 'build',
    html: 'build',
    css: 'build/css',
    js: 'build/js',
    img: 'build/img'
};

// jade
gulp.task('jade', function() {
    return gulp.src(['src/jade/**/*.jade', '!src/jade/includes/**/*.jade'])
        .pipe(jade())
        .pipe(htmlbeautify())
        .pipe(gulp.dest('build/'));
});


// sass
gulp.task('sass', function() {
    var processors = [
        opacity,
        autoprefixer({
            browsers: ['last 100 versions'],
            cascade: false
        })
    ];

    return sass('src/sass/*.sass', {
            sourcemap: true,
            style: 'expanded'
        })
        .on('error', function(err) {
            console.error('Error', err.message);
        })
        .pipe(postcss(processors))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('build/css/'));
});

gulp.task('coffee', function() {
    gulp.src(src.js + '/*.coffee')
        // .pipe(sourcemaps.init())
        .pipe(coffee({bare: true}).on('error', gutil.log, notify("ERROR!!!")))
        // .pipe(sourcemaps.write())
        .pipe(gulp.dest(dest.js));
});

// sprite
gulp.task('sprite', function() {
    var spriteData = gulp.src(src.img + '/icons/*.png')
        .pipe(spritesmith({
            imgName: 'icons.png',
            cssName: '_sprite.sass',
            imgPath: '../img/icons.png',
            cssFormat: 'sass',
            padding: 4,
            // algorithm: 'top-down',
            cssTemplate: src.helpers + '/sprite.template.mustache'
        }));
    spriteData.img
        .pipe(gulp.dest(dest.img));
    spriteData.css
        .pipe(gulp.dest(src.sass));
});

// svg sprite
gulp.task('svg-sprite', function () {
    return gulp.src(src.svg + '/*.svg')
        .pipe(svgmin({
            js2svg: {
                pretty: true
            }
        }))
        .pipe(rename({prefix: 'icon-'}))
        .pipe(svgstore({ inlineSvg: true }))
        .pipe(rename('icons.svg'))
        .pipe(cheerio({
            run: function ($) {
                $('svg').css({'display': 'none'});
                $('[fill]').removeAttr('fill')
            },
            parserOptions: { xmlMode: true }
        }))
        .pipe(gulp.dest(dest.img));
});

// html includes
gulp.task('html', function() {
    gulp.src('src/*.html')
        .pipe(rigger())
        .pipe(htmlhint())
        .pipe(htmlhint.reporter())
        .pipe(gulp.dest('build/'))
        .pipe(reload({
            stream: true
        }));
});

// js includes
gulp.task('js', function() {
    gulp.src('src/js/**/*.js')
        .pipe(rigger())
        .pipe(gulp.dest('build/js/'))
        .pipe(reload({
            stream: true
        }));
});

gulp.task('copy', function() {
    gulp.src('src/img/**')
        .pipe(gulp.dest('build/img/'));
    gulp.src('src/fonts/*.*')
        .pipe(gulp.dest('build/css/fonts/'));
    gulp.src('src/css/**')
        .pipe(gulp.dest('build/css/lib/'));
    gulp.src('src/video/*.*')
        .pipe(gulp.dest('build/video/'));
});

// delete app
gulp.task('del', function(cb) {
    rimraf('./build', cb);
    gulp.src(src.root)
        .pipe(notify("Delete"));
});

// make zip-file
gulp.task('zip', function() {
    return gulp.src('build/**/*')
        .pipe(zip('build.zip'))
        .pipe(gulp.dest(''))
        .pipe(notify("ZIP"));
});

//webserver
gulp.task('browser-sync', function() {
    browserSync({
        server: {
            baseDir: dest.root,
            directory: true,
            // index: 'index.html'
        },
        files: [dest.html + '/*.html', dest.css + '/*.css', dest.js + '/*.js'],
        port: 8080,
        notify: false,
        ghostMode: false,
        online: false,
        open: true
    });
});

gulp.task('watch', function() {
    gulp.watch('src/jade/**/*.jade', ['jade']);
    gulp.watch(src.sass + '/**/*', ['sass']);
    gulp.watch('src/js/*.js', ['js']);
    gulp.watch('src/js/*.coffee', ['coffee']);
    gulp.watch('src/img/*', ['sprite', 'copy']);
    gulp.watch('src/img/svg/*', ['svg-sprite']);
    gulp.watch(['src/*.html'], ['html']);
    gulp.watch(src.img + '/icons/*.png', ['sprite']);
});


gulp.task('default', ['browser-sync', 'watch'], function() {gulp.src(dest.root).pipe(notify("Sync"));});
gulp.task('build', ['jade', 'html', 'sprite', 'svg-sprite', 'copy', 'js', 'coffee', 'sass'], function() {gulp.src(dest.root).pipe(notify("Build"));});
