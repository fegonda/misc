var wpi      = require('wiring-pi');
var RaspiCam = require("raspicam");
var config   = require('../config/config.json');

var fs = require('fs');
var getPixels = require("get-pixels");


var lightsPin = 4;     // input output
var exit = false;

/* setup the system */
wpi.setup('wpi');
wpi.pinMode(config.camera.cameraLightsPin, wpi.OUTPUT);



/* Listen for interrupt signal CTRL-C to gracefully shutdown camera. */
process.on('SIGINT', function(){
    console.log('SIGINT received. App shutting down...');
    exit = true;
  setEnableLights( false );
});

function readImagePixels(filename) {
  
  fs.readFile(filename, function(err, data) {
          if (err) {
              console.log('error: ' + err);
              throw err; // Fail if the file can't be read.
          }
          console.log('readImagePixels');
          console.log( data );
          return data;
  });
  return null;
};


function readImagePixelsAsArray(filename) {
  getPixels(filename, function(err, pixels) {
        if(err) {
            console.log("Bad image path: " + filename)
            return
        }
        console.log('readImagePixelsAsArray');
        console.log("got pixels", pixels.shape.slice())
        return pixels
  })
  return null;
};

function setEnableLights( on )
{
  if (on) 
  {
    wpi.digitalWrite(config.camera.cameraLightsPin, wpi.HIGH);
  }
  else
  {
    wpi.digitalWrite(config.camera.cameraLightsPin, wpi.LOW);
  }
};

function takePicture(index, callback)
{
  var options = {
      mode: "photo",
      output: "./data/photos/test_image_" + index + ".png",
      encoding: "png",
      quality: 10,
      w: 320,
      h: 240,
      timeout: 0 // take the picture immediately
  };

  setEnableLights( true );

  // Use the global RaspiCam to create a camera object.
    // create raspicam from the global object
  var camera = new RaspiCam( options );

  // take pciture
  if (!camera.start( options )) {
      return;
  }

  camera.on("read", function() {
    camera.on("read", function() {
      camera.stop();
    });
  });

  camera.on("stop", function() {

    var data = readImagePixels( options.output );

    //setEnableLights( false );
    console.log('stop');
    if (callback != null) {

      setEnableLights( false );
      callback( data );
    }
    
  });

};


var index = 0;
var numpics = 2;

function takePictures()
{
  
  index += 1;

  setEnableLights( index <= 1 );

  if (index > numpics)
  {
    return;
  }

  takePicture( index, function( data ){
    setTimeout( takePictures, 1000 );
  } );
  

};

takePictures();
