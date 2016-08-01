/*********************************************
 * camera pan and tilt test system using 
 * nodejs and wiring-pi
 *
 * ********************************************
 */

/* Load the wiring-pi library */
var wpi = require('wiring-pi');

/* program variables */
var delay     = 100;
var delta     = 2;
var angle     = 0; // 50 pulse width
var direction = 1;
var dtMin     = 50;
var dtMax     = 110;
var panPin    = 1;
var tiltPin   = 24;

/* setup the system */
wpi.setup('wpi');
wpi.pinMode(panPin, wpi.PWM_OUTPUT);
wpi.pinMode(tiltPin, wpi.PWM_OUTPUT);
wpi.pwmSetMode(wpi.PWM_MODE_MS);
wpi.pwmSetRange(1024); // resolution
wpi.pwmSetClock(375);
wpi.pwmWrite(panPin,dtMin);
wpi.pwmWrite(tiltPin,dtMin);


/*********************************************
 * This function test the servo functionality
 * by writing the current angle to the PWM
 * module and calling itself after a delay
 * timer expires.   
 *********************************************/
function test() {

    // set the angle of the pin
    //wpi.pwmWrite(tiltPin,angle);
    wpi.pwmWrite(panPin,angle);
    console.log("writing angle: " + angle );

    // compute the next angle
    angle += (direction*delta);
    if (angle > dtMax) {
        angle = dtMax;
        direction = -1;
    }
    else if (angle <= dtMin) {
        angle = dtMin;
        direction = 1;
    }
   // angle = 30+45;

    setTimeout( test, delay );
};


setTimeout( function() {
    //process.exit(1);
    test();
}, 1000);

