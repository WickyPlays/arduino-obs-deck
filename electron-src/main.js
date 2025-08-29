const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const OBSWebSocket = require("obs-websocket-js").default;
const { SerialPort, ReadlineParser } = require("serialport");

const obs = new OBSWebSocket();
const port = new SerialPort({ path: "COM5", baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

let mainWindow;
let currentScene = "General";

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.setMenu(null);

  await mainWindow.loadFile("index.html");
}

// Electron lifecycle
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ===================== OBS logic ===================== //
(async () => {
  try {
    await obs.connect("ws://localhost:4455", "hagXJUyWr4Qo4q5s");
    console.log("Connected to OBS WebSocket");

    const status = await obs.call("GetRecordStatus");
    port.write(status.outputActive ? "1" : "0");
  } catch (err) {
    console.error("Failed to connect to OBS:", err);
  }
})();

// Listen for button presses from Arduino
parser.on("data", async (data) => {
  if (data === "BTN-RECORD") {
    await obs.call("ToggleRecord");
  }
  if (data === "BTN-SFX") {
    await obs.call("TriggerMediaInputAction", {
      inputName: "GG",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
    });
    await obs.call("TriggerMediaInputAction", {
      inputName: "GG",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
    });
  }
  if (data === "BTN-MUTE") {
    await obs.call("ToggleInputMute", { inputName: "Mic/Aux" });
  }
  if (data === "BTN-SCENE") {
    if (currentScene === "General") {
      await obs.call("SetCurrentProgramScene", { sceneName: "BRB" });
      currentScene = "BRB";
      port.write("5");
    } else {
      await obs.call("SetCurrentProgramScene", { sceneName: "General" });
      currentScene = "General";
      port.write("4");
    }
  }

  if (data.startsWith("VOL:")) {
    const voltage = parseFloat(data.split(":")[1]);
    const volume = Math.max(0, Math.min(1, voltage / 4.57));
    await obs.call("SetInputVolume", {
      inputName: "Desktop Audio",
      inputVolumeMul: volume,
    });
    if (mainWindow) {
      mainWindow.webContents.send("pot-update", { voltage, volume });
    }
  }
});

// Update LEDs and UI when OBS state changes
obs.on("RecordStateChanged", (data) => {
  port.write(data.outputActive ? "1" : "0");
  if (mainWindow) mainWindow.webContents.send("record-state", data.outputActive);
});

obs.on("InputMuteStateChanged", (data) => {
  if (data.inputName === "Mic/Aux") {
    port.write(data.inputMuted ? "2" : "3");
    if (mainWindow) mainWindow.webContents.send("mute-state", data.inputMuted);
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
  if (mainWindow) mainWindow.webContents.send("scene-state", currentScene);
});
