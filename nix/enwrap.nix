{
  inputs,
  buildFHSEnv,
  callPackage,
  lib,

  launchEnv,
  ...
}:
let
  mcl = callPackage ./mcl.nix { inherit inputs; };
in
  buildFHSEnv {
    name = "mcl-launcher";
    targetPkgs = pkgs: builtins.concatLists [
      [ mcl ]
      (with pkgs; [
      # For MCL
        libnotify
        gtk3
        webkitgtk_4_1
        libayatana-appindicator
        gdk-pixbuf
        cairo
        glib
        dbus
        libsoup_3
        glib-networking
        cacert
      # For Minecraft
        stdenv.cc.cc.lib
        ## native versions
        glfw3-minecraft
        openal
        ## openal
        alsa-lib
        libjack2
        libpulseaudio
        pipewire
        ## glfw
        libGL
        libx11
        libxcursor
        libxext
        libxrandr
        libxxf86vm
        wayland
        udev          # oshi
        vulkan-loader # VulkanMod's lwjglt
        flite
        gamemode
        libusb1
      ])
    ];
    profile = ''
      set -o allexport
      ${lib.toShellVars launchEnv}
      set +o allexport
    '';
    runScript = ''
      "${mcl}/bin/MCL Launcher"
    '';
  }
