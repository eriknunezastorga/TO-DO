use serde::{Deserialize, Serialize};
use serde_json::Value;

// =========================================================
// DATA MODEL
// =========================================================

/// Transparent AppState — uses generic JSON values so the Rust layer
/// is a dumb pass-through for all task/project/note fields.
#[derive(Debug, Serialize, Deserialize, Default)]
struct AppState {
    #[serde(default)]
    tasks: Vec<Value>,
    #[serde(default)]
    projects: Vec<Value>,
    #[serde(default)]
    notes: Vec<Value>,
}

// =========================================================
// HELPERS
// =========================================================

fn data_path() -> std::path::PathBuf {
    let base = std::env::var("APPDATA")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default());
    let dir = base.join("Simpel");
    std::fs::create_dir_all(&dir).ok();
    dir.join("data.json")
}

async fn ollama_running() -> bool {
    reqwest::get("http://localhost:11434")
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

// =========================================================
// TAURI COMMANDS
// =========================================================

/// Read %APPDATA%\Simpel\data.json → AppState
#[tauri::command]
fn load() -> AppState {
    let path = data_path();
    if path.exists() {
        if let Ok(text) = std::fs::read_to_string(&path) {
            if let Ok(data) = serde_json::from_str::<AppState>(&text) {
                return data;
            }
        }
    }
    AppState::default()
}

/// Write AppState → %APPDATA%\Simpel\data.json
#[tauri::command]
fn save(data: AppState) -> bool {
    let path = data_path();
    match serde_json::to_string_pretty(&data) {
        Ok(json) => std::fs::write(path, json.as_bytes()).is_ok(),
        Err(_) => false,
    }
}

/// Return the absolute path to data.json as a string
#[tauri::command]
fn get_data_path() -> String {
    data_path().to_string_lossy().into_owned()
}

/// Show a Windows toast notification
#[tauri::command]
fn notify(app: tauri::AppHandle, title: String, message: String) {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(title)
        .body(message)
        .show()
        .ok();
}

/// Open a Save dialog and write the data as JSON to the chosen path
#[tauri::command]
async fn export_dialog(app: tauri::AppHandle, data: AppState) -> Value {
    use tauri_plugin_dialog::{DialogExt, FilePath};
    let path = app
        .dialog()
        .file()
        .set_title("Exportera Simpel-data")
        .set_file_name("Simpel_export.json")
        .add_filter("JSON-fil", &["json"])
        .blocking_save_file();

    match path {
        Some(FilePath::Path(p)) => match serde_json::to_string_pretty(&data) {
            Ok(json) => {
                if std::fs::write(&p, json.as_bytes()).is_ok() {
                    serde_json::json!({ "ok": true, "path": p.to_string_lossy() })
                } else {
                    serde_json::json!({ "ok": false, "error": "Kunde inte skriva fil" })
                }
            }
            Err(e) => serde_json::json!({ "ok": false, "error": e.to_string() }),
        },
        _ => serde_json::json!({ "ok": false }),
    }
}

/// Open a file picker dialog and read the chosen JSON file
#[tauri::command]
async fn import_dialog(app: tauri::AppHandle) -> Value {
    use tauri_plugin_dialog::{DialogExt, FilePath};
    let path = app
        .dialog()
        .file()
        .set_title("Importera Simpel-data")
        .add_filter("JSON-fil", &["json"])
        .blocking_pick_file();

    match path {
        Some(FilePath::Path(p)) => match std::fs::read_to_string(&p) {
            Ok(text) => match serde_json::from_str::<AppState>(&text) {
                Ok(data) => serde_json::json!({ "ok": true, "data": data }),
                Err(e) => serde_json::json!({ "ok": false, "error": e.to_string() }),
            },
            Err(e) => serde_json::json!({ "ok": false, "error": e.to_string() }),
        },
        _ => serde_json::json!({ "ok": false }),
    }
}

/// Check if Ollama is running; if not, try to start it.
/// Returns true if Ollama is reachable after the attempt.
#[tauri::command]
async fn ensure_ollama(app: tauri::AppHandle) -> bool {
    use tauri_plugin_shell::ShellExt;
    if ollama_running().await {
        return true;
    }
    // Try to spawn `ollama serve`
    app.shell()
        .command("ollama")
        .args(["serve"])
        .spawn()
        .ok();
    // Wait 2 seconds then re-check
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    ollama_running().await
}

// =========================================================
// APP ENTRY POINT
// =========================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Auto-start Ollama in background at launch
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::ShellExt;
                if !ollama_running().await {
                    handle
                        .shell()
                        .command("ollama")
                        .args(["serve"])
                        .spawn()
                        .ok();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load,
            save,
            get_data_path,
            notify,
            export_dialog,
            import_dialog,
            ensure_ollama,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
