'use strict';

var del 			= require('del'),
	gulp 			= require('gulp'),
	gulpIf 			= require('gulp-if'),
	pug 			= require('gulp-pug'),
	debug 			= require('gulp-debug'),
	notify 			= require('gulp-notify'),
	rename 			= require('gulp-rename'),
	stylus 			= require('gulp-stylus'),
	uglify 			= require('gulp-uglify'),
	concat 			= require('gulp-concat'),
	merge 			= require('merge-stream'),
	buffer			= require('vinyl-buffer'),
	imagemin 		= require('gulp-imagemin'),
	cleanCSS 		= require('gulp-clean-css'),
	svgSprite		= require('gulp-svg-sprite'),
	srcmaps 		= require('gulp-sourcemaps'),
	spritesmith		= require('gulp.spritesmith'),
	autoprefixer	= require('gulp-autoprefixer'),
	beautify		= require('gulp-jsbeautifier'),
	browserSync 	= require('browser-sync').create();


var isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';


//Converting from Pug —> HTML
gulp.task('html', function() {

	return multipipe(

		gulp.src('app/html/*.pug'),
		
		pug(),
		
		beautify(),

		gulp.dest('build')

	).on('error', notify.onError({
		title: 'HTML',
		message: '<%= error.message %>'
	}));	

});


//Converting from Stylus —> CSS
gulp.task('styles', function() {

	return multipipe( 
		
		gulp.src('app/assets/styles/index.styl'),	
		
		gulpIf(isDevelopment, srcmaps.init()),
		
		rename(function(path) {
			path.basename = 'styles.min';
		}),
		
		stylus(),
		
		autoprefixer({
            browsers: ['last 5 versions'],
            cascade: false
        }),
		
		gulpIf(isDevelopment, srcmaps.write('.'), cleanCSS()),
		
		gulp.dest('build/css')

	).on('error', notify.onError({
		title: 'Styles',
		message: '<%= error.message %>'
	}));

});


//Minifying scripts
gulp.task('scripts', function() {

	return gulp.src('app/assets/scripts/*.js')
		.pipe(uglify())
		.pipe(gulp.dest('build/js'));

});


//Concating libraries
gulp.task('scripts:libs', function() {

	return gulp.src(['app/assets/scripts/libs/jquery.min.js', 'app/assets/scripts/libs/**/*.js'])
		.pipe(concat('libs.min.js'))
		.pipe(gulp.dest('build/js'));

});


//Creating Symbol SVG sprite
gulp.task('sprite:svg-symbol', function() {

	return gulp.src('app/assets/images/sprite-svg-symbol/**/*.svg')
		.pipe(imagemin([imagemin.svgo( { plugins: [{removeViewBox: true}] } )]))
		.pipe(svgSprite({
			svg: {
				xmlDeclaration: false
			},
			mode: {
				symbol: {
					inline: true,
					dest: 'sprites',
					sprite: "sprite-symbol.svg",
					example: {
						template: 'app/assets/styles/sprites/templates/sprite-svg-symbol.template',
						dest: '../../../app/assets/styles/sprites/sprite-svg-symbol.pug'
					}
				}
			}
		}))
		.pipe(gulp.dest('build/img'));	

});


//Creating CSS SVG sprite
gulp.task('sprite:svg-css', function() {

	return gulp.src('app/assets/images/sprite-svg-css/**/*.svg')
		.pipe(imagemin([imagemin.svgo( { plugins: [{removeViewBox: true}] } )]))
		.pipe(svgSprite({
			mode: {
				css: {
					dest: 'sprites',
					sprite: 'sprite-css.svg',
					prefix: '.%s',
					bust: false,
					render: {
						styl: {
							template: 'app/assets/styles/sprites/templates/sprite-svg-css.template',
							dest: '../../../app/assets/styles/sprites/sprite-svg-css.styl'
						}
					}
				}
			}
		}))
		.pipe(gulp.dest('build/img'));

});


//Creating PNG sprite
gulp.task('sprite:png', function() {

	var spriteData = gulp.src('app/assets/images/sprite-png/**/*.png')
		.pipe(spritesmith({
			retinaSrcFilter: 'app/assets/images/sprite-png/**/*@2x.png',
			imgName: 'sprite.png',
			retinaImgName: 'sprite@2x.png',
			cssName: 'sprite-png.styl',
			cssFormat: 'stylus',
			algorithm: 'binary-tree',
			cssTemplate: 'app/assets/styles/sprites/templates/sprite-png.template'
		}));

	var imgStream = spriteData.img
		.pipe(buffer())
		.pipe(imagemin([ imagemin.optipng({optimizationLevel: 5}) ]))
		.pipe(gulp.dest('build/img/sprites'));

	var cssStream = spriteData.css
		.pipe(gulp.dest('app/assets/styles/sprites/'));

	return merge(imgStream, cssStream);

});


//Folding images to the build dir
gulp.task('images', function() {

	return gulp.src('app/assets/images/*.*')
		.pipe(debug({title: 'images'}))
		.pipe(imagemin([
		    imagemin.gifsicle({interlaced: true}),
			imagemin.jpegtran({progressive: true}),
			imagemin.optipng({optimizationLevel: 5}),
			imagemin.svgo({plugins: [{removeViewBox: true}]})		
		]))
		.pipe(gulp.dest('build/img'));

});


//Folding fonts to the build dir
gulp.task('fonts', function() {

	return gulp.src('app/assets/fonts/**/*.*')
		.pipe(debug({title: 'fonts'}))
		.pipe(gulp.dest('build/fonts'));

});


//Deleting previous build
gulp.task('clean', function() {

	return del('build');

});


//Building project from sources
gulp.task('build', gulp.series(
	'clean', 
	gulp.parallel('sprite:svg-symbol', 'sprite:svg-css', 'sprite:png'),
	gulp.parallel('html', 'styles', 'scripts', 'scripts:libs', 'images', 'fonts'))
);


//Local server and browsers synchronization
gulp.task('serve', function() {
	browserSync.init({
		server: './build',
		notify: false
	});

	gulp.watch('app/**/*.pug', gulp.series('html', reload));
	gulp.watch('app/**/*.styl', gulp.series('styles', reload));
	gulp.watch('app/assets/scripts/*.js', gulp.series('scripts', reload));
	gulp.watch('app/assets/scripts/libs/*.js', gulp.series('scripts:libs', reload));
	gulp.watch('app/assets/images/sprite-svg-symbol/*.svg', gulp.series('sprite:svg-symbol', reload));
	gulp.watch('app/assets/images/sprite-svg-css/*.svg', gulp.series('sprite:svg-css', reload));
	gulp.watch('app/assets/images/sprite-png/*.png', gulp.series('sprite:png', reload));
	gulp.watch('app/assets/images/*.*', gulp.series('images', reload));
	gulp.watch('app/assets/fonts/**/*.*', gulp.series('fonts', reload));
	
});

function reload(done) {
	browserSync.reload();
	done();
}

//Gulp default task
gulp.task('default', gulp.series('build', 'serve'));