//! External "MC Content Localizer" integration.
//!
//! The tool is an MIT-licensed third-party Tauri application. A portable copy is
//! embedded in the launcher resources so the Lab entry works out of the box; the
//! launcher can also download and silently install the official release when the
//! bundled copy is missing (or the user removed it).
//!
//! Launch priority:
//!   1. the path saved in settings (an explicit user choice, highest priority);
//!   2. the bundled copy released to the app data directory;
//!   3. a copy found in the usual system install locations.
//!
//! The renderer never supplies a path to execute: the launcher only runs the
//! resolved path, and download URLs are validated against the upstream GitHub
//! release URL prefix.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{Emitter, Runtime};
use tokio::io::AsyncWriteExt;

/// Folder (relative to the launcher resources root) that carries the tool.
const TOOL_DIR: &str = "tools/mc-content-localizer";
const TOOL_EXE: &str = "mc-content-localizer.exe";
const TOOL_VERSION_FILE: &str = "VERSION.txt";
const TOOL_LICENSE_FILE: &str = "LICENSE-MC-Content-Localizer.txt";
const RELEASE_API: &str = "https://api.github.com/repos/adssadax-1/mc-content-localizer/releases/latest";
const RELEASE_DOWNLOAD_PREFIX: &str =
    "https://github.com/adssadax-1/mc-content-localizer/releases/download/";
const USER_AGENT: &str = "MeetWhale-Launcher";
const INSTALL_TIMEOUT: Duration = Duration::from_secs(180);

/// Where the running tool came from.
#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LocalizerSource {
    /// Explicitly chosen by the user in settings.
    Configured,
    /// Released from the launcher's embedded resources.
    Bundled,
    /// Found in a system install location.
    Detected,
}

/// Resolved tool path for the settings row.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalizerStatus {
    pub path: Option<String>,
    pub source: Option<LocalizerSource>,
    pub version: Option<String>,
}

/// Release metadata shown in the download prompt.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalizerRelease {
    pub tag: String,
    pub version: String,
    pub asset_name: String,
    pub download_url: String,
    pub size: u64,
    pub sha256: Option<String>,
    /// `nsis` installers are installed silently with `/S`; `msi` is reported as
    /// unsupported (no silent path we can drive reliably).
    pub kind: String,
    pub supported: bool,
}

/// Launch/installation failures the UI distinguishes by `code`.
#[derive(Debug, Serialize)]
#[serde(tag = "code", rename_all = "camelCase")]
pub enum LocalizerError {
    /// No configured, bundled, or detected copy exists.
    NotFound {
        path: String,
    },
    /// The resolved file could not be spawned.
    LaunchFailed {
        path: String,
        message: String,
    },
    /// The GitHub API or download request failed.
    NetworkFailed {
        message: String,
    },
    /// GitHub API rate limit hit.
    RateLimited {
        message: String,
    },
    /// No usable release asset (e.g. only an MSI is published).
    AssetUnavailable {
        message: String,
    },
    /// The installer download was interrupted.
    DownloadFailed {
        message: String,
    },
    SizeMismatch {
        expected: u64,
        actual: u64,
    },
    DigestMismatch {
        expected: String,
        actual: String,
    },
    /// The silent installer exited with a failure code.
    InstallFailed {
        message: String,
    },
    /// The silent installer did not finish in time.
    InstallTimeout {
        seconds: u64,
    },
    /// Installation finished but no executable was found afterwards.
    NotFoundAfterInstall {
        message: String,
    },
}

fn candidate_directories() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(profile) = std::env::var_os("USERPROFILE") {
        let profile = PathBuf::from(profile);
        candidates.push(
            profile
                .join("Desktop")
                .join("MC-Content-Localizer-DevTools"),
        );
        candidates.push(
            profile
                .join("Desktop")
                .join("MC汉化")
                .join("MC-Content-Localizer-DevTools"),
        );
        candidates.push(
            profile
                .join("Downloads")
                .join("MC-Content-Localizer-DevTools"),
        );
    }
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        candidates.push(
            PathBuf::from(&local_app_data)
                .join("MC-Content-Localizer-DevTools"),
        );
        candidates.push(
            PathBuf::from(local_app_data)
                .join("Programs")
                .join("MC-Content-Localizer-DevTools"),
        );
    }
    if let Some(program_files) = std::env::var_os("PROGRAMFILES") {
        candidates.push(
            PathBuf::from(program_files).join("MC-Content-Localizer-DevTools"),
        );
    }
    if let Some(program_files_x86) = std::env::var_os("PROGRAMFILES(X86)") {
        candidates.push(
            PathBuf::from(program_files_x86)
                .join("MC-Content-Localizer-DevTools"),
        );
    }
    candidates
}

fn is_executable(path: &Path) -> bool {
    path.is_file()
        && path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
}

/// The released copy that ships with the launcher.
fn bundled_path() -> Option<PathBuf> {
    let directory = crate::bundled_resources::resolve_resources_dir().ok()?;
    let path = directory.join(TOOL_DIR).join(TOOL_EXE);
    is_executable(&path).then_some(path)
}

fn detected_path() -> Option<PathBuf> {
    candidate_directories()
        .into_iter()
        .map(|directory| directory.join(TOOL_EXE))
        .find(|candidate| is_executable(candidate))
}

async fn configured_path() -> Option<PathBuf> {
    let settings = theseus::settings::get().await.ok()?;
    let configured = settings.localizer_path?;
    let path = PathBuf::from(configured.trim());
    is_executable(&path).then_some(path)
}

async fn resolve() -> Option<(PathBuf, LocalizerSource)> {
    if let Some(path) = configured_path().await {
        return Some((path, LocalizerSource::Configured));
    }
    if let Some(path) = bundled_path() {
        return Some((path, LocalizerSource::Bundled));
    }
    detected_path().map(|path| (path, LocalizerSource::Detected))
}

fn bundled_version() -> Option<String> {
    let directory = crate::bundled_resources::resolve_resources_dir().ok()?;
    std::fs::read_to_string(directory.join(TOOL_DIR).join(TOOL_VERSION_FILE))
        .ok()
        .map(|version| version.trim().to_string())
        .filter(|version| !version.is_empty())
}

fn status_from(path: PathBuf, source: LocalizerSource) -> LocalizerStatus {
    LocalizerStatus {
        path: Some(path.to_string_lossy().into_owned()),
        source: Some(source),
        version: bundled_version(),
    }
}

fn empty_status() -> LocalizerStatus {
    LocalizerStatus {
        path: None,
        source: None,
        version: bundled_version(),
    }
}

fn launch(path: &Path) -> Result<(), LocalizerError> {
    let mut command = Command::new(path);
    if let Some(directory) = path.parent() {
        command.current_dir(directory);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command.spawn().map(|_child| ()).map_err(|error| {
        LocalizerError::LaunchFailed {
            path: path.to_string_lossy().into_owned(),
            message: error.to_string(),
        }
    })
}

/// Resolve the tool without launching it (settings row display).
#[tauri::command]
pub async fn localizer_status() -> Result<LocalizerStatus, LocalizerError> {
    Ok(match resolve().await {
        Some((path, source)) => status_from(path, source),
        None => empty_status(),
    })
}

/// Bundled MIT license text, shown on the open-source components page.
#[tauri::command]
pub async fn localizer_license_text() -> Result<Option<String>, LocalizerError>
{
    let Some(directory) =
        crate::bundled_resources::resolve_resources_dir().ok()
    else {
        return Ok(None);
    };
    Ok(std::fs::read_to_string(
        directory.join(TOOL_DIR).join(TOOL_LICENSE_FILE),
    )
    .ok())
}

/// Spawn the resolved tool as a detached process and return its path.
#[tauri::command]
pub async fn launch_localizer<R: Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<String, LocalizerError> {
    let Some((path, source)) = resolve().await else {
        let configured = theseus::settings::get()
            .await
            .ok()
            .and_then(|settings| settings.localizer_path)
            .unwrap_or_default();
        return Err(LocalizerError::NotFound { path: configured });
    };
    launch(&path)?;
    tracing::info!(
        path = %path.display(),
        source = ?source,
        "Launched the external MC Content Localizer"
    );
    Ok(path.to_string_lossy().into_owned())
}

fn network_failure(error: reqwest::Error) -> LocalizerError {
    LocalizerError::NetworkFailed {
        message: error.to_string(),
    }
}

/// Fetch the latest official release and pick the x64 NSIS installer.
#[tauri::command]
pub async fn localizer_release_info() -> Result<LocalizerRelease, LocalizerError>
{
    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(network_failure)?;
    let response = client
        .get(RELEASE_API)
        .send()
        .await
        .map_err(network_failure)?;
    let status = response.status();
    if status == reqwest::StatusCode::FORBIDDEN
        || status == reqwest::StatusCode::TOO_MANY_REQUESTS
    {
        return Err(LocalizerError::RateLimited {
            message: status.to_string(),
        });
    }
    if !status.is_success() {
        return Err(LocalizerError::NetworkFailed {
            message: format!("GitHub API returned {status}"),
        });
    }
    let json: serde_json::Value =
        response.json().await.map_err(network_failure)?;
    parse_release(&json)
}

fn parse_release(
    json: &serde_json::Value,
) -> Result<LocalizerRelease, LocalizerError> {
    let tag = json["tag_name"].as_str().unwrap_or_default().to_string();
    if tag.is_empty() {
        return Err(LocalizerError::AssetUnavailable {
            message: "release metadata has no tag".to_string(),
        });
    }
    let assets = json["assets"].as_array().cloned().unwrap_or_default();
    let find = |predicate: &dyn Fn(&str) -> bool| {
        assets.iter().find_map(|asset| {
            let name = asset["name"].as_str()?.to_string();
            if !predicate(&name.to_lowercase()) {
                return None;
            }
            let download_url =
                asset["browser_download_url"].as_str()?.to_string();
            let size = asset["size"].as_u64().unwrap_or_default();
            let sha256 = asset["digest"]
                .as_str()
                .and_then(|digest| digest.strip_prefix("sha256:"))
                .map(str::to_string);
            Some((name, download_url, size, sha256))
        })
    };

    // Prefer the plain official x64 setup over the DevTools build.
    let nsis = find(&|name| {
        name.ends_with("x64-setup.exe") && !name.contains("devtools")
    })
    .or_else(|| find(&|name| name.ends_with("x64-setup.exe")))
    .map(|(name, url, size, sha256)| (name, url, size, sha256, "nsis", true));
    let chosen = nsis.or_else(|| {
        find(&|name| name.ends_with(".msi")).map(|(name, url, size, sha256)| {
            (name, url, size, sha256, "msi", false)
        })
    });

    let Some((asset_name, download_url, size, sha256, kind, supported)) =
        chosen
    else {
        return Err(LocalizerError::AssetUnavailable {
            message: "no x64 installer asset in the latest release".to_string(),
        });
    };
    Ok(LocalizerRelease {
        tag: tag.clone(),
        version: tag.trim_start_matches('v').to_string(),
        asset_name,
        download_url,
        size,
        sha256,
        kind: kind.to_string(),
        supported,
    })
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    phase: &'static str,
    downloaded: u64,
    total: u64,
}

fn validate_download(release: &LocalizerRelease) -> Result<(), LocalizerError> {
    if release.kind != "nsis" {
        return Err(LocalizerError::AssetUnavailable {
            message:
                "the latest release only provides an MSI; silent install is not supported"
                    .to_string(),
        });
    }
    if !release.download_url.starts_with(RELEASE_DOWNLOAD_PREFIX) {
        return Err(LocalizerError::DownloadFailed {
            message: "unexpected download host".to_string(),
        });
    }
    if release.size == 0 {
        return Err(LocalizerError::DownloadFailed {
            message: "release metadata has no size".to_string(),
        });
    }
    Ok(())
}

async fn download_installer<R: Runtime>(
    app: &tauri::AppHandle<R>,
    release: &LocalizerRelease,
    target: &Path,
) -> Result<(), LocalizerError> {
    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(network_failure)?;
    let response = client
        .get(&release.download_url)
        .send()
        .await
        .map_err(network_failure)?;
    let status = response.status();
    if status == reqwest::StatusCode::FORBIDDEN
        || status == reqwest::StatusCode::TOO_MANY_REQUESTS
    {
        return Err(LocalizerError::RateLimited {
            message: status.to_string(),
        });
    }
    if !status.is_success() {
        return Err(LocalizerError::DownloadFailed {
            message: format!("download returned {status}"),
        });
    }

    use futures::StreamExt;
    let mut file = tokio::fs::File::create(target).await.map_err(|error| {
        LocalizerError::DownloadFailed {
            message: error.to_string(),
        }
    })?;
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let total = release.size;
    let mut last_emit: u64 = 0;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|error| LocalizerError::DownloadFailed {
            message: error.to_string(),
        })?;
        file.write_all(&chunk).await.map_err(|error| {
            LocalizerError::DownloadFailed {
                message: error.to_string(),
            }
        })?;
        downloaded += chunk.len() as u64;
        if downloaded - last_emit > 65_536 || downloaded == total {
            last_emit = downloaded;
            let _ = app.emit(
                "localizer-download-progress",
                DownloadProgress {
                    phase: "downloading",
                    downloaded,
                    total,
                },
            );
        }
    }
    file.flush()
        .await
        .map_err(|error| LocalizerError::DownloadFailed {
            message: error.to_string(),
        })?;
    drop(file);

    if downloaded != release.size {
        let _ = tokio::fs::remove_file(target).await;
        return Err(LocalizerError::SizeMismatch {
            expected: release.size,
            actual: downloaded,
        });
    }
    if let Some(expected) = &release.sha256 {
        let bytes = tokio::fs::read(target).await.map_err(|error| {
            LocalizerError::DownloadFailed {
                message: error.to_string(),
            }
        })?;
        let actual = format!("{:x}", Sha256::digest(&bytes));
        if !actual.eq_ignore_ascii_case(expected) {
            let _ = tokio::fs::remove_file(target).await;
            return Err(LocalizerError::DigestMismatch {
                expected: expected.clone(),
                actual,
            });
        }
    }
    Ok(())
}

fn run_silent_installer(setup: &Path) -> Result<(), LocalizerError> {
    let mut command = Command::new(setup);
    command.arg("/S");
    if let Some(directory) = setup.parent() {
        command.current_dir(directory);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child =
        command
            .spawn()
            .map_err(|error| LocalizerError::InstallFailed {
                message: error.to_string(),
            })?;

    let deadline = std::time::Instant::now() + INSTALL_TIMEOUT;
    loop {
        match child.try_wait() {
            Ok(Some(exit_status)) if exit_status.success() => return Ok(()),
            Ok(Some(exit_status)) => {
                return Err(LocalizerError::InstallFailed {
                    message: format!("installer exited with {exit_status}"),
                });
            }
            Ok(None) => {
                if std::time::Instant::now() >= deadline {
                    let _ = child.kill();
                    return Err(LocalizerError::InstallTimeout {
                        seconds: INSTALL_TIMEOUT.as_secs(),
                    });
                }
                std::thread::sleep(Duration::from_millis(300));
            }
            Err(error) => {
                return Err(LocalizerError::InstallFailed {
                    message: error.to_string(),
                });
            }
        }
    }
}

/// Download the official installer, verify it, install it silently and return
/// the resolved tool status.
#[tauri::command]
pub async fn localizer_install<R: Runtime>(
    app: tauri::AppHandle<R>,
    release: LocalizerRelease,
) -> Result<LocalizerStatus, LocalizerError> {
    validate_download(&release)?;
    let target = std::env::temp_dir().join("mcl-localizer-setup.exe");
    let _ = tokio::fs::remove_file(&target).await;

    download_installer(&app, &release, &target).await?;

    let _ = app.emit(
        "localizer-download-progress",
        DownloadProgress {
            phase: "installing",
            downloaded: release.size,
            total: release.size,
        },
    );
    let setup = target.clone();
    let install_result =
        tokio::task::spawn_blocking(move || run_silent_installer(&setup))
            .await
            .map_err(|error| LocalizerError::InstallFailed {
                message: error.to_string(),
            })?;
    let _ = tokio::fs::remove_file(&target).await;
    install_result?;

    match resolve().await {
        Some((path, source)) => {
            tracing::info!(
                path = %path.display(),
                source = ?source,
                version = release.version,
                "Installed the external MC Content Localizer"
            );
            Ok(status_from(path, source))
        }
        None => Err(LocalizerError::NotFoundAfterInstall {
            message: format!(
                "installed {} but no executable was found in the usual locations",
                release.tag
            ),
        }),
    }
}
