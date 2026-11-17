Number Cursors 4 for Linux

Installation and updates

1. Extract the complete ZIP and open its Linux folder in a terminal.
2. Run:

   sh install.sh

The script installs the theme in ~/.local/share/icons/Number_Cursors_4,
or the icons folder under XDG_DATA_HOME when that variable is set.
It also makes the theme available at ~/.icons/Number_Cursors_4 for
X11 and XWayland applications. Run the script again to install an update.

In GNOME, the script selects Number Cursors 4 for your account.
In KDE Plasma, open System Settings > Cursors and select Number Cursors 4.
Quit and reopen applications to reload the theme.

Settings uses the standard cursor after an OS upgrade

Log out and back in after upgrading the desktop. A running desktop can
still use its old version while newly opened applications use updated
libraries.

GTK 4.20 and later use the Wayland cursor-shape protocol. When the
running compositor does not provide it, GTK uses its built-in cursors.
Installing additional theme files cannot change that fallback.
GNOME 48 and later provide the protocol.

To open GNOME Settings with the selected theme during that older session,
fully close Settings, then run:

   GDK_BACKEND=x11 gnome-control-center

This command uses XWayland for that launch. A logout and login starts the
updated desktop so Settings can use Wayland with the selected theme.

Technical references

https://github.com/GNOME/gtk/blob/4.22.4/NEWS
https://github.com/GNOME/gtk/blob/4.22.4/gdk/wayland/gdkcursor-wayland.c
