
var config    = require('../config/config.json');
var fs        = require("fs");
var wpi       = require('wiring-pi');
var _spi      = require('spi');
var Servo     = require('./servo');

var PACKET_SIZE = 164;
var PACKETS_PER_FRAME = 60;
var DEFAULT_MAX_RETRIES = 750; 
var DEFAULT_CAMERA_RESET_PIN = 23; //wiring pi pin number

class Camera
{
    constructor()
    {
        this.camDevice     = null;
        this.panDirection  = 1;
        this.panIndex      = 0;
        this.tiltDirection = 1;
        this.tiltIndex     = 0;
        this.panServo      = new Servo( config.camera.panServo );
        this.tiltServo     = new Servo( config.camera.tiltServo ); 

        this.setup();   
        this.connect();   
    } // constructor

    setup()
    {
        /* setup the system */
        wpi.setup('wpi');
        wpi.pinMode( config.camera.tiltServo.pin, wpi.PWM_OUTPUT);
        wpi.pinMode( config.camera.panServo.pin, wpi.PWM_OUTPUT);
        wpi.pwmSetMode(wpi.PWM_MODE_MS);
        wpi.pwmSetClock(375);
        wpi.pwmSetRange(1024); // resolution        
    } // setup

    connect()
    {
        try
        {
            this.camDevice = new _spi.Spi( 
                config.camera.spiDevice, {
                mode: _spi.MODE.MODE_3,
                size: 8,
                maxSpeed: 10*1000*1000
                },
                function(device) {
                    console.log('SPI ready. Opening connection to camera');
                    device.open();
                    console.log('Successfully connected to camera');
                }.bind(this));
        }
        catch(ex)
        {
            console.log('Unable to connect to camera '+ ex.toString());
        }        
    } // connect

    reset()
    {
        wpi.digitalWrite( config.camera.cameraResetPin, 0 );

        setTimeout( function() 
        {
            console.log("camera reset complete");
            wpi.digitalWrite( config.camera.cameraResetPin, 1 );
        }, 500);        
    } // reset

    start()
    {
        this.tilt();
        this.update();
    } // start

    stop()
    {
        console.log('stopping camera');
        try
        {
            console.log('Closing camera on: [%s]', config.camera.spiDevice);
            // NOTE: This is a synchronous (blocking) call.
            this.camDevice.close();
            this.camDevice = null;
        }
        catch(ex)
        {
            console.log('Error closing connection to camera: ' + ex.toString());
        }
    }

    tilt()
    {
        console.log('tiltindex:' + this.tiltIndex);
        var angle = config.camera.moves[ this.tiltIndex ].tilt;
        console.log('tiltindex:' + this.tiltIndex + " angle:" + angle);
        this.tiltServo.move( angle, this.tiltFinished.bind(this) );    
    } // tilt

    tiltFinished()
    {
        var nPans = config.camera.moves[ this.tiltIndex ].pans.length;

        if (this.panIndex > 0) 
        {
            this.panIndex     = nPans-1;
            this.panDirection = -1;
        } 
        else 
        {
            this.panIndex     = 0;
            this.panDirection = 1;
        }

        this.pan();        
    } // tiltFinished

    pan()
    {
        var angle = config.camera.moves[ this.tiltIndex ].pans[ this.panIndex ];
        this.panServo.move( angle, this.panFinished.bind(this) );        
    } // pan

    panFinished()
    {
        this.capture();
    } // panFinished

    capture()
    {
        if (this.process()) 
        { 
            // wait, then process next camera move
            setTimeout( this.captureFinished.bind(this), config.camera.captureTime);
        }
        else
        {
            // wait, then try to capture image again.
            setTimeout( this.capture.bind(this), config.camera.captureTime);
        }
    } // capture

    captureFinished()
    {
        this.panIndex += this.panDirection;

        var nPans = config.camera.moves[ this.tiltIndex ].pans.length;
        if (this.panIndex < 0 || this.panIndex == nPans) 
        {
            var index = this.tiltIndex + this.tiltDirection;
            if (index < 0 || index == config.camera.moves.length) 
            {
                this.tiltDirection *= -1;
            }

            this.tiltIndex += this.tiltDirection;
            this.tiltIndex = Math.max( 0, this.tiltIndex );
            this.tiltIndex = Math.min( config.camera.moves.length-1, this.tiltIndex );
            this.tilt();
        }
        else 
        {
            this.pan();
        }       
    } // captureFinished

    process()
    {
        if (true) return true;

        console.log('reading image from camera...');

        // NOTE: This is a synchronous (blocking) call.
        var retriesRemaining = config.camera.maxRetries;
        var abort = false;
        var packets = [];
        var metadata = {
            minValue: Number.MAX_VALUE,
            maxValue: 0,
            rows: 0,
            cols: 0,
            delta: 0
        };

        console.log('retriesRemaining: ' + retriesRemaining);

        do 
        {
            var txBuf = new Buffer(PACKET_SIZE);
            /// TODO: It appears that the camera does not care about these bytes.
            //txBuf[0] = 0x00;
            //txBuf[1] = 0x6B;
            //txBuf[2] = 0x20;
            //txBuf[3] = 0x40;

            var rxBuf = new Buffer(PACKET_SIZE);

            this.camDevice.transfer(txBuf, rxBuf, function(dev, data) {
                if(data[1] < 60) 
                {
                    var packetNumber = data[1];
                    if(packets.length != packetNumber) 
                    {
                        console.log('Missed packet: ' + packets.length + ' ' +packetNumber);
                        retriesRemaining--;
                        packets = [];

                        if(retriesRemaining <= 0) 
                        {
                            console.log('Max retries exceeded. Aborting');
                            abort = true;
                        }
                    } 
                    else 
                    {
                        var packet = data.slice(4);
                        var rowValues = [];

                        for(var index=0; index<packet.length; index+=2) 
                        {
                            var value = packet.readUInt16BE(index);
                            if(value > metadata.maxValue) 
                            {
                                metadata.maxValue = value;
                            }
                            if(value < metadata.minValue) 
                            {
                                metadata.minValue = value;
                            }

                            if(packet.length > metadata.cols) 
                            {
                                metadata.cols = packet.length;
                            }

                            rowValues.push(value);
                        }

                        packets.push(rowValues);
                        //console.log('got packet....#packets: ' + packets.length);
                    }
                }
            }.bind(this));

        } while(packets.length < 60 && !abort);


        if(!abort) 
        {
            // Two bytes per column value.
            metadata.cols = metadata.cols/2;
            metadata.rows = packets.length;
            metadata.delta = metadata.maxValue - metadata.minValue;

            var payload = {
                id: this._id,
                data: {
                    timestamp: Date.now(),
                    camera: {
                        metadata: metadata,
                        lines: packets
                    }
                }
            };

            console.log('Emitting sensor data for node');
            
            //this.emit('data', payload);
            
            if (config.camera.saveToFile) 
            {
                this.packetsToFile( payload.data.camera.lines );
            }
        } 
        else 
        {
            console.log('Error reading frame from camera. No data to send');
            this.reset();
            return false;
        }

        return true;
    } // process


    packetsToFile( packets )
    {
        var tAngle = config.camera.moves[ this.tiltIndex ].tilt;
        var pAngle = config.camera.moves[ this.tiltIndex ].pans[ this.panIndex ];
        var path   = "./data/ir_image_" + tAngle + "_" + pAngle + ".dat";

        console.log('captured: ' + path );
        fs.writeFile(path, JSON.stringify(packets), 
           function(err) 
           {
                if(err) 
                {
                    console.log( err );
                }
            }
        ); // writeFile
    } // packetsToFile

    update()
    {
        this.panServo.update();
        this.tiltServo.update();   

        setTimeout( this.update.bind(this), config.camera.updateFrequency );     
    } // update

} // camera


/* export camera class */
module.exports = Camera;

