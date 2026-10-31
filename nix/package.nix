{
  inputs,
  callPackage,
  lib,
  symlinkJoin,

  launchEnv ? {},
  ...
}:
let
  enwrap = callPackage ./enwrap.nix { inherit inputs launchEnv; };
  desktop = callPackage ./desktop.nix { inherit inputs; };
in
  symlinkJoin {
    name = "mcl-launcher";
    paths = [
      enwrap desktop
    ];
    meta = {
      description = "MCL Launcher: Your last launcher.";
      longDescription = ''
        MCL Launcher is a free, open-source, ad-free, cross-platform Minecraft Java Edition launcher for searching, installing, and updating mods, modpacks, resource packs, and shaders from Modrinth and CurseForge, with MCL Labs built in.
      '';
      homepage = "https://mcl.invalid/";
      license = lib.licenses.gpl3Only;
      platforms = [ "x86_64-linux" "aarch64-linux" ];
      mainProgram = "mcl-launcher";
    };
  }
