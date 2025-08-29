const OBSWebSocket = require("obs-websocket-js").default;
const { SerialPort, ReadlineParser } = require("serialport");

const obs = new OBSWebSocket();
const port = new SerialPort({ path: "COM3", baudRate: 9600 });
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
    try {
      await obs.call("TriggerMediaInputAction", {
        inputName: "GG",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
      });
      await obs.call("TriggerMediaInputAction", {
        inputName: "GG",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
      });
    } catch (err) {
      console.error("Failed to toggle media source:", err);
    }
  }

  if (data === "BTN-MUTE") {
    try {
      await obs.call("ToggleInputMute", { inputName: "Mic/Aux" });
    } catch (err) {
      console.error("Failed to toggle mute:", err);
    }
  }

  if (data === "BTN-SCENE") {
    try {
      if (currentScene === "General") {
        await obs.call("SetCurrentProgramScene", { sceneName: "BRB" });
        currentScene = "BRB";
        port.write("5"); // LED = BRB
      } else {
        await obs.call("SetCurrentProgramScene", { sceneName: "General" });
        currentScene = "General";
        port.write("4"); // LED = General
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

obs.on("InputMuteStateChanged", (data) => {
  if (data.inputName === "Mic/Aux") {
    if (data.inputMuted) {
      port.write("2");
    } else {
      port.write("3");
    }
  }
});

obs.on("CurrentProgramSceneChanged", (data) => {
  if (data.sceneName === "General") {
    currentScene = "General";
    port.write("4");
  } else if (data.sceneName === "BRB") {
    currentScene = "BRB";
    port.write("5");
  }
});
