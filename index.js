    var SerialPort = require('serialport');
    var Readline = SerialPort.parsers.readline;
    var serialPort = new SerialPort("/dev/ttyACM1", {
      baudrate: 9600 ,
      parser: Readline("\r\n")
    });

    var external_data = "jgcvjg";
    serialPort.on("open", function () {
      console.log('open');
      serialPort.on('data', function (data) {
        //console.log('data received: ' + data);
        try {
          console.log(JSON.parse(data));
          external_data = data;
        } catch (e) {
          console.log("Communication error");
        } 
      });
      
      var damedatos = function (data) {
        try {
          console.log("pasaron 5 segundos" + data);
        } catch (e) {
          console.log("frcxfrcrf error");
        } 
      };
      
      setInterval(function(){ damedatos(external_data) }, 5000);
    });