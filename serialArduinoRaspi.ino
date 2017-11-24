#include <ArduinoJson.h>

// LED on pin 13
int led = 13;

// Incoming serial data
String data;  
 
void setup() {                
  // Pin 12 set to OUTPUT
  pinMode(led, OUTPUT);
  // Start listening on the serialport
 //char* string = makeString();
  Serial.begin(9600);
}

void loop() {
  //data = Serial.readString();
  StaticJsonBuffer<200> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["sensor"] = "gps";
  root["time"] = 1351824120;    
  JsonArray& data = root.createNestedArray("data");
  data.add(48.756080);
  data.add(2.302038);
  char jsonChar[100];
  root.printTo((char*)jsonChar, root.measureLength() + 1);
  Serial.println (jsonChar);
  delay(1000);
}
