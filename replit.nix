{pkgs}: {
  deps = [
    pkgs.mesa
    pkgs.chromium
    pkgs.fontconfig
    pkgs.cairo
    pkgs.pango
    pkgs.alsa-lib
    pkgs.xorg.libXtst
    pkgs.xorg.libXrender
    pkgs.xorg.libXi
    pkgs.xorg.libXcursor
    pkgs.xorg.libxcb
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.expat
    pkgs.dbus
    pkgs.cups
    pkgs.atk
    pkgs.nspr
    pkgs.nss
    pkgs.glib
  ];
}
