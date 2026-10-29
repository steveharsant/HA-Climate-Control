# HA Climate Control

Automatic per-room climate control for Home Assistant, in a single Lovelace card.

Point the card at any `climate` entity. If the room has not been set up yet, the card shows a **Set up this room** button that creates everything it needs:

- 9 helpers (`input_boolean`, `input_number`, `input_datetime`, `input_select`) named `<room>_hvac_*`
- 1 automation (`room_hvac_<room>`) that does the thermostat control

After setup the card becomes the control panel for that room:

- Mode buttons (Off / Heat / Cool / Fan)
- **Auto control** switch – when off, the rest of the card is hidden
- One dual-handle **comfort range** slider: heat below the low handle, cool above the high handle
- **More settings** (collapsed by default): how far inside the limit to aim, optional fan-only start time, optional off time

## Installation (HACS)

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/steveharsant/ha-climate-control`, category **Dashboard**.
2. Install **HA Climate Control** and reload the browser.
3. HACS adds the resource automatically (`/hacsfiles/ha-climate-control/ha-climate-control.js`). If you use YAML dashboards, add it manually as a `module`.

## Usage

Add the **Smart Room HVAC** card from the card picker (it has a visual editor), or in YAML:

```yaml
type: custom:smart-room-hvac-card
climate: climate.guest
temperature: sensor.guest_inside_temperature   # optional
name: Guest Room                               # optional
expanded: false                                # optional
```

The first time you open the card for a room, choose the fan speed / preset / swing the automation should apply when it starts heating or cooling, then press **Set up this room**. Setup needs an administrator account. It is safe to press again if something fails – existing helpers are reused.

`custom:room-hvac-card` (the control panel on its own) is also registered for rooms whose helpers you made by hand; it takes `climate`, `prefix` (helper prefix, e.g. `guest_hvac`), optional `temperature`, `name`, `expanded` and an `entities` map to override individual helper ids.

## How it works

The settings live in Home Assistant helpers, so they survive restarts and can be used in other automations. The generated automation triggers on the temperature, any setting change, and the two schedule times. Auto control starts **off** after setup.

## Licence

GPL-3.0
