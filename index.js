const Raspi = require('raspi-io');
const five = require('johnny-five');
const SerialPort = require('serialport');
const request = require('request');

const socket = require('socket.io-client')('http://192.168.1.8:8080');

var Readline = SerialPort.parsers.readline;

var serialPort = new SerialPort("/dev/ttyUSB0", {
    baudrate: 19200,
    parser: Readline("\r\n")
});

let counter = 0;
let temperature = false;
// notificaciones
let maxTemp = 0, minTemp = 0,
    maxHum = 0, minHum = 0,
    maxAir = 0;

socket.on('connect', () => {
    console.log('Conectado con el servidor');
});

socket.on('disconnect', () => {
    console.log('Desconectado del servidor');
});

let realDataSend = (data) => {
  socket.emit('dataSensors', data, (callback) => {
      // console.log(callback);
  });
}

let getMinutes = () => {
  let minutes = new Date().getMinutes();
  return minutes;
}

function enviarDatos(data) {
  
  let options = {
    url: 'http://192.168.1.8:8080/referenceValues',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
      }
  };
  
  request(options, (err, res, body) => {
    
    if (err) {
      console.log(err);
      }
      
    let referenceValues = JSON.parse(body).latestReferenceValues;
    
    console.log(referenceValues);
    
    if (referenceValues.flag === true) {
      
      maxTemp = referenceValues.maxTemp, minTemp = referenceValues.minTemp,
      maxHum = referenceValues.maxHum, minHum = referenceValues.minHum,
      maxAir = referenceValues.maxAir;
    
      let obj = {
        aT: referenceValues.maxTemp,
        iT: referenceValues.minTemp,
        aH: referenceValues.maxHum,
        iH: referenceValues.minHum,
        aA: referenceValues.maxAir,
        A: [referenceValues.actuators[0], referenceValues.actuators[1], referenceValues.actuators[2], referenceValues.actuators[3]]
      };
      
      console.log(obj);
      
      serialPort.write(JSON.stringify(obj), function(err) {
        if (err) {
          return console.log('Error on write: ', err.message);
        }
        console.log('message written');
      });
      // Open errors will be emitted as an error event
      serialPort.on('error', function(err) {
        console.log('Error: ', err.message);
      });
      
      request({
        url: 'http://192.168.1.8:8080/referenceValues',
        method: 'POST',
        body:{
          maxTemp,
          minTemp,
          maxHum,
          minHum,
          maxAir,
          actuators: obj.A,
          flag: false
        },
        json:true
        
      }, (err, res, body) => {
        console.log("DENTRO" +  JSON.stringify(body));
      });
    }
        
  });
}

let external_data;

serialPort.on("open", function() {
  
    console.log('open');

    serialPort.on('data', function(data) {
        
        try {
          console.log('data received: ' + data);
          let dataRecived = JSON.parse(data);
            // bandera
            if (dataRecived.actuadores[0] === true) {
              request({
              url: 'http://192.168.1.8:8080/referenceValues',
              method: 'POST',
              body:{
                maxTemp,
                minTemp,
                maxHum,
                minHum,
                maxAir,
                actuators: [1,0,0,0],
                flag: false
              },
              json:true
              
              }, (err, res, body) => {
                console.log("Luz" +  JSON.stringify(body));
              });
            }
            
            if (dataRecived.actuadores[1] === true) {
              request({
              url: 'http://192.168.1.8:8080/referenceValues',
              method: 'POST',
              body:{
                maxTemp,
                minTemp,
                maxHum,
                minHum,
                maxAir,
                actuators: [0,1,0,0],
                flag: false
              },
              json:true
              
              }, (err, res, body) => {
                console.log("Ventilador" +  JSON.stringify(body));
              });
            }
            // NOTIFICACION TEMPERATURA
            // if (dataRecived && temperature === false) {
            //     dataRecived.temperature.forEach((element, index) => {
            //         if (element > 35 || element < 34) {
            //             console.log('notificacion temperatura');
            //             socket.emit('nfTemperature', {
            //                 module: index + 1,
            //                 temperature: element
            //             }, (cb) => console.log(cb));
            //             temperature = true;
            //         }
            //     });
            // }
            // if (dataRecived && temperature === true) {
            //     if ((dataRecived.temperature[0] > 33 && dataRecived.temperature[0] < 36) &&
            //         (dataRecived.temperature[1] > 33 && dataRecived.temperature[1] < 36) &&
            //         (dataRecived.temperature[2] > 33 && dataRecived.temperature[2] < 36) &&
            //         (dataRecived.temperature[3] > 33 && dataRecived.temperature[3] < 36)) {
            //         temperature = false;
            //     }
            // }

            // console.log(temperature);

            external_data = data;
            realDataSend(external_data);
            if ((getMinutes() === 0 || getMinutes() === 30) && (counter === 0)) {
              socket.emit('dataDb', data, (callback) => {
              // console.log(callback);
              });
              counter += 1;
            }
            
            if ((getMinutes() !== 0 && getMinutes() !== 30) && (counter === 1)) {
              counter = 0;
            }
            
        } catch (e) {
            console.log("Communication error");
        }
    });
});

// setInterval(() => {
//     realDataSend(external_data);
// }, 5000);

setInterval(() => {
    enviarDatos();
}, 45000);

