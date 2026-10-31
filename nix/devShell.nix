{
  inputs,
  callPackage,
  mkShell,
  writeShellScriptBin,
  ...
}:
(
  let
    mcl = callPackage ./mcl.nix { inherit inputs; };
    update-gradle-deps = writeShellScriptBin "update-gradle-deps" ''
      ${mcl.mitmCache.updateScript}
    '';
    update-pnpm-deps = writeShellScriptBin "update-pnpm-deps" (
      builtins.readFile ./update-pnpm-deps.sh
    );
  in
    mkShell {
      packages = [
        update-gradle-deps
        update-pnpm-deps
      ];
    }
)
