{
  inputs,
  makeDesktopItem,
  ...
}:
makeDesktopItem {
  categories = [ "Game" ];
  desktopName = "MCL Launcher";
  exec = "mcl-launcher";
  icon = "${../apps/app/icons/icon.png}";
  mimeTypes = [
    "application/x-modrinth-modpack+zip"
    "x-scheme-handler/mcl"
  ];
  name = "MCL Launcher";
  startupWMClass = "MCL Launcher";
  terminal = false;
  type = "Application";
}
