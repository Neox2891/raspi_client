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

let humidity = false;
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
        //console.log('data received: ' + data);
        let arrH = [];
        let objG = {};
        try {
            let dataRecived = JSON.parse(data);

            for (let props in dataRecived) {

                if (dataRecived[props].temperature > 34 || dataRecived[props].temperature < 20) {
                    socket.emit('nfTemperature', {
                        module: props,
                        temperature: dataRecived[props].temperature
                    });
                }


                arrH.push(dataRecived[props].humidity);

                if (arrH.length > 4 && humidity === true) {
                    arrH = [];
                }

                if (arrH.length === 4 && humidity == false) {
                    arrH.forEach((element, index) => {
                        if (element > 52) {
                            socket.emit('nfHumidity', {
                                module: index + 1,
                                humidity: element
                            }, (cb) => console.log(cb));
                            humidity = true;
                        }
                        if (element < 30) {
                            socket.emit('nfHumidity', {
                                module: index + 1,
                                humidity: element
                            }, (cb) => console.log(cb));
                            humidity = true;
                        }
                    });
                    arrH = [];
                }

                console.log(arrH);

                if ((arrH[0] <= 51 && arrH[0] > 30) &&
                    (arrH[1] <= 51 && arrH[1] > 30) &&
                    (arrH[2] <= 51 && arrH[2] > 30) &&
                    (arrH[3] <= 51 && arrH[3] > 30)) {
                    humidity = false;
                }

                console.log(humidity);

                if (dataRecived[props].ammonia > 600) {
                    socket.emit('nfAmmonia', {
                        module: props,
                        ammonia: dataRecived[props].ammonia
                    });
                }

                if (dataRecived[props].fire == 1) {
                    socket.emit('nfFire', {
                        module: props,
                        fire: dataRecived[props].fire
                    });
                }

                if (dataRecived[props].rain == 1) {
                    socket.emit('nfRain', {
                        module: props,
                        rain: dataRecived[props].rain
                    });
                }
            }

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