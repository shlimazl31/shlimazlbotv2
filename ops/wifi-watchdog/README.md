# Wi-Fi / Network Watchdog

This watchdog is for a Linux host where the network sometimes drops and a reboot restores connectivity.

It is intentionally conservative:

- Checks multiple public IP targets before doing anything.
- Tries to restart the network stack first.
- Reboots only if the network is still down.
- Uses a cooldown so it does not reboot-loop.

## Install

Run these commands on the Linux machine that loses network access:

```bash
sudo install -m 0755 wifi-watchdog.sh /usr/local/sbin/wifi-watchdog.sh
sudo install -m 0644 wifi-watchdog.service /etc/systemd/system/wifi-watchdog.service
sudo install -m 0644 wifi-watchdog.timer /etc/systemd/system/wifi-watchdog.timer
sudo systemctl daemon-reload
sudo systemctl enable --now wifi-watchdog.timer
```

## Check Logs

```bash
journalctl -u wifi-watchdog.service -n 80 --no-pager
systemctl list-timers wifi-watchdog.timer
```

## Tune

You can override settings with a systemd drop-in:

```bash
sudo systemctl edit wifi-watchdog.service
```

Example:

```ini
[Service]
Environment=COOLDOWN_SECONDS=1800
Environment=WATCHDOG_TARGETS=1.1.1.1 8.8.8.8 9.9.9.9
```

Then reload:

```bash
sudo systemctl daemon-reload
sudo systemctl restart wifi-watchdog.timer
```
