var gulp = require('gulp'),
    less = require('gulp-less'),
	rename = require('gulp-rename'),
	notify = require('gulp-notify'),
    reload = require('gulp-livereload'),
    connect = require('gulp-connect'),
    autoprefixer = require('gulp-autoprefixer'),
	minifyCSS = require('gulp-minify-css');

gulp.task('connect', function(){
    connect.server({
        root: 'html',
        livereload: true
    });
});


gulp.task('less', function(done) {
  gulp.src('src/*.less')
    .pipe(less().on('error', function(error) {
      // у нас ошибка
      done(error);
    }))
    .pipe(minifyCSS(''))
    .pipe(rename('styles.min.css'))
    .pipe(gulp.dest('html/assets/css/'))
    .on('end', function() {
      // у нас все закончилось успешно
      done();
    })
    .pipe(autoprefixer({
            browsers: ['last 5 versions'],
            cascade: false
    }))
    .pipe(connect.reload())
    .pipe(notify('Done!'))
});


gulp.task('html', function () {
    gulp.src('html/*.html')
    .pipe(connect.reload())
    .pipe(notify('Done!'));
});

gulp.task('js', function () {
    gulp.src('html/assets/js/*.js')
    .pipe(connect.reload())
    .pipe(notify('Done!'));
});

gulp.task('watch', function() {
	gulp.watch('src/*.less', ['less'])
    gulp.watch('html/*.html', ['html'])
    gulp.watch('html/assets/js/*.js', ['js'])
});

gulp.task('default', ['connect', 'watch', 'less']);