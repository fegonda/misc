var wpi = require('wiring-pi');

function Servo()
{
    this.settings = settings;
    this.angle = 0;
    this.target = 0;
    this.direction = 1;
    this.callback = null;
}

Servo.prototype.move = function(target, callback) 
{
    this.target = target;
    this.callback = callback;

    if (this.target == this.angle) {
        if (this.callback != null)
        {
            this.callback();
        }
    }
    else if (this.target < this.angle) 
    {
        this.direction = -1;
    }
    else 
    {
        this.direction = 1;
    }
};

Servo.prototype.update = function() 
{
    var prevAngle = this.angle;

    if (this.direction < 0) 
    {
        this.angle = Math.max(this.angle - this.settings.incAngle, this.target);
    }
    else 
    {
        this.angle = Math.min(this.angle + this.settings.incAngle, this.target);
    }

    /* write data to the signal pin of the servo */
    wpi.pwmWrite(this.settings.pin, this.angle);

    /* first time we reache target, fire the callback */
    if (this.angle != prevAngle && this.angle == this.target) 
    {
        if (this.callback != null) 
        {
            this.callback();
        }
    }           
};

/* export the class */
module.exports = Servo

