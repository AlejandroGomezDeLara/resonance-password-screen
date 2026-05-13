#!/usr/bin/env bash
set -e

cd /home/pi/resonance-password-screen

pinctrl set 18 op
pinctrl set 18 dl

exec node server.js
