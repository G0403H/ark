# Hardware Integrations & Field Schematics

KOVCHEG bridges digital software with physical emergency equipment using standard browser hardware APIs.

---

## 1. External Bluetooth Geiger Counter (Web Bluetooth BLE)

Smartphones lack internal Geiger-Müller tubes. KOVCHEG connects to physical dosimeters to display real-time radiation readings in the Stalker HUD.

### Supported Devices
- **RadiaCode 101 / 102 / 103** (Scintillation detector).
- **AtomFast** (Scintillator BLE dosimeter).
- **Custom ESP32 / Arduino BLE DIY Dosimeters**:
  - Uses standard Environmental Sensing GATT service (`0x181A`) or custom serial characteristics.

### DIY ESP32 & SBM-20 Schematics
- **High-Voltage Boost Inverter**: Generates 400V DC required by Soviet SBM-20 / STS-5 or Chinese J305 tubes.
- **Pulse Detection**: Anode pulse fed into ESP32 GPIO via optocoupler or 2N3904 transistor.
- **BLE Transmission**: ESP32 advertises CPS (Counts Per Second) which KOVCHEG converts to `µSv/h` (standard conversion factor: $CPS \times 0.0057 = \mu\text{Sv/h}$ for SBM-20 on Cesium-137 / Cobalt-60).

---

## 2. Radio Audio Modem Cable (Smartphone to Baofeng / Walkie-Talkie)

Enables digital text transmission and BitChat mesh messaging over VHF/UHF analog radios without internet or cellular connectivity.

### Kenwood 2-Pin Connector Pinout
- **2.5 mm TRS (Speaker / Audio In)**:
  - Tip: Speaker Out from Radio -> Smartphone Line-In / TRRS Mic.
  - Sleeve: Ground.
- **3.5 mm TRS (Mic / PTT)**:
  - Tip: Mic In to Radio -> Smartphone Headphone Left/Right Out.
  - Sleeve: PTT / Ground.

### Audio Modulation
- Uses standard AFSK (Audio Frequency Shift Keying) at 1200 baud (Bell 202 tones: Mark 1200 Hz, Space 2200 Hz).
- VOX (Voice Operated Exchange) on the Baofeng radio automatically triggers transmission when audio tones are played by the phone.

---

## 3. Tape-Measure 3-Element Yagi Antenna (144–146 MHz / 430–440 MHz)

Extends handheld radio range from 2–3 km line-of-sight to **over 35–45 km** to reach emergency repeaters or neighboring communities.

### Materials
- 25 mm PVC electrical conduit pipe (1.2 meters).
- Steel carpenter's measuring tape (1 inch wide, cut with tin snips).
- 3/4 inch PVC cross connectors and hose clamps.
- RG-58 50-Ohm coaxial cable with BNC or SMA male plug.

### Element Dimensions (145 MHz 2m Band)
- **Reflector**: 102 cm (attached at 0 cm mark).
- **Driven Element (Split Dipole)**: 96 cm total (two 47 cm halves with 2 cm center gap, hair-pin matching loop).
- **Director**: 90 cm (attached at 60 cm mark).
