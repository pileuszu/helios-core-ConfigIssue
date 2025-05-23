# Helios-Core

A library containing core mechanisms for Helios Launcher

### Requirements

* Node.js 20 (minimum)

helios-core will always use the same minimum node version as Helios Launcher.

## Auth

### Supported Auth Providers

* Mojang
* Microsoft

### Provider Information

#### Mojang

Mojang authentication makes use of the Yggdrasil scheme. See https://wiki.vg/Authentication

#### Microsoft

Microsoft authentication uses OAuth 2.0 with Azure. See https://wiki.vg/Microsoft_Authentication_Scheme

### Usage

Options are loaded once during the initial setup.  
Any changes made to the options afterward will not take effect.

### LICENSE

LGPL-3.0