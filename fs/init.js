load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_rpc.js');
load('api_mqtt.js');
load('api_timer.js');
load('api_sys.js');

let online = false;                               // Connected to the cloud?

//Pin Mapping
let SGApin=33; 
let SGBpin=32;
let SGAvalue=0;
let SGBvalue=0;

GPIO.set_mode(SGApin, GPIO.MODE_OUTPUT);
GPIO.set_mode(SGBpin, GPIO.MODE_OUTPUT); 

GPIO.setup_output(SGApin, 0);
GPIO.setup_output(SGBpin, 0);

//Update state every 60 second, and report to cloud if online
Timer.set(600000, Timer.REPEAT, function() {

  if (online ){ 
    reportState();
  } 
}, null) ;

function reportState() {
    
    let sendMQTT = true;
    let message =JSON.stringify({ SGA: SGAvalue, SGB: SGBvalue });
    if (MQTT.isConnected() && sendMQTT) {
      let topic = Cfg.get('site.id') + '/'+Cfg.get('site.position')+'/SGReady';
      print('== Publishing to ' + topic + ':', message);      
      MQTT.pub(topic, message, 0 /* QoS */);

    } else if (sendMQTT) {
      print('== Not connected!');
    }

} 

MQTT.sub( Cfg.get('site.id') + '/'+Cfg.get('site.position')+'/SGReady', function(conn, topic, msg) {
  print('Topic:', topic, 'message:', msg);
  if (msg==='Normal') {
    SGAvalue=0;
    SGBvalue=0;
    
  }
  if (msg==='Inhibit') {
    SGAvalue=1;
    SGBvalue=0;
  }

  if (msg==='LowPrice'){
    SGAvalue=0;
    SGBvalue=1;
  }
  if (msg==='OverCapacity'){
    SGAvalue=1;
    SGBvalue=1;
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
}, null);


Event.on(Event.CLOUD_CONNECTED, function() {
  online = true;
  GPIO.write(17,0); // LED ON wHen connected to cloud 
}, null);

Event.on(Event.CLOUD_DISCONNECTED, function() {
  online = false;
}, null);
