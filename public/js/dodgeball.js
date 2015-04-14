var sound = null;

var f1 = new Image();
var f2 = new Image();
var f3 = new Image();

var f1r = new Image();
var f2r = new Image();
var f3r = new Image();

f1.src = "/images/generic_frog_jump_1.svg";
f2.src = "/images/generic_frog_jump_2.svg";
f3.src = "/images/generic_frog_jump_3.svg";

f1r.src = "/images/generic_frog_jump_1r.svg";
f2r.src = "/images/generic_frog_jump_2r.svg";
f3r.src = "/images/generic_frog_jump_3r.svg";

var aniFrames  = [  f1,  f2,  f3 ];
var aniFramesR = [ f1r, f2r, f3r ];



function frameCycler(elem, initialFrames) {
	
	var me = elem[0];
	me.frameArray = initialFrames;
	me.f = 0;
	me.changeFrame = function() {
		
		$(me).attr("src", me.frameArray[me.f].src);
		me.f++;
		if (me.f === me.frameArray.length) {
			me.f = 0;
		}
		setTimeout(me.changeFrame, 250);
		
	};
	me.changeFrame();
	
	elem.on("reverse", function() {
		//console.log("frog reversing direction");
		if (me.frameArray === aniFrames) {
			me.frameArray = aniFramesR;
		} else {
			me.frameArray = aniFrames;
		}
	});
	
}


$(function() {
	
//	soundManager.setup({
//		  url: '/swf/',
//		  onready: function() {
//		    popSound = soundManager.createSound({
//		      id: 'popSound',
//		      url: '/audio/pop.mp3'
//		    });
//		  },
//		  ontimeout: function() {
//		    // Hrmm, SM2 could not start. Missing SWF? Flash blocked? Show an error, etc.?
//			  console.log("could not start soundmanager!");
//		  }
//		});	

	
	frameCycler($('#dodge-frog-1'), aniFrames);
	frameCycler($('#dodge-frog-2'), aniFramesR);
	
	
	$('#cell-2').unbind();
	$('#cell-2').click(function(e) {

		var x;
		
		if (e.target === this) {
			x = e.offsetX;
		} else {
			x = e.offsetX + $(e.target).position().left;
		}
		
		//console.log(x);
		
		var ball = $('#ball');
		var newBall = ball.clone()[0];
		$(newBall).attr("id", "ball-" + (Math.random() * 1000));
		
		$(newBall).attr("animated", "true");
		$(newBall).attr("speed", "400");
		$(newBall).attr("travel", "125");
		$(newBall).attr("direction", "up");
		
		
		$(newBall).css("left", (x - (ball.width()/2)) + "px");
		$(this).append(newBall);

		
		// ---------------
		
		var sizerHeight = Number($(this).css('height').replace(/\D/g, ''));
		
		var trvl = 125;
		var speed = 400;
		
		newBall.pos = Number($(newBall).css('top').replace('px', ''));
		newBall.direction = -1;
		newBall.lowerBound = newBall.pos;
		newBall.upperBound = newBall.lowerBound - (sizerHeight * (trvl / 100));
		newBall.moveFunction = moveUpDown;
		newBall.noBounce = false;
		newBall.pps = speed;

		$(newBall).on("reverse", function() {
			// stop the insanity
			this.moveFunction = function() { };
		});
		
		animated.push(newBall);
		
		// ---------------
		
		
	});	
	
	
});