const Raspi = require('raspi-io');
const five = require('johnny-five');
const SerialPort = require('serialport');
const request = require('request');

const socket = require('socket.io-client');
socket('http://192.168.0.16:3000');

var Readline = SerialPort.parsers.readline;

var serialPort = new SerialPort("/dev/ttyACM0", {
  baudrate: 9600,
  parser: Readline("\r\n")
});
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
    url: 'http://192.168.0.16:3000/sensores',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: data
  }
  request(options, (err, res, body) => {
    console.log(err);
    console.log('Respuesta: ', res.body);
    console.log(typeof body);
  });
}
var external_data = "jgcvjg";
serialPort.on("open", function () {
  console.log('open');
  serialPort.on('data', function (data) {
    //console.log('data received: ' + data);
    try {
      console.log(JSON.parse(data));
      external_data = data;
      // realDataSend(data);
    } catch (e) {
      console.log("Communication error");
    }
  });
  setInterval(function () { enviarDatos(external_data) }, 5000);
});