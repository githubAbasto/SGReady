load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_rpc.js');
load('api_mqtt.js');
load('api_timer.js');
load('api_sys.js');
load('api_i2c.js');

let I2CADDRESS                =0x11;
let CMD_CHANNEL_CTRL					=0x0010;
let  CMD_SAVE_I2C_ADDR					=0x011;
let  CMD_READ_I2C_ADDR					=0x0012;
let CMD_READ_FIRMWARE_VER		=0x13;

let online = false;                               // Connected to the cloud?
let relay = I2C.get();
let result;

//scan I2C bus for ACK on all adresses and reset to 0 if any valid
for (let i = 0; i < 127; i++) {
  result=I2C.writeRegB(relay, i, CMD_CHANNEL_CTRL, 0);
  if(result) {
    print("Found I2C device on adress "+ JSON.stringify(i));
  I2CADDRESS=i; // set last found adress to the one for relay com... 
  }
} 


//Pin Mapping
let SGApin=33; 
let SGBpin=32;
let SGAvalue=0;
let SGBvalue=0;
let relayv=0;

GPIO.set_mode(SGApin, GPIO.MODE_OUTPUT);
GPIO.set_mode(SGBpin, GPIO.MODE_OUTPUT); 

GPIO.setup_output(SGApin, 0);
GPIO.setup_output(SGBpin, 0);

//Update state every 60 second, and report to cloud if online
Timer.set(60000, Timer.REPEAT, function() {
    if (online ){ 
    reportState();
  } 
}, null) ;

let SGAState = [2];
SGAState[0] = ["Normal","LowPrice"]

SGAState[1] = ["Inhibit","OverCapacity"];


function reportState() {
    
  let sendMQTT = true;
  let message =JSON.stringify({ SGA: SGAvalue, SGB: SGBvalue, Vent: ((relayv&0x04)===0?"Normal":"Inhibit"), SGReady: SGAState[SGAvalue][SGBvalue] });

    if (MQTT.isConnected() && sendMQTT) {
      let topic = Cfg.get('site.id') + '/'+Cfg.get('site.position')+'/Status';
      print('== Publishing to ' + topic + ':', message);      
      MQTT.pub(topic, message, 0 /* QoS */);

    } else if (sendMQTT) {
      print('== Not connected!');
    }

} 

MQTT.sub( Cfg.get('site.id') + '/'+Cfg.get('site.position')+'/SGReady', function(conn, topic, msg) {
  print('Topic:', topic, 'message:', msg);
  relayv &=~3;
  if (msg==='Normal') {
    SGAvalue=0;
    SGBvalue=0;
  }

  if (msg==='Inhibit') {
    SGAvalue=1;
    SGBvalue=0;  
    relayv |=0x01;
  }

  if (msg==='LowPrice'){
    SGAvalue=0;
    SGBvalue=1;
    relayv |=0x02; 
  }

  if (msg==='OverCapacity'){
    SGAvalue=1;
    SGBvalue=1;
    relayv |=0x03;
  }
  // Print help
  if (msg==='') {
    let message ="Valid payload:Normal,Inhibit,LowPrice,OverCapacity";
    if (MQTT.isConnected()) {
      let topic = Cfg.get('site.id') + '/'+Cfg.get('site.position')+'/SGReady';
      print('== Publishing to ' + topic + ':', message);      
      MQTT.pub(topic, message, 0 /* QoS */);
    }
  }

  GPIO.setup_output(SGApin, SGAvalue);
  GPIO.setup_output(SGBpin, SGBvalue);
  I2C.writeRegB(relay,I2CADDRESS, CMD_CHANNEL_CTRL,relayv);
  

}, null);

MQTT.sub( Cfg.get('site.id') + '/'+Cfg.get('site.position')+'/Vent', function(conn, topic, msg) {
  print('Topic:', topic, 'message:', msg);
  relayv &=~4;
  if (msg==='Normal') {  
  }

  if (msg==='Inhibit') {
    relayv |=0x04;
  }
  // Print help
  if (msg==='') {
    let message ="Valid payload:Normal,Inhibit";
    if (MQTT.isConnected()) {
      let topic = Cfg.get('site.id') + '/'+Cfg.get('site.position')+'/Vent';
      print('== Publishing to ' + topic + ':', message);      
      MQTT.pub(topic, message, 0 /* QoS */);
    }
  }
  
  I2C.writeRegB(relay,I2CADDRESS, CMD_CHANNEL_CTRL,relayv);
  
}, null);


Event.on(Event.CLOUD_CONNECTED, function() {
  online = true;
 // GPIO.write(17,0); // LED ON wHen connected to cloud 
}, null);

Event.on(Event.CLOUD_DISCONNECTED, function() {
  online = false;
}, null);
