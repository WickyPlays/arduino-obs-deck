const OBSWebSocket = require("obs-websocket-js").default;
const { SerialPort, ReadlineParser } = require("serialport");

const obs = new OBSWebSocket();
const port = new SerialPort({ path: "COM4", baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

let currentScene = "General";

(async () => {
  try {
    await obs.connect("ws://localhost:4455", "hagXJUyWr4Qo4q5s");
    console.log("Connected to OBS WebSocket");

    // On startup, sync LED with OBS state
    const status = await obs.call("GetRecordStatus");
    port.write(status.outputActive ? "1" : "0");
  } catch (err) {
    console.error("Failed to connect to OBS:", err);
  }
})();

// Listen for button press from Arduino
parser.on("data", async (data) => {
  if (data === "BTN-RECORD") {
    console.log("Button pressed → toggling recording");
    try {
      await obs.call("ToggleRecord");
    } catch (err) {
      console.error("Failed to toggle recording:", err);
    }
  }

  if (data === "BTN-SFX") {
    console.log("Button pressed → toggle media CharlieWOO");
    try {
      await obs.call("TriggerMediaInputAction", {
        inputName: "CharlieWOO",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
      });
      await obs.call("TriggerMediaInputAction", {
        inputName: "CharlieWOO",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
      });
      console.log("Started CharlieWOO");
    } catch (err) {
      console.error("Failed to toggle media source:", err);
    }
  }

  if (data === "BTN-MUTE") {
    console.log("Button pressed → toggling mute");
    try {
      await obs.call("ToggleInputMute", { inputName: "Mic/Aux" });
    } catch (err) {
      console.error("Failed to toggle mute:", err);
    }
  }

  if (data === "BTN-SCENE") {
  console.log("Button pressed → toggle scene");
  try {
    if (currentScene === "General") {
      await obs.call('SetCurrentProgramScene', { sceneName: "BRB" });
      currentScene = "BRB";
      port.write('5'); // LED = BRB
    } else {
      await obs.call('SetCurrentProgramScene', { sceneName: "General" });
      currentScene = "General";
      port.write('4'); // LED = General
    }
  } catch (err) {
    console.error("Failed to toggle scene:", err);
  }
}
});

// Update LED when recording state changes
obs.on("RecordStateChanged", (data) => {
  if (data.outputActive) {
    console.log("Recording started → LED ON");
    port.write("1");
  } else {
    console.log("Recording stopped → LED OFF");
    port.write("0");
  }
});

obs.on('InputMuteStateChanged', (data) => {
  if (data.inputName === "Mic/Aux") {
    if (data.inputMuted) {
      console.log("Mic muted → LED ON (pin 12)");
      port.write('2');
    } else {
      console.log("Mic unmuted → LED OFF (pin 12)");
      port.write('3');
    }
  }
});

obs.on('CurrentProgramSceneChanged', (data) => {
  if (data.sceneName === "General") {
    console.log("Scene switched to General → LED pin 11 ON");
    currentScene = "General";
    port.write('4');
  } else if (data.sceneName === "BRB") {
    console.log("Scene switched to BRB → LED pin 10 ON");
    currentScene = "BRB";
    port.write('5');
  }
});