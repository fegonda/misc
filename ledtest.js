/*********************************************
 * camera pan and tilt test system using 
 * nodejs and wiring-pi
 *
 * ********************************************
 */

/* Load the wiring-pi library */
var wpi = require('wiring-pi');

var pin = 4;     // input output
var on  = true;
var onDelay = 2000;
var delay = 500;
var exit = false;

/* setup the system */
wpi.setup('wpi');
wpi.pinMode(pin, wpi.OUTPUT);


/* Listen for interrupt signal CTRL-C to gracefully shutdown camera. */
process.on('SIGINT', function(){
    console.log('SIGINT received. App shutting down...');
    exit = true;

});


/*********************************************
 * This function test the servo functionality
 * by writing the current angle to the PWM
 * module and calling itself after a delay
 * timer expires.   
 *********************************************/
function test() {

    // set the angle of the pin
    if (exit) 
    {
        wpi.digitalWrite(pin, wpi.LOW);
        process.exit(0);
    }
    else if (on) 
    {
        wpi.digitalWrite(pin, wpi.HIGH);
        setTimeout( test, onDelay );

    }
    else 
    {
        wpi.digitalWrite(pin, wpi.LOW);
        setTimeout( test, delay );

    }

    console.log("writing on: " + on);
    on = !on;
};



/* run */
test();

