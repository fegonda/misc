
/* Load the Camera module. */
var Camera = require("./camera");

/* Create an instance of the camera. */
camera = new Camera();

/* Listen for interrupt signal CTRL-C to gracefully shutdown camera. */
process.on('SIGINT', function(){
    console.log('SIGINT received. Shutting camera module');

    camera.stop();
    process.exit(0);

});

/* Start the camera. */
camera.start();
