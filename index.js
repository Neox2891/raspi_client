const Raspi = require('raspi-io');
const five = require('johnny-five');
const SerialPort = require('serialport');
const request = require('request');

const socket = require('socket.io-client')('http://192.168.0.16:3000');

var Readline = SerialPort.parsers.readline;

var serialPort = new SerialPort("/dev/ttyACM0", {
    baudrate: 9600,
    parser: Readline("\r\n")
});

let temperature = false;
// const board = new five.Board({
//   io: new Raspi()
// });

//     board.on('ready', () => {
//       console.log('dentro de board');
//       setInterval (()=>{
//         const led = new five.Led('P1-7');
//         led.on();
//         setTimeout(() => { led.off() }, 2000);
//       }, 8000);
//     });

socket.on('connect', () => {
    console.log('Conectado con el servidor');
});

socket.on('disconnect', () => {
    console.log('Desconectado del servidor');
});

let realDataSend = (data) => {
    socket.emit('dataSensors', data, (callback) => {
        console.log(callback);
    });
}

function enviarDatos(data) {
    let options = {
        url: 'http://192.168.0.16:3000/sensores/datos',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: data
    }
    request(options, (err, res, body) => {
        console.log(err);
        console.log('Respuesta: ', body);
        console.log(typeof body);
    });
}

var external_data = "jgcvjg";

serialPort.on("open", function() {
    console.log('open');

    serialPort.on('data', function(data) {
        console.log('data received: ' + data);

        try {
            let dataRecived = JSON.parse(data);
            // NOTIFICACION TEMPERATURA
            if (dataRecived && temperature === false) {
                dataRecived.temperature.forEach((element, index) => {
                    if (element > 35 || element < 34) {
                        console.log('notificacion temperatura');
                        socket.emit('nfTemperature', {
                            module: index + 1,
                            temperature: element
                        }, (cb) => console.log(cb));
                        temperature = true;
                    }
                });
            }
            if (dataRecived && temperature === true) {
                if ((dataRecived.temperature[0] > 33 && dataRecived.temperature[0] < 36) &&
                    (dataRecived.temperature[1] > 33 && dataRecived.temperature[1] < 36) &&
                    (dataRecived.temperature[2] > 33 && dataRecived.temperature[2] < 36) &&
                    (dataRecived.temperature[3] > 33 && dataRecived.temperature[3] < 36)) {
                    temperature = false;
                }
            }

            console.log(temperature);

            external_data = data;
            realDataSend(data);
        } catch (e) {
            console.log("Communication error");
        }
    });

    setInterval(function() {
        enviarDatos(external_data);
        socket.emit('dataDb', external_data, (callback) => {
            console.log(callback);
        });
    }, 5000);
});