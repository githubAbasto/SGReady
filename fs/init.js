load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_rpc.js');
load('api_mqtt.js');
load('api_timer.js');
load('api_sys.js');



let online = false;                               // Connected to the cloud?
let SGReadyA=false;
let SGReadyB=false; 


let SGA=32;
let SGB=33;

GPIO.set_mode(32, GPIO.MODE_OUTPUT);
GPIO.set_mode(33, GPIO.MODE_OUTPUT); 


// Init outputs to 0 (normal mode)
GPIO.setup_output(SGA, 0);
GPIO.setup_output(SGB, 0);

Timer.set(5000, Timer.REPEAT, function() {
    print('Timer publish to MQTT');      
    reportState();
}, null);
  
function reportState() {
    
    let sendMQTT = true;
    let message =JSON.stringify({ "SGReady": SGReadyA,SGReadyB});
    print ('Topic', message);
    if (MQTT.isConnected() && sendMQTT) {
      let topic = Cfg.get('site.id') + '/SGReady';
      print('== Publishing to ' + topic + ':', message);      
      MQTT.pub(topic, message, 0 /* QoS */);

    } else if (sendMQTT) {
      print('== Not connected!');
    }

} 

MQTT.sub( Cfg.get('site.id') + '/SGReady', function(conn, topic, msg) {
  print('Topic:', topic, 'message:', msg);
  if (msg=="Normal") {
    GPIO.setup_output(SGA, 0);
    GPIO.setup_output(SGB, 0);
  }
  if (msg=='Inhibit'){
    GPIO.setup_output(SGA, 1);
    GPIO.setup_output(SGB, 0);
  }
  if (msg=='LowPrice'){
    GPIO.setup_output(SGA, 0);
    GPIO.setup_output(SGB, 1);
  }
  if(msg=='OverCapacity'){
    GPIO.setup_output(SGA, 1);
    GPIO.setup_output(SGB, 1);
  }
  
}, null);


Event.on(Event.CLOUD_CONNECTED, function() {
  online = true;

}, null);

Event.on(Event.CLOUD_DISCONNECTED, function() {
  online = false;
}, null);
