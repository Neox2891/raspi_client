const Raspi = require('raspi-io');
const five = require('johnny-five');
const SerialPort = require('serialport');
const request = require('request');
const rp = require('request-promise');
const urlServer = 'http://165.22.129.115:3030';

const socket = require('socket.io-client')(urlServer);

var Readline = SerialPort.parsers.readline;

var serialPort = new SerialPort("/dev/ttyUSB0", {
    baudrate: 19200,
    parser: Readline("\r\n")
});

let connection = false;
let counter = 0;
let temperature = false;
// notificaciones
let maxTemp = 100, minTemp = 0,
    maxHum = 100, minHum = 0,
    maxAir = 1000;
    
let luz;
let ventiladores;

socket.on('connect', () => {
  console.log(socket.connected);
  connection = true;
});
socket.on('disconnect', () => {
  console.log('Desconectado del servidor');
  connection = false;
});

let realDataSend = (data) => {
  if (connection) {
    socket.emit('dataSensors', data, (callback) => {
      // console.log(callback);
    });
  }
}

let getMinutes = () => {
  let minutes = new Date().getMinutes();
  return minutes;
}

async function getData (data) {
  
  let getRefValues = await rp(`${urlServer}/referenceValues`);
        
  let referenceValues = JSON.parse(getRefValues).latestReferenceValues;
        
  // console.log({referenceValues, type: typeof referenceValues, getRefValues});
    
  let getActuators = JSON.parse(await rp(`${urlServer}/actuators`));
  
  // console.log(getActuators);
    
  let actuators = getActuators.latestActuators.actuators;
    
  // console.log(actuators);
    
  if (referenceValues.flag === true) {
      
    maxTemp = referenceValues.maxTemp, minTemp = referenceValues.minTemp,
    maxHum = referenceValues.maxHum, minHum = referenceValues.minHum,
    maxAir = referenceValues.maxAir;
    
    let serialObj = {
      aT: maxTemp,
      iT: minTemp,
      aH: maxHum,
      iH: minHum,
      aA: maxAir,
    };
      
    //console.log(serialObj);
      
    serialPort.write(JSON.stringify(serialObj), function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
      console.log('message written');
    });
      // Open errors will be emitted as an error event
    serialPort.on('error', function(err) {
      console.log('Error: ', err.message);
    });
    
    let optionsRefValues = {
      method: 'POST',
      uri: `${urlServer}/referenceValues`,
      body: {
        maxTemp,
        minTemp,
        maxHum,
        minHum,
        maxAir,
        flag: false
      },
      json: true // Automatically stringifies the body to JSON
    };
    let postRefValues = await rp (optionsRefValues);
    //console.log(postRefValues);
  }
  
  if (getActuators.latestActuators.flag === true) {
    
    switch (actuators[0]) {
      
      case 0:
        luz = false;
        break;
      case 1:
        luz = true;
        break;
    }
    
    switch (actuators[1]) {
      
      case 0:
        ventiladores = false;
        break;
      case 1:
        ventiladores = true;
        break;
    }
    
    let serialObj = {
      A: actuators
    };
    
    serialPort.write(JSON.stringify(serialObj), function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
      console.log('message written');
    });
      // Open errors will be emitted as an error event
    serialPort.on('error', function(err) {
      console.log('Error: ', err.message);
    });
    
    let optionsActuators = {
      method: 'POST',
      uri: `${urlServer}/actuators`,
      body: {
        actuators,
        date: new Date(),
        flag: false
      },
      json: true // Automatically stringifies the body to JSON
    };
    
    let postActuators = await rp (optionsActuators);
    
    //console.log(postActuators);
  }
}

let external_data;

serialPort.on("open", function() {
  
    console.log('open');

    serialPort.on('data', function(data) {
        
        try {
          console.log('data received: ' + data);
          let dataRecived = JSON.parse(data);
          // luz posicion 0 del array
          // ventilador posicion 1 del array
          
          if (dataRecived.actuadores[0] === true && luz === false) {
            request({
            url: `${urlServer}/actuators`,
            method: 'POST',
            body:{
              actuators: [1,dataRecived.actuadores[1],0,0],
              date: new Date(),
              swicth: 'manual',
              flag: false
            },
            json:true
            
            }, (err, res, body) => {
              // console.log("Luz" +  JSON.stringify(body));
            });
            luz = true;
          }
          
          if (dataRecived.actuadores[0] === false && luz === true) {
            request({
            url: `${urlServer}/actuators`,
            method: 'POST',
            body:{
              actuators: [0,dataRecived.actuadores[1],0,0],
              date: new Date(),
              swicth: 'manual',
              flag: false
            },
            json:true
            
            }, (err, res, body) => {
              // console.log("Luz" +  JSON.stringify(body));
            });
            luz = false;
          }
          
          if (dataRecived.actuadores[1] === true && ventiladores === false) {
            request({
            url: `${urlServer}/actuators`,
            method: 'POST',
            body:{
              actuators: [dataRecived.actuadores[0],1,0,0],
              date: new Date(),
              swicth: 'manual',
              flag: false
            },
            json:true
            
            }, (err, res, body) => {
              // console.log("Ventilador" +  JSON.stringify(body));
            });
            ventiladores = true;
          }
          
          if (dataRecived.actuadores[1] === false && ventiladores === true) {
            request({
            url: `${urlServer}/actuators`,
            method: 'POST',
            body:{
              actuators: [dataRecived.actuadores[0],0,0,0],
              date: new Date(),
              swicth: 'manual',
              flag: false
            },
            json:true
            
            }, (err, res, body) => {
              // console.log("Ventilador" +  JSON.stringify(body));
            });
            ventiladores = false;
          }
          
          luz = dataRecived.actuadores[0];
          ventiladores = dataRecived.actuadores[1];
            // NOTIFICACION TEMPERATURA
            if (dataRecived && temperature === false) {
                dataRecived.temperature.forEach((element, index) => {
                    if (element > maxTemp || element < minTemp) {
                        console.log('notificacion temperatura');
                        socket.emit('nfTemperature', {
                            module: index + 1,
                            temperature: element,
                            maxTemp,
                            minTemp
                        }, (cb) => console.log(cb));
                        temperature = true;
                    }
                });
            }
            if (dataRecived && temperature === true) {
                if ((dataRecived.temperature[0] > minTemp && dataRecived.temperature[0] < maxTemp) &&
                    (dataRecived.temperature[1] > minTemp && dataRecived.temperature[1] < maxTemp) &&
                    (dataRecived.temperature[2] > minTemp && dataRecived.temperature[2] < maxTemp) &&
                    (dataRecived.temperature[3] > minTemp && dataRecived.temperature[3] < maxTemp)) {
                      temperature = false;
                      socket.emit('nfTemperature', {
                            module: index + 1,
                            temperature: element,
                            maxTemp,
                            minTemp
                        }, (cb) => console.log(cb));
                }
            }

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
    getData();
}, 65000);

