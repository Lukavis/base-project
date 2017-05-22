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

var spriteConfig = {

	symbol: {
		svg: {
			xmlDeclaration: false
		},
		mode: {
			symbol: {
				inline: true,
				dest: 'sprites',
				sprite: "sprite-symbol.svg",
				example: {
					template: 'app/css/sprites/templates/sprite-svg-symbol.template',
					dest: '../../app/css/sprites/sprite-svg-symbol.html'
				}
			}
		}	
	},
	css: {
		mode: {
			css: {
				dest: 'sprites',
				sprite: 'sprite-css.svg',
				prefix: '.%s',
				bust: false,
				render: {
					styl: {
						template: 'app/css/sprites/templates/sprite-svg-css.template',
						dest: '../../app/css/sprites/sprite-svg-css.styl'
					}
				}
			}
		}
	},
	png: {
		retinaSrcFilter: 'app/img/sprite-png/**/*@2x.png',
		imgName: 'sprite.png',
		retinaImgName: 'sprite@2x.png',
		cssName: 'sprite-png.styl',
		cssFormat: 'stylus',
		algorithm: 'binary-tree',
		cssTemplate: 'app/css/sprites/templates/sprite-png.template'
	}

}

var bsConfig = {
	server: './build',
	files: ['./build/css/*.css'],
	notify: false
}

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
		
		gulp.src('app/css/index.styl'),	
		
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

	return gulp.src('app/js/*.js')
		.pipe(uglify())
		.pipe(gulp.dest('build/js'));

});


//Concatinating libraries
gulp.task('scripts:libs', function() {

	return gulp.src(['app/js/libs/jquery.min.js', 'app/js/libs/**/*.js'])
		.pipe(concat('libs.min.js'))
		.pipe(gulp.dest('build/js'));

});


//Creating Symbol SVG sprite
gulp.task('sprite:svg-symbol', function() {

	return gulp.src('app/img/sprite-svg-symbol/**/*.svg')
		.pipe(imagemin([imagemin.svgo( { plugins: [{removeViewBox: true}] } )]))
		.pipe(svgSprite(spriteConfig.symbol))
		.pipe(gulp.dest('build/img'));	

});


//Creating CSS SVG sprite
gulp.task('sprite:svg-css', function() {

	return gulp.src('app/img/sprite-svg-css/**/*.svg')
		.pipe(imagemin([imagemin.svgo( { plugins: [{removeViewBox: true}] } )]))
		.pipe(svgSprite(spriteConfig.css))
		.pipe(gulp.dest('build/img'));

});


//Creating PNG sprite
gulp.task('sprite:png', function() {

	var spriteData = gulp.src('app/img/sprite-png/**/*.png')
		.pipe(spritesmith(spriteConfig.png));

	var imgStream = spriteData.img
		.pipe(buffer())
		.pipe(imagemin([ imagemin.optipng({optimizationLevel: 5}) ]))
		.pipe(gulp.dest('build/img/sprites'));

	var cssStream = spriteData.css
		.pipe(gulp.dest('app/css/sprites/'));

	return merge(imgStream, cssStream);

});


//Folding images to the build dir
gulp.task('images', function() {

	return gulp.src('app/img/*.*')
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

	return gulp.src('app/fonts/**/*.*')
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
	browserSync.init(bsConfig);

	gulp.watch('app/**/*.styl', gulp.series('styles'));
	gulp.watch('app/**/*.pug', gulp.series('html', reload));
	gulp.watch('app/js/*.js', gulp.series('scripts', reload));
	gulp.watch('app/js/libs/*.js', gulp.series('scripts:libs', reload));
	gulp.watch('app/img/sprite-svg-symbol/*.svg', gulp.series('sprite:svg-symbol', reload));
	gulp.watch('app/img/sprite-svg-css/*.svg', gulp.series('sprite:svg-css', reload));
	gulp.watch('app/img/sprite-png/*.png', gulp.series('sprite:png', reload));
	gulp.watch('app/img/*.*', gulp.series('images', reload));
	gulp.watch('app/fonts/**/*.*', gulp.series('fonts', reload));
	
});

function reload(done) {
	browserSync.reload();
	done();
}

//Gulp default task
gulp.task('default', gulp.series('build', 'serve'));