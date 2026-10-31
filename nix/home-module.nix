{
  inputs,
  legacyPackages,
  ...
}:
{
  config,
  lib,
  pkgs,
  ...
}:
let
  inherit (lib) mkEnableOption mkOption mkIf;
  callPackage = legacyPackages.${pkgs.stdenv.hostPlatform.system}.callPackage;
in
  {
    options.programs.mcl-launcher = {
      enable = mkEnableOption "MCL Launcher";
      launchEnv = mkOption {
        type = with lib.types; attrsOf anything;
        default = {};
        description = ''
          Environment variables or flags to be passed to MCL.
        '';
        example = {
          WEBKIT_DISABLE_DMABUF_RENDERER = 1;
        };
      };
      jres = mkOption {
        type = with lib.types; listOf package;
        default = [];
        description = ''
          (WIP)
          A list of packages of JREs/JDKs to be written into the Java list.
        '';
        example = [ pkgs.jre8 ];
      };
    };

    config = with config.programs.mcl-launcher; mkIf enable {
      home.packages = [ (callPackage ./package.nix { inherit inputs launchEnv; }) ];
    };
  }
