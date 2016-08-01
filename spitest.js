
var _spi = require('spi');

var PACKET_SIZE = 164;
var PACKETS_PER_FRAME = 60;
var DEFAULT_MAX_RETRIES = 1750;
var DEFAULT_CAMERA_RESET_PIN = 23; //wiring pi pin number

class spitest {

	connect()
	{
		this._camera = new _spi.Spi( "/dev/spidev0.0", {
			mode: _spi.MODE.MODE_3,
			size: 8,
			maxSpeed: 10 * 1000 * 1000
			}, function(device){
				console.log('SPI ready. Opening connection to camera');
				device.open();
				console.log('Successfully connected to camera');

		}.bind(this));		
	}

	process() {
	    if(this._camera) {
	        console.log('Reading image from camera');

	        // NOTE: This is a synchronous (blocking) call.
	        var retriesRemaining = DEFAULT_MAX_RETRIES;
	        var abort = false;
	        var packets = [];
	        var metadata = {
	            minValue: Number.MAX_VALUE,
	            maxValue: 0,
	            rows: 0,
	            cols: 0,
	            delta: 0
	        };
	        do {
	            var txBuf = new Buffer(PACKET_SIZE);
	            /// TODO: It appears that the camera does not care about these bytes.
	            //txBuf[0] = 0x00;
	            //txBuf[1] = 0x6B;
	            //txBuf[2] = 0x20;
	            //txBuf[3] = 0x40;

	            var rxBuf = new Buffer(PACKET_SIZE);
	            this._camera.transfer(txBuf, rxBuf, function(dev, data) {
	                if(data[1] < 60) {
	                    var packetNumber = data[1];
	                    if(packets.length != packetNumber) {
	                        console.log('Missed packet: [%s] [%s]', packets.length, packetNumber);
	                        retriesRemaining--;
	                        packets = [];

	                        if(retriesRemaining <= 0) {
	                            console.log('Max retries exceeded. Aborting');
	                            abort = true;
	                        }
	                    } else {
	                        var packet = data.slice(4);
	                        var rowValues = [];

	                        for(var index=0; index<packet.length; index+=2) {
	                            var value = packet.readUInt16BE(index);
	                            if(value > metadata.maxValue) {
	                                metadata.maxValue = value;
	                            }
	                            if(value < metadata.minValue) {
	                                metadata.minValue = value;
	                            }

	                            if(packet.length > metadata.cols) {
	                                metadata.cols = packet.length;
	                            }

	                            rowValues.push(value);
	                        }

	                        packets.push(rowValues);
	                    }
	                }
	            }.bind(this));
	        } while(packets.length < 60 && !abort);

	        if(!abort) {
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
	        } else {
	            console.log('Error reading frame from camera. No data to send');
	            //this._resetCamera();
	        }
	    } else {
	        console.log('Camera not initialized and ready');
	    }
	}// process

} // spitest


var t = new spitest();
t.connect();
t.process();
