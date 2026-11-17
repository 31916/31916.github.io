#!/bin/sh
set -eu

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
theme_name=Number_Cursors_4
source_theme="$script_directory/$theme_name"
data_home=${XDG_DATA_HOME:-"$HOME/.local/share"}
destination="$data_home/icons/$theme_name"
compatibility="$HOME/.icons/$theme_name"

if [ ! -f "$source_theme/index.theme" ] || [ ! -f "$source_theme/cursors/default" ]; then
    printf '%s\n' 'Extract the complete Linux folder before running this script.' >&2
    exit 1
fi

case "$data_home" in
    /*) ;;
    *)
        printf '%s\n' 'XDG_DATA_HOME must be an absolute path.' >&2
        exit 1
        ;;
esac

if [ -e "$compatibility" ] || [ -L "$compatibility" ]; then
    if [ "$(realpath -m -- "$compatibility")" != "$(realpath -m -- "$destination")" ] && {
        [ -L "$compatibility" ] || [ ! -d "$compatibility" ]
    }; then
        printf 'Resolve the existing path before installing: %s\n' "$compatibility" >&2
        exit 1
    fi
fi

mkdir -p -- "$destination" "$HOME/.icons"
if [ "$(realpath -- "$source_theme")" != "$(realpath -- "$destination")" ]; then
    cp -R -- "$source_theme/." "$destination/"
fi

if [ ! -e "$compatibility" ] && [ ! -L "$compatibility" ]; then
    ln -s -- "$destination" "$compatibility"
elif [ "$(realpath -- "$compatibility")" != "$(realpath -- "$destination")" ]; then
    cp -R -- "$source_theme/." "$compatibility/"
fi

case "${XDG_CURRENT_DESKTOP:-}" in
    *GNOME*|*gnome*)
        gsettings set org.gnome.desktop.interface cursor-theme "$theme_name"
        ;;
esac

printf 'Installed %s in %s\n' "$theme_name" "$destination"
printf '%s\n' 'In KDE Plasma, select Number Cursors 4 in System Settings > Cursors.'
printf '%s\n' 'Quit and reopen applications to reload the theme.'
printf '%s\n' 'After an OS upgrade, log out and back in to restart the desktop.'
printf '%s\n' 'See README.txt if Settings still uses the standard cursor.'
